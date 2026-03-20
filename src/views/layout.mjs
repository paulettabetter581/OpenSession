import { escapeHtml } from "../markdown.mjs";
import { t, getLocale } from "../i18n.mjs";

export function layout(title, body, page = "home", { provider = null, providers = [] } = {}) {
  const tabBar = providers.length > 1 ? `
    <div class="provider-tabs">
      ${providers.map((p) => `
        <a href="/${p.id}" class="provider-tab ${p.id === provider ? "active" : ""}" data-provider="${p.id}">
          <span class="provider-icon">${p.icon}</span>
          <span class="provider-name">${p.name}</span>
        </a>
      `).join("")}
    </div>
  ` : "";

  // Update nav hrefs to be provider-scoped
  const providerPrefix = provider ? `/${provider}` : "";

  return `<!DOCTYPE html>
<html lang="${getLocale() === 'zh' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — OpenSession</title>
  <script>document.documentElement.dataset.theme=localStorage.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')</script>
  <link rel="stylesheet" href="/static/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css">
</head>
<body data-page="${page}" data-provider="${provider || ""}">
  <nav class="topbar">
    <a href="${providerPrefix || "/"}" class="logo"><span style="color:var(--success-color)">~</span>/OpenSession</a>
    <a href="${providerPrefix}/stats" class="nav-link">$ ${t("nav.stats")}</a>
    ${provider === "opencode" ? `<a href="${providerPrefix}/trash" class="nav-link">$ ${t("nav.trash")}</a>` : ""}
    <form class="search-form" action="${providerPrefix}/search" method="GET">
      <input type="text" name="q" placeholder="${t("nav.search_placeholder")}" class="search-input" id="search-input">
    </form>
    <button id="theme-toggle" class="theme-toggle" title="Toggle theme">🌙</button>
  </nav>
  ${tabBar}
  <main class="content">
    ${body}
  </main>
  <div id="toast-container"></div>
  <script src="/static/app.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
</body>
</html>`;
}
