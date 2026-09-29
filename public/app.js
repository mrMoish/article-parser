* {
  box-sizing: border-box;
}

:root {
  --bg-1: #0f172a;
  --bg-2: #111827;
  --panel: rgba(15, 23, 42, 0.72);
  --panel-border: rgba(148, 163, 184, 0.2);
  --text: #e5e7eb;
  --muted: #94a3b8;
  --primary: #60a5fa;
  --primary-hover: #3b82f6;
  --danger: #f87171;
  --success: #34d399;
  --shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
}

html, body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, "Segoe UI", sans-serif;
  background: radial-gradient(circle at top, #1e293b 0%, var(--bg-1) 30%, var(--bg-2) 100%);
  color: var(--text);
}

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.page-shell {
  width: min(100%, 980px);
}

.panel {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 32px 28px;
  backdrop-filter: blur(10px);
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.badge {
  display: inline-flex;
  align-self: flex-start;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.12);
  color: #bfdbfe;
  padding: 6px 10px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.1;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.label {
  color: var(--muted);
  font-size: 0.95rem;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

input {
  flex: 1;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.7);
  color: var(--text);
  font-size: 1rem;
  padding: 16px 18px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  border-color: rgba(96, 165, 250, 0.9);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.15);
}

button {
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
  font-size: 1rem;
  font-weight: 600;
  padding: 16px 22px;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

.status {
  min-height: 24px;
  margin-top: 18px;
  color: var(--muted);
  font-size: 0.95rem;
}

.status.error {
  color: #fecaca;
}

.status.success {
  color: #bbf7d0;
}

.result {
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.hidden {
  display: none;
}

#article-title {
  margin: 0 0 20px;
  font-size: clamp(1.5rem, 4vw, 2.3rem);
}

.article-body {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #e2e8f0;
  font-size: 1.02rem;
  max-height: 60vh;
  overflow: auto;
  padding-right: 8px;
}

@media (max-width: 640px) {
  .panel {
    padding: 22px 18px;
  }

  .input-row {
    flex-direction: column;
  }

  input,
  button {
    width: 100%;
  }
}
