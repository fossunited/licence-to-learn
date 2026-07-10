/* Live "total reported spend" counter. Starts at the reported total (base) and
   climbs: value = base + rate * secondsSince(anchor), Indian-grouped, digits
   roll. Anchor is page load in "session" mode (default, resets on reload) or
   build time (data-epoch) in "progressive" mode (keeps climbing across visits
   until the next rebuild) - see COUNTER_MODE below. Redraw cadence cycles
   through data-intervals (seconds) so the tick feels alive.
   prefers-reduced-motion -> static total, no motion.
   Also wires the stats popovers: one for the total (.counter__info) and one per
   spend card (.card-info, showing yearly stats + software-tools count). */
(() => {
  "use strict";
  // "session" (default): anchors to page load, starts at the reported total
  //   and climbs for this visit only, resets on reload.
  // "progressive": anchors to build time (data-epoch), keeps climbing across
  //   visits/days, only resets on the next site rebuild.
  const COUNTER_MODE = "progressive"; // "session" | "progressive"
  const fmt = new Intl.NumberFormat("en-IN");
  const money = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Missing / NaN / empty cells count as 0.
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  // Compact suffix shown in brackets beside a full ₹ number: "2.3 Cr" / "1.5 L".
  const shortINR = (n) => {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.?0+$/, "")}k`;
    return "";
  };
  const withShort = (v) => { const s = shortINR(v); return s ? `${money.format(v)} (${s})` : money.format(v); };
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

  const digit = () => {
    const wrap = document.createElement("span");
    wrap.className = "odo-digit";
    const stack = document.createElement("span");
    stack.className = "odo-stack";
    for (let d = 0; d < 10; d++) {
      const s = document.createElement("span");
      s.textContent = d;
      stack.append(s);
    }
    wrap.append(stack);
    return wrap;
  };

  // --- Live total counter ---
  document.querySelectorAll(".counter").forEach((c) => {
    const out = c.querySelector("[data-odo]");
    if (!out) return;
    const base = num(c.dataset.base);
    const rate = num(c.dataset.rate);
    const epoch = num(c.dataset.epoch);
    const progressive = COUNTER_MODE === "progressive" && epoch > 0;

    let len = 0;
    let slots = []; // per char: {stack} for digits, null for separators
    const rebuild = (str) => {
      out.textContent = "";
      slots = [...str].map((ch) => {
        if (ch < "0" || ch > "9") {
          const sep = document.createElement("span");
          sep.className = "odo-sep";
          sep.textContent = ch;
          out.append(sep);
          return null;
        }
        const d = digit();
        out.append(d);
        return d.firstChild; // the .odo-stack
      });
      len = str.length;
    };
    const shortEl = c.querySelector(".counter__short");
    const render = (val) => {
      const n = Math.floor(val);
      const str = fmt.format(n);
      if (str.length !== len) rebuild(str);
      [...str].forEach((ch, i) => {
        const stack = slots[i];
        if (stack && ch >= "0" && ch <= "9") stack.style.translate = `0 ${-ch}em`;
      });
      if (shortEl) { const s = shortINR(n); shortEl.textContent = s ? `(${s})` : ""; }
    };

    // Value is derived from Date.now(), never an accumulator, so redraw
    // cadence never causes drift.
    const t0 = Date.now();
    const value = () => progressive
      ? base + rate * (Date.now() / 1000 - epoch)
      : base + rate * ((Date.now() - t0) / 1000);

    if (reduce || !rate) {
      render(value());
      return;
    }

    // Redraw cadence: cycle through data-intervals seconds (fallback single).
    const seq = (c.dataset.intervals || "")
      .split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
    const single = Number(c.dataset.interval) || 1000;
    let i = 0;
    const tick = () => {
      render(value());
      const ms = seq.length ? seq[i++ % seq.length] * 1000 : single;
      setTimeout(tick, ms);
    };
    tick();
  });

  // --- Total stats popover (from data-totals / data-names) ---
  document.querySelectorAll(".counter").forEach((c) => {
    const btn = c.querySelector(".counter__info");
    const pop = c.querySelector(".counter__stats");
    if (!btn || !pop) return;
    const totals = (c.dataset.totals || "").split(",").map(num);
    const names = (c.dataset.names || "").split(",");
    if (!totals.length || !c.dataset.totals) return;

    const sorted = [...totals].sort((a, b) => a - b);
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

  // --- Per-card stats popover (yearly stats + software-tools count) ---
  const YEARS = ["2020-21", "2021-22", "2022-23", "2023-24", "2024-25"];
  document.querySelectorAll(".spend-card").forEach((card) => {
    const btn = card.querySelector(".card-info");
    const pop = card.querySelector(".spend-card__stats");
    const lc = card.querySelector(".linechart");
    if (!btn || !pop || !lc) return;
    const vals = (lc.dataset.values || "").split(",").map(num);
    if (!vals.length) return;
    const totalEl = card.querySelector("[data-inr]");
    const total = num(totalEl && totalEl.dataset.inr);
    const tools = num(btn.dataset.tools);

    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const maxV = Math.max(...vals), minV = Math.min(...vals);
    const maxYr = YEARS[vals.indexOf(maxV)] || "";
    const minYr = YEARS[vals.indexOf(minV)] || "";
    const reported = vals.filter((v) => v > 0).length;

    pop.innerHTML = `<dl>
      ${row("5-year total", withShort(total))}
      ${row("Mean per year", withShort(Math.round(mean)))}
      ${row("Highest year", `${maxYr} (${amt(maxV)})`)}
      ${row("Lowest year", `${minYr} (${amt(minV)})`)}
      ${row("Years with data", `${reported} of ${n}`)}
      ${row("Software tools listed", tools)}
    </dl>`;
    wirePopover(card, btn, pop);
  });

  // --- Generic inline "?" info tips (info_tip shortcode) ---
  document.querySelectorAll(".info-tip").forEach((tip) => {
    const btn = tip.querySelector(".info-tip__btn");
    const pop = tip.querySelector(".info-tip__panel");
    if (!btn || !pop) return;
    // If for_id points at a [data-base] element (e.g. the spend counter),
    // append the real reported total so readers see what the live number
    // is extrapolated from.
    const target = tip.dataset.for && document.getElementById(tip.dataset.for);
    if (target && target.dataset.base) {
      const actual = document.createElement("span");
      actual.className = "info-tip__actual";
      actual.textContent = `Actual reported total so far: ${withShort(num(target.dataset.base))}.`;
      pop.append(actual);
    }
    wirePopover(tip, btn, pop);
  });
})();
