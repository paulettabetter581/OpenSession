import { escapeHtml } from "../markdown.mjs";
import { layout } from "./layout.mjs";
import { pagination, sessionCard } from "./components.mjs";
import { t } from "../i18n.mjs";

export function renderSessionsPage({ sessions = [], total = 0, limit = 30, offset = 0, query = "", note = "", range = "" } = {}) {
  const cards = sessions.length
    ? sessions.map((session) => sessionCard(session, false, { showCheckbox: true })).join("\n")
    : query
      ? `<p class="empty-state">${t("sessions.empty_search").replace("{query}", escapeHtml(query))}</p>`
      : `<p class="empty-state">${t("sessions.empty")}</p>`;

  const searchNote = note ? `<p class="search-note">${escapeHtml(note)}</p>` : "";
  
  // Time range filter buttons
  const ranges = [
    { key: "", label: t("range.all") },
    { key: "today", label: t("range.today") },
    { key: "week", label: t("range.week") },
    { key: "month", label: t("range.month") }
  ];
  const rangeParam = range || "";
  const rangeButtons = ranges.map(r => {
    const active = r.key === rangeParam ? " active" : "";
    const href = r.key ? `/?range=${r.key}` : "/";
    return `<a href="${href}" class="range-btn${active}">${r.label}</a>`;
  }).join("");
  const filterBar = `<div class="range-filter">${rangeButtons}</div>`;
  
  const pagerBase = query ? `/search?q=${encodeURIComponent(query)}` : (rangeParam ? `/?range=${rangeParam}` : "/");
  const body = `
    <section class="page-header">
      <div class="page-header-row">
        <div>
          <h1>${query ? t("sessions.search_title").replace("{query}", escapeHtml(query)) : t("sessions.title")}</h1>
          <p>${t("sessions.count").replace("{count}", total)}</p>
        </div>
        ${!query ? `<button class="btn btn-manage" id="toggle-batch">${t("sessions.manage")}</button>` : ""}
      </div>
      ${searchNote}
      ${!query ? filterBar : ""}
    </section>
    <div class="batch-bar hidden" id="batch-bar">
      <label class="batch-select-all">
        <input type="checkbox" id="select-all"> ${t("batch.select_all")}
      </label>
      <span class="batch-count">${t("batch.selected").replace("<strong>{count}</strong>", '<strong id="batch-count-num">0</strong>')}</span>
      <button class="btn batch-action" data-action="star">${t("batch.star")}</button>
      <button class="btn batch-action" data-action="unstar">${t("batch.unstar")}</button>
      <button class="btn batch-action btn-danger" data-action="delete">${t("batch.delete")}</button>
      <button class="btn batch-action" id="batch-cancel">${t("batch.cancel")}</button>
    </div>
    <section class="session-list" id="session-list">
      ${cards}
    </section>
    ${pagination(total, limit, offset, pagerBase)}
  `;

  return layout(query ? t("sessions.search_title").replace("{query}", query) : t("sessions.title"), body);
}
