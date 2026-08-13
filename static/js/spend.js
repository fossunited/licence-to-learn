/* Static "total reported spend" figure, Indian-grouped with a compact
   short suffix. Also wires the total stats popover (.counter__info) —
   per-card yearly stats now live on each institute's own /data/<slug>/
   page instead of a hover popover. */
(() => {
  "use strict";
  const { num, group, short: shortINR, withShort } = window.ltl;
  const amt = (v) => (v === 0 ? "data not provided or collected" : withShort(v));
  const row = (k, v) => `<div class="stat"><dt>${k}</dt><dd>${v}</dd></div>`;

  // Shared popover behaviour: hover/focus/click open, Esc + outside-click close.
  const wirePopover = (container, btn, pop) => {
    const open = (v) => { pop.hidden = !v; btn.setAttribute("aria-expanded", String(v)); };
    btn.addEventListener("click", () => open(pop.hidden));
    btn.addEventListener("pointerenter", () => open(true));
    btn.addEventListener("focus", () => open(true));
    container.addEventListener("pointerleave", () => open(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
    document.addEventListener("click", (e) => { if (!container.contains(e.target)) open(false); });
  };

  // --- Total figure (static): Indian-grouped + compact short suffix ---
  document.querySelectorAll(".counter").forEach((c) => {
    const out = c.querySelector("[data-odo]");
    if (!out) return;
    const base = num(c.dataset.base);
    out.textContent = group(base);
    const shortEl = c.querySelector(".counter__short");
    if (shortEl) { const s = shortINR(base); shortEl.textContent = s ? `(${s})` : ""; }
  });

  // --- Total stats popover (from data-totals / data-names) ---
  document.querySelectorAll(".counter").forEach((c) => {
    const btn = c.querySelector(".counter__info");
    const pop = c.querySelector(".counter__stats");
    if (!btn || !pop) return;
    const totals = (c.dataset.totals || "").split(",").map(num);
    const names = (c.dataset.names || "").split(",");
    if (!totals.length || !c.dataset.totals) return;

    const sorted = [...totals].filter(v => v > 0).sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    const maxV = sorted[n - 1], minV = sorted[0];
    const maxName = names[totals.indexOf(maxV)] || "";
    const minName = names[totals.indexOf(minV)] || "";

    pop.innerHTML = `<dl>
      ${row("Responding institutes", n)}
      ${row("Mean per institute", withShort(Math.round(mean)))}
      ${row("Median per institute", withShort(Math.round(median)))}
      ${row("Highest", `${maxName} (${amt(maxV)})`)}
      ${row("Lowest", `${minName} (${amt(minV)})`)}
      ${row("Mean annual per institute", withShort(Math.round(mean / 5)))}
    </dl>`;
    wirePopover(c, btn, pop);
  });

  // --- Generic inline "?" info tips (info_tip shortcode) ---
  document.querySelectorAll(".info-tip").forEach((tip) => {
    const btn = tip.querySelector(".info-tip__btn");
    const pop = tip.querySelector(".info-tip__panel");
    if (btn && pop) wirePopover(tip, btn, pop);
  });

  // --- Spend-card RTI-response tickmark: hover/focus reveals Helpful /
  // Partially helpful / Not helpful, the same wording ui::rating_pill shows
  // as text elsewhere, instead of relying on the plain browser title tooltip.
  document.querySelectorAll(".spend-card__status").forEach((status) => {
    const btn = status.querySelector(".spend-card__status-btn");
    const pop = status.querySelector(".spend-card__status-panel");
    if (btn && pop) wirePopover(status, btn, pop);
  });
})();
