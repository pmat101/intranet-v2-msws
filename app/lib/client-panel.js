// The read-only client panel on both BD02 forms.
//
// Shows what the registers already hold about the project's client, so BD
// reviews it rather than retyping it. Nothing here is editable: the client's
// name and contact are corrected on their own records, not on a BD02 form.

import { api } from "/lib/api.js";

const esc = (s) =>
  String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Loads the client context for a P-Code, or null if there is none yet. */
export async function loadClient(pcode) {
  const code = String(pcode || "").trim();
  if (!code) return null;
  try {
    return await api.get("pipeline/client?pcode=" + encodeURIComponent(code));
  } catch {
    return null;
  }
}

const ROWS = [
  ["Company", "companyName"],
  ["Contact person", "contactName"],
  ["Contact email", "contactEmail"],
  ["Contact phone", "contactPhone"],
  ["Proposal ID", "proposalId"],
  ["Project", "projectName"],
  ["Location", "location"],
  ["Perfact entity", "pgEntity"],
];

const STYLE = `
  .client-panel dl { display: grid; grid-template-columns: max-content 1fr;
    gap: 7px 20px; margin: 0; font-size: 0.9rem; }
  .client-panel dt { color: var(--ink-soft); }
  .client-panel dd { margin: 0; color: var(--ink); overflow-wrap: anywhere; }
  .client-panel .hint { font-size: 0.84rem; color: var(--ink-soft); margin: 0; }
  @media (max-width: 560px) {
    .client-panel dl { grid-template-columns: 1fr; gap: 1px 0; }
    .client-panel dd { margin-bottom: 9px; }
  }`;

/** Adds the panel's styles once, so a form needs only the import and the markup. */
function ensureStyles() {
  if (document.getElementById("client-panel-styles")) return;
  const tag = document.createElement("style");
  tag.id = "client-panel-styles";
  tag.textContent = STYLE;
  document.head.appendChild(tag);
}

export function renderClient(el, ctx, pcode) {
  if (!el) return;
  ensureStyles();
  if (!String(pcode || "").trim()) {
    el.innerHTML =
      '<p class="hint">Enter the P-Code and the client details will appear here.</p>';
    return;
  }
  if (!ctx) {
    el.innerHTML = `<p class="hint">No project found for ${esc(pcode)}, or its details could not be loaded.</p>`;
    return;
  }
  el.innerHTML =
    "<dl>" +
    ROWS.map(
      ([label, key]) =>
        `<dt>${esc(label)}</dt><dd>${ctx[key] ? esc(ctx[key]) : '<span class="hint">Not recorded</span>'}</dd>`,
    ).join("") +
    "</dl>";
}
