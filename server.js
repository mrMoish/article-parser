const express = require("express");
const path = require("path");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function normalizeUrl(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])\s*([A-Za-zА-Яа-я])/g, "$1 $2")
    .trim();
}

function selectArticleRoot($) {
  // Специфичные селекторы для популярных сайтов
  const habrSelectors = [
    "article.tm-article",
    ".article-wrapper",
    ".tm-article-body",
    ".tm-article-snippet"
  ];

  for (const selector of habrSelectors) {
    const candidate = $(selector).first();
    if (candidate && candidate.length && candidate.text().length > 100) {
      return candidate;
    }
  }

  // Общие селекторы
  const selectors = [
    "article",
    "main",
    "[role='main']",
    ".article",
    ".post-content",
    ".entry-content",
    ".content",
    ".article-body",
    ".article-text",
    ".story-body",
    ".news-content",
    "[data-article]",
    ".tm-article-presenter",
    "#content",
    "#main-content",
    ".main-article"
  ];

  for (const selector of selectors) {
    const candidate = $(selector).first();
    if (candidate && candidate.length) {
      const text = candidate.text();
      if (text.length > 100) {
        return candidate;
      }
    }
  }

  // Fallback на body если ничего не нашли
  const possible = [
    "body",
    "html"
  ];

  for (const selector of possible) {
    const candidate = $(selector).first();
    if (candidate && candidate.length) {
      return candidate;
    }
  }

  return null;
}

function calculateNodeScore(node, $) {
  const text = cleanText($(node).text());
  const textLength = text.length;
  
  // Узлы с большим текстом получают более высокий score
  let score = textLength;
  
  // Бонус за параграфы
  if (node.name === 'p') score += 500;
  if (node.name === 'h2' || node.name === 'h3') score += 200;
  
  // Штраф за навигацию и рекламу
  const classList = ($(node).attr('class') || '').toLowerCase();
  if (classList.includes('nav') || classList.includes('menu')) score -= 10000;
  if (classList.includes('ad') || classList.includes('banner')) score -= 10000;
  if (classList.includes('sidebar') || classList.includes('comment')) score -= 5000;
  
  return score;
}

function extractArticleText($, root) {
  const blocks = [];
  
  // Ищем все параграфы, списки, заголовки
  const candidateNodes = root.find("p, li, h2, h3, h4, h5, h6, blockquote, .tm-article-snippet__content");

  candidateNodes.each((_, element) => {
    const text = cleanText($(element).text());
    if (!text) return;

    const length = text.length;
    
    // Фильтр по минимальной длине
    if (length < 15) return;
    
    // Фильтр по навигационному тексту
    const likelyNav = /^(читайте также|похожие статьи|подписаться|комментарии|загрузка|cookie|login|signup|меню|поиск|share|рекомендуем|обсудить)$/i.test(text);
    if (likelyNav) return;

    // Избегаем дубликатов
    const isDuplicate = blocks.some(b => b.toLowerCase() === text.toLowerCase());
    if (isDuplicate) return;

    blocks.push(text);
  });

  // Объединяем блоки с разделением на параграфы
  const uniqueText = blocks
    .filter((value) => value.length > 20)
    .join("\n\n");

  if (uniqueText && uniqueText.length > 100) return uniqueText;

  // Fallback: попробуем просто весь текст из корневого элемента
  const fallback = cleanText(root.text());
  
  // Очищаем от типичного шума
  const cleaned = fallback
    .replace(/\s{2,}/g, "\n")
    .split("\n")
    .filter(line => line.length > 20 && !/(cookie|меню|навигация|cookie|подписка|комментарий)/i.test(line))
    .join("\n");

  return cleaned.length > 150 ? cleaned : "";
}

app.get("/api/parse", async (req, res) => {
  const url = normalizeUrl(req.query.url);

  if (!url) {
    return res.json({
      ok: false,
      message: "Введите корректный URL сайта."
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9",
        "Cache-Control": "no-cache"
      },
      redirect: "follow",
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Сайт ответил со статусом ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Получаем заголовок
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $('h1').first().text().trim() ||
      $("title").first().text().trim() ||
      "Статья";

    // Выбираем корневой элемент статьи
    const root = selectArticleRoot($);
    
    if (!root) {
      return res.json({
        ok: false,
        message: "Парсинг не получился. Не удалось найти основную статью на странице.",
        title: title.substring(0, 100),
        sourceUrl: url
      });
    }

    // Извлекаем текст
    const articleText = extractArticleText($, root);

    if (!articleText || articleText.length < 80) {
      return res.json({
        ok: false,
        message: "Парсинг не получился. Страница не содержит читаемого текста статьи.",
        title: title.substring(0, 100),
        sourceUrl: url
      });
    }

    return res.json({
      ok: true,
      title: title.substring(0, 250),
      text: articleText,
      sourceUrl: url
    });
  } catch (error) {
    console.error("Parse error:", error.message);
    return res.json({
      ok: false,
      message: "Парсинг не получился. Возможно, сайт блокирует загрузку или не поддерживает обычный HTML-доступ.",
      sourceUrl: url,
      error: error.message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Article parser running on http://localhost:${PORT}`);
});
