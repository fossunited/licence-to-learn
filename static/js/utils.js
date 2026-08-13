/* Helpers shared by the other js/ files for ₹ formatting.
   Exposed on window.ltl. It relies on document order (utils.js first) for load
   order. Static figures rendered at build time don't need this file */
(() => {
  "use strict";

  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const plain = new Intl.NumberFormat("en-IN");

  // Compact suffix shown in brackets beside a full ₹ number: "2.3 Cr" / "1.5 L".
  const short = (n) => {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.?0+$/, "")}k`;
    return "";
  };

  window.ltl = {
    // Missing / NaN / empty values count as 0.
    num: (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; },
    // Indian-grouped rupees: "₹2,30,00,000".
    inr: (n) => money.format(n),
    // Indian grouping without the currency glyph: "2,30,00,000".
    group: (n) => plain.format(n),
    short,
    // Full figure with its compact suffix: "₹2,30,00,000 (2.3 Cr)".
    withShort: (n) => { const s = short(n); return s ? `${money.format(n)} (${s})` : money.format(n); },
  };
})();
