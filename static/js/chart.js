/* Tiny dependency-free line chart. Enhances every .linechart element:
   builds an inline SVG (accent line + area gradient + nodes, X=year, Y=amount)
   from data-values (comma numbers) and data-labels (comma years). Hover/focus a
   node for a themed pill with the value in lakh/crore. Text fallback without JS. */
(() => {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";

  const fmtFull = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  // long form for the tooltip: "2.57 crore INR" / "77 lakh INR" / "₹4,200"
  const words = (n) => {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore INR`;
    if (n >= 1e5) return `${Math.round(n / 1e5)} lakh INR`;
    return fmtFull.format(n);
  };
  // Missing / NaN / empty cells are treated as 0; a 0 reads as no data, not ₹0.
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const valLabel = (v) => (v === 0 ? "data not provided or collected" : words(v));
  // Compact suffix shown in brackets beside a full ₹ number: "2.3 Cr" / "1.5 L".
  const shortINR = (n) => {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.?0+$/, "")}k`;
    return "";
  };
  // short form for the Y axis: "2.6cr" / "77L" / "4200"
  const axisShort = (n) => {
    if (n >= 1e7) return `${(n / 1e7).toFixed(1)}cr`;
    if (n >= 1e5) return `${Math.round(n / 1e5)}L`;
    if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
    return `${n}`;
  };
  const el = (name, attrs, text) => {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };
  // n+1 evenly spaced tick values from lo to hi (for Y-axis gridlines/labels).
  const ticks = (lo, hi, n) => Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);

  // Abbreviate institute names: uppercase initials where unique; collided
  // groups extended equally with lowercase letters of the last word until
  // unique. Deterministic, independent of input order.
  const abbrevMap = (names) => {
    const init = names.map((s) => (s.match(/[A-Z]/g) || []).join(""));
    const tail = names.map((s) => s.trim().split(/\s+/).pop().slice(1));
    const groups = {};
    names.forEach((_, i) => (groups[init[i]] ||= []).push(i));
    const out = [];
    for (const key in groups) {
      const idxs = groups[key];
      if (idxs.length === 1) { out[idxs[0]] = key; continue; }
      let k = 1;
      for (;;) {
        const cand = idxs.map((i) => key + tail[i].slice(0, k));
        if (new Set(cand).size === cand.length || k > 20) {
          idxs.forEach((i, j) => (out[i] = cand[j]));
          break;
        }
        k++;
      }
    }
    return out;
  };

  const draw = (box, domainMax) => {
    const values = (box.dataset.values || "").split(",").map(num);
    const labels = (box.dataset.labels || "").split(",");
    if (values.filter((v) => v > 0).length < 2) return; // not enough to plot

    const W = 320, H = 190, padL = 44, padR = 12, padT = 14, padB = 26;
    const max = domainMax != null ? domainMax : Math.max(...values);
    const min = domainMax != null ? 0 : Math.min(...values);
    const range = max - min || 1;
    const stepX = (W - padL - padR) / (values.length - 1);
    const x = (i) => padL + i * stepX;
    const y = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);

    const uid = `lc${values.length}_${Math.round(max)}`;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "linechart__svg", role: "img" });
    svg.setAttribute("aria-label", box.getAttribute("aria-label") || "spending by year");

    const defs = el("defs", {});
    const grad = el("linearGradient", { id: uid, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(el("stop", { offset: "0%", "stop-color": "var(--accent)", "stop-opacity": "0.28" }));
    grad.append(el("stop", { offset: "100%", "stop-color": "var(--accent)", "stop-opacity": "0" }));
    defs.append(grad);
    svg.append(defs);

    // Y axis: evenly spaced gridlines + labels across the domain
    ticks(min, max, 4).forEach((v) => {
      const yy = y(v);
      svg.append(el("line", { x1: padL, y1: yy.toFixed(1), x2: W - padR, y2: yy.toFixed(1), class: "lc-grid" }));
      svg.append(el("text", { x: padL - 6, y: (yy + 3).toFixed(1), class: "lc-ylabel", "text-anchor": "end" }, axisShort(v)));
    });

    // X axis: year labels under each point
    labels.forEach((lab, i) => {
      svg.append(el("text", { x: x(i).toFixed(1), y: H - padB + 14, class: "lc-xlabel", "text-anchor": "middle" }, lab));
    });

    // area + line
    const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    svg.append(el("path", { d: `${line} L${x(values.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`, fill: `url(#${uid})`, stroke: "none" }));
    svg.append(el("path", { d: line, fill: "none", stroke: "var(--accent)", "stroke-width": "2", "stroke-linejoin": "round", "stroke-linecap": "round" }));

    const tip = document.createElement("div");
    tip.className = "linechart__tip";
    tip.hidden = true;

    // nodes
    values.forEach((v, i) => {
      const node = el("circle", { cx: x(i).toFixed(1), cy: y(v).toFixed(1), r: "4", class: "linechart__node", tabindex: "0", role: "button" });
      const label = `${labels[i] ? labels[i] + ": " : ""}${valLabel(v)}`;
      node.setAttribute("aria-label", label);
      const show = () => {
        tip.textContent = label;
        tip.hidden = false;
        tip.style.insetInlineStart = `${(x(i) / W) * 100}%`;
        tip.style.insetBlockStart = `${(y(v) / H) * 100}%`;
        node.classList.add("is-active");
      };
      const hide = () => {
        tip.hidden = true;
        node.classList.remove("is-active");
      };
      node.addEventListener("pointerenter", show);
      node.addEventListener("pointerleave", hide);
      node.addEventListener("focus", show);
      node.addEventListener("blur", hide);
      svg.append(node);
    });

    box.textContent = "";
    box.append(svg, tip);
  };

  // Combined chart: every institute on one 0-max domain, interactive legend.
  const drawMulti = (box) => {
    const series = [...box.querySelectorAll("[data-name][data-values]")].map((s) => ({
      name: s.dataset.name,
      values: (s.dataset.values || "").split(",").map(num),
    }));
    const labels = (box.dataset.labels || "").split(",");
    if (series.length < 1) return;
    const abbrevs = abbrevMap(series.map((s) => s.name));

    const W = 520, H = 260, padL = 48, padR = 14, padT = 16, padB = 30;
    const max = Math.max(...series.flatMap((s) => s.values), 0);
    const range = max || 1;
    const stepX = (W - padL - padR) / (labels.length - 1);
    const x = (i) => padL + i * stepX;
    const y = (v) => padT + (1 - v / range) * (H - padT - padB);

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "multichart__svg", role: "img" });
    svg.setAttribute("aria-label", box.getAttribute("aria-label") || "spending by year");

    ticks(0, max, 4).forEach((v) => {
      const yy = y(v);
      svg.append(el("line", { x1: padL, y1: yy.toFixed(1), x2: W - padR, y2: yy.toFixed(1), class: "lc-grid" }));
      svg.append(el("text", { x: padL - 6, y: (yy + 3).toFixed(1), class: "lc-ylabel", "text-anchor": "end" }, axisShort(v)));
    });
    labels.forEach((lab, i) => {
      svg.append(el("text", { x: x(i).toFixed(1), y: H - padB + 14, class: "lc-xlabel", "text-anchor": "middle" }, lab));
    });

    const paths = series.map((s, si) => {
      const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const p = el("path", { d, fill: "none", stroke: "var(--accent)", "stroke-width": "1.5", class: "ml-line" });
      p.dataset.i = si;
      svg.append(p);
      return p;
    });

    const isolate = (si) => paths.forEach((p, i) => p.classList.toggle("is-dim", si != null && i !== si));

    // Hover tooltip: a node per point shows institute, year and amount, and
    // isolates that institute's line. Keyboard users isolate via the chips.
    const tip = document.createElement("div");
    tip.className = "multichart__tip";
    tip.hidden = true;
    series.forEach((s, si) => {
      s.values.forEach((v, i) => {
        const node = el("circle", { cx: x(i).toFixed(1), cy: y(v).toFixed(1), r: "3", class: "ml-node" });
        const label = `${s.name} · ${labels[i]}: ${valLabel(v)}`;
        node.setAttribute("aria-label", label);
        node.addEventListener("pointerenter", () => {
          tip.textContent = label;
          tip.hidden = false;
          tip.style.insetInlineStart = `${(x(i) / W) * 100}%`;
          tip.style.insetBlockStart = `${(y(v) / H) * 100}%`;
          isolate(si);
          paths[si].classList.add("is-on");
        });
        node.addEventListener("pointerleave", () => {
          tip.hidden = true;
          isolate(null);
          paths[si].classList.remove("is-on");
        });
        svg.append(node);
      });
    });

    const legend = document.createElement("div");
    legend.className = "multichart__legend";
    series.forEach((s, si) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ml-chip";
      chip.textContent = abbrevs[si];
      chip.title = s.name;
      chip.setAttribute("aria-label", s.name);
      const on = () => { isolate(si); chip.classList.add("is-on"); paths[si].classList.add("is-on"); };
      const off = () => { isolate(null); chip.classList.remove("is-on"); paths[si].classList.remove("is-on"); };
      chip.addEventListener("pointerenter", on);
      chip.addEventListener("pointerleave", off);
      chip.addEventListener("focus", on);
      chip.addEventListener("blur", off);
      legend.append(chip);
    });

    box.textContent = "";
    box.append(svg, tip, legend);
  };

  // Per-institute cards share one domain so magnitude is comparable.
  let sharedMax = 0;
  document.querySelectorAll(".spend-cards .linechart").forEach((b) => {
    (b.dataset.values || "").split(",").forEach((v) => {
      const n = num(v);
      if (n > sharedMax) sharedMax = n;
    });
  });
  document.querySelectorAll(".linechart").forEach((box) => {
    draw(box, box.closest(".spend-cards") ? sharedMax : null);
  });
  document.querySelectorAll(".multichart").forEach(drawMulti);

  // Format any [data-inr] element as Indian-grouped rupees (card totals).
  document.querySelectorAll("[data-inr]").forEach((n) => {
    const v = Number(n.dataset.inr);
    if (!Number.isFinite(v)) return;
    const s = shortINR(v);
    n.textContent = s ? `${fmtFull.format(v)} (${s})` : fmtFull.format(v);
  });
})();
