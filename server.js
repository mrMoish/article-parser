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
  const selectors = [
    "article",
    "main",
    "[role='main']",
    ".article",
    ".post-content",
    ".entry-content",
    ".content",
    ".article-body",
    ".story-body",
    ".news-content",
    "#content",
    "#main-content",
    ".main-article"
  ];

  for (const selector of selectors) {
    const candidate = $(selector).first();
    if (candidate && candidate.length) {
      return candidate;
    }
  }

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

function extractArticleText($, root) {
  const blocks = [];
  const candidateNodes = root.find("p, li, h1, h2, h3, h4, h5, h6, blockquote");

  candidateNodes.each((_, element) => {
    const text = cleanText($(element).text());
    if (!text) return;

    const length = text.length;
    const tooShort = length < 20;
    const likelyNav = /^(subscribe|cookie|login|signup|menu|search|share|related|comments|read more)$/i.test(text);

    if (!tooShort && !likelyNav) {
      blocks.push(text);
    }
  });

  const uniqueText = [...new Set(blocks)]
    .filter((value) => value.length > 30)
    .join("\n\n");

  if (uniqueText) return uniqueText;

  const fallback = cleanText(root.text());
  return fallback.length > 80 ? fallback : "";
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
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(`Сайт ответил со статусом ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").first().text().trim() ||
      "Статья";

    const root = selectArticleRoot($);
    if (!root) {
      return res.json({
        ok: false,
        message: "Парсинг не получился. Не удалось найти основную статью на странице.",
        title,
        sourceUrl: url
      });
    }

    const articleText = extractArticleText($, root);

    if (!articleText || articleText.length < 80) {
      return res.json({
        ok: false,
        message: "Парсинг не получился. Страница не содержит читаемого текста статьи.",
        title,
        sourceUrl: url
      });
    }

    return res.json({
      ok: true,
      title,
      text: articleText,
      sourceUrl: url
    });
  } catch (error) {
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
