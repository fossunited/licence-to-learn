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
  // X-axis ticks are tight, so a "2020-21" span renders as "FY 21" — the year
  // the financial year closes, per the Indian FY convention. Tooltips and aria
  // labels keep the unabbreviated span. Anything not matching is left alone.
  const fyTick = (label) => {
    const m = /^\s*\d{4}-(\d{2})\s*$/.exec(label);
    return m ? `FY ${m[1]}` : label;
  };
  const el = (name, attrs, text) => {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };
  // n+1 evenly spaced tick values from lo to hi (for Y-axis gridlines/labels).
  const ticks = (lo, hi, n) => Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);

  // Rounded-rect path with independent corner radii, [top-left, top-right,
  // bottom-right, bottom-left] — <rect rx> can only round all four at once, and
  // the charts need a bar with a capped top and square feet. Each radius is
  // clamped to half the shorter side so a 4-unit-tall bar can't self-intersect.
  // A zero-radius arc is a lineto per the SVG spec, so square corners need no
  // special case.
  const rrect = (x, y, w, h, radii) => {
    const lim = Math.min(w, h) / 2;
    const [tl, tr, br, bl] = radii.map((r) => Math.max(0, Math.min(r, lim)));
    const f = (v) => v.toFixed(1);
    const arc = (r, ex, ey) => `A${f(r)},${f(r)} 0 0 1 ${f(ex)},${f(ey)}`;
    return [
      `M${f(x + tl)},${f(y)}`,
      `H${f(x + w - tr)}`, arc(tr, x + w, y + tr),
      `V${f(y + h - br)}`, arc(br, x + w - br, y + h),
      `H${f(x + bl)}`, arc(bl, x, y + h - bl),
      `V${f(y + tl)}`, arc(tl, x + tl, y),
      "Z",
    ].join(" ");
  };

  // Corner sets shared by both charts. The row of columns reads as one slab:
  // only the chart's outer corners round, joins between columns stay square.
  const outerCorners = (r, isFirst, isLast) => [
    isFirst ? r : 0, isLast ? r : 0, isLast ? r : 0, isFirst ? r : 0,
  ];
  // A reported year gets a rounded cap; its feet round only at the chart's ends.
  const barCorners = (r, isFirst, isLast) => [r, r, isLast ? r : 0, isFirst ? r : 0];

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
      const cls = v > 0 ? "linechart__node" : "linechart__node is-empty";
      const node = el("circle", { cx: x(i).toFixed(1), cy: y(v).toFixed(1), r: "4", class: cls, tabindex: "0", role: "button" });
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

  // Shared bar-fill defs (solid accent gradient for reported years, a hatch
  // pattern standing in for zero/unreported ones instead of a misleadingly
  // flat solid bar) plus a hover/focus tooltip wired identically for every
  // bar — no permanent callout, so it doesn't crowd small charts and keeps
  // one interaction pattern across the mini and full-size charts.
  // hatch: how the no-data pattern is drawn. Light strokes read against a bare
  // card background (the full-size chart); dark ones read against the grey
  // column track drawn behind them (the mini sparkline) — the stroke has to
  // contrast with whatever the pattern's transparent gaps expose.
  const HATCH_LIGHT = { stroke: "var(--body)", opacity: "0.45", angle: 45 };
  const HATCH_DARK = { stroke: "var(--bg)", opacity: "1", angle: 30 };

  const barDefs = (svg, uid, hatchStyle = HATCH_LIGHT) => {
    const defs = el("defs", {});
    const grad = el("linearGradient", { id: uid, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(el("stop", { offset: "0%", "stop-color": "var(--accent)", "stop-opacity": "1" }));
    grad.append(el("stop", { offset: "100%", "stop-color": "var(--accent)", "stop-opacity": "0.2" }));
    defs.append(grad);
    const hatchId = `${uid}h`;
    // A vertical line rotated by `angle` — the smaller the angle, the steeper
    // the stripe. Gaps stay transparent so what's behind shows through.
    const hatch = el("pattern", { id: hatchId, patternUnits: "userSpaceOnUse", width: "5.5", height: "5.5", patternTransform: `rotate(${hatchStyle.angle})` });
    hatch.append(el("line", { x1: "0", y1: "0", x2: "0", y2: "5.5", stroke: hatchStyle.stroke, "stroke-width": "1.5", opacity: hatchStyle.opacity }));
    defs.append(hatch);
    svg.append(defs);
    return { fillId: `url(#${uid})`, hatchId: `url(#${hatchId})` };
  };

  // Appended to <body>, not `box` — a card ancestor (.spend-card) clips
  // overflow to guard against unrelated layout spillage (see its comment in
  // main.css), which was clipping this tooltip whenever a bar's popup
  // reached above the card's own padding. Positioning from the target bar's
  // own page coordinates instead of a percentage of `box` sidesteps that:
  // absolute position on <body> resolves against the document, so it still
  // scrolls with the page like before.
  const wireBarTip = (tipClass) => {
    const tip = document.createElement("div");
    tip.className = tipClass;
    tip.hidden = true;
    document.body.append(tip);
    return {
      show(label, target) {
        tip.textContent = label;
        tip.hidden = false;
        const r = target.getBoundingClientRect();
        // Centering on the bar (translate: -50% via CSS) spills past the
        // viewport edge for bars near either side of a narrow card — clamp
        // the anchor so the tip's own box stays fully on-screen instead.
        const margin = 8;
        const half = tip.offsetWidth / 2;
        const vw = document.documentElement.clientWidth;
        const clientX = Math.min(Math.max(r.left + r.width / 2, half + margin), vw - half - margin);
        tip.style.insetInlineStart = `${clientX + window.scrollX}px`;
        tip.style.insetBlockStart = `${r.top + window.scrollY}px`;
      },
      hide() { tip.hidden = true; },
    };
  };

  // Compact 5-bar sparkline (institute cards). Shares the values/labels
  // contract with the full chart above. Its box is stretched by the parent
  // row (align-items: stretch) to match the sibling money panel, which can
  // grow taller than the default 72px once its text wraps on a narrow
  // screen — H is measured from that resolved box height, not hardcoded, so
  // the bars redraw to fill it exactly instead of leaving a gap below them.
  const drawMini = (box) => {
    const values = (box.dataset.values || "").split(",").map(num);
    const labels = (box.dataset.labels || "").split(",");
    if (!values.length) return;

    const W = 140, H = Math.max(72, Math.round(box.getBoundingClientRect().height) || 72), gap = 4, RX = 5;
    const n = values.length;
    const barW = (W - gap * (n - 1)) / n;
    const max = Math.max(...values, 1);

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "linechart__mini-svg", role: "img" });
    svg.setAttribute("aria-label", box.getAttribute("aria-label") || "spending by year");
    const { fillId, hatchId } = barDefs(svg, `lcm${n}_${Math.round(max)}`, HATCH_DARK);

    box.textContent = "";
    box.append(svg);
    const tip = wireBarTip("linechart__callout");

    values.forEach((v, i) => {
      const bx = i * (barW + gap);
      const outer = outerCorners(RX, i === 0, i === n - 1);
      // Grey full-height track per year: a short bar then reads against the
      // column it could have filled, and it backs the hatch pattern's gaps
      // on no-data years.
      svg.append(el("path", {
        d: rrect(bx, 0, barW, H, outer),
        fill: "var(--track)", class: "lcm-track",
      }));

      // No-data years hatch the full column height, not a sliver, so "no
      // data" reads as a deliberate state rather than a rounding error. Being
      // full-height, they take the track's corners rather than a bar cap.
      const h = v > 0 ? Math.max(4, (v / max) * H) : H;
      const y = H - h;
      const bar = el("path", {
        d: rrect(bx, y, barW, h, v > 0 ? barCorners(RX, i === 0, i === n - 1) : outer),
        fill: v > 0 ? fillId : hatchId, class: "lcm-bar", tabindex: "0", role: "img",
      });
      const ariaLabel = `${labels[i] ? labels[i] + ": " : ""}${valLabel(v)}`;
      bar.setAttribute("aria-label", ariaLabel);
      svg.append(bar);

      const tipLabel = `${valLabel(v)}${labels[i] ? ` (${labels[i]})` : ""}`;
      const showTip = () => tip.show(tipLabel, bar);
      bar.addEventListener("pointerenter", showTip);
      bar.addEventListener("focus", showTip);
      bar.addEventListener("pointerleave", tip.hide);
      bar.addEventListener("blur", tip.hide);
    });
  };

  // Full-size bar chart (institution page): gradient bars, gridlines shared
  // with draw() above. The viewBox is sized to the container's own rendered
  // pixels (not a fixed 320x190) so it can stretch to match a taller sibling
  // card (see .institution__grid) without distorting text — a fixed
  // viewBox stretched via preserveAspectRatio="none" warps the glyphs.
  const drawBar = (box) => {
    const values = (box.dataset.values || "").split(",").map(num);
    const labels = (box.dataset.labels || "").split(",");
    if (!values.length) return;

    const rect = box.getBoundingClientRect();
    // Upper clamp is a safety net, not a real layout constraint: this box's
    // height comes from a CSS grid stretch matching its sibling stats card
    // (see .institution__grid), and a redraw-triggered remeasure mid-resize
    // has been observed to read a wildly wrong one-off value from the
    // browser before that stretch has settled. 1400px is comfortably above
    // any legitimate stats-card height; a real reading never needs it.
    const W = Math.min(1600, Math.max(200, Math.round(rect.width) || 320));
    const H = Math.min(1400, Math.max(140, Math.round(rect.height) || 190));
    const padL = 30, padR = 4, padT = 20, padB = 22, gap = 7;
    const max = Math.max(...values, 1);
    const n = values.length;
    const barW = (W - padL - padR - gap * (n - 1)) / n;
    const x = (i) => padL + i * (barW + gap);
    // No-data years hatch the full plot height, not a sliver, so "no data"
    // reads as a deliberate state rather than a rounding error.
    const barH = (v) => (v > 0 ? Math.max(2, (v / max) * (H - padT - padB)) : H - padT - padB);

    const plotH = H - padT - padB;
    const rx = Math.min(8, barW * 0.2);

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "barchart__svg", role: "img" });
    svg.setAttribute("aria-label", box.getAttribute("aria-label") || "spending by year");
    const { fillId, hatchId } = barDefs(svg, `bc${n}_${Math.round(max)}`, HATCH_DARK);

    values.forEach((_, i) => {
      svg.append(el("path", {
        d: rrect(x(i), padT, barW, plotH, outerCorners(rx, i === 0, i === n - 1)),
        fill: "var(--track)", class: "barchart__track",
      }));
    });

    // No gridlines across the plot — the grey column tracks already carry the
    // "how full is this bar" read; just the axis labels, no dashed rules.
    ticks(0, max, 4).forEach((v) => {
      const yy = padT + (1 - v / max) * (H - padT - padB);
      svg.append(el("text", { x: padL - 6, y: (yy + 3).toFixed(1), class: "lc-ylabel", "text-anchor": "end" }, axisShort(v)));
    });

    labels.forEach((lab, i) => {
      svg.append(el("text", { x: (x(i) + barW / 2).toFixed(1), y: H - padB + 14, class: "lc-xlabel", "text-anchor": "middle" }, fyTick(lab)));
    });

    box.textContent = "";
    box.append(svg);
    const tip = wireBarTip("barchart__callout");

    values.forEach((v, i) => {
      const h = barH(v);
      const barY = H - padB - h;
      const corners = v > 0
        ? barCorners(rx, i === 0, i === n - 1)
        : outerCorners(rx, i === 0, i === n - 1);
      const bar = el("path", {
        d: rrect(x(i), barY, barW, h, corners),
        fill: v > 0 ? fillId : hatchId, class: "barchart__bar",
      });
      const ariaLabel = `${labels[i] ? labels[i] + ": " : ""}${valLabel(v)}`;
      bar.setAttribute("aria-label", ariaLabel);
      bar.setAttribute("tabindex", "0");
      bar.setAttribute("role", "img");
      svg.append(bar);

      const tipLabel = `${valLabel(v)}${labels[i] ? ` (${labels[i]})` : ""}`;
      const showTip = () => tip.show(tipLabel, bar);
      bar.addEventListener("pointerenter", showTip);
      bar.addEventListener("focus", showTip);
      bar.addEventListener("pointerleave", tip.hide);
      bar.addEventListener("blur", tip.hide);
    });
  };

  // Each card scales to its own max, like a normal standalone chart.
  document.querySelectorAll(".linechart").forEach((box) => {
    if (!box.classList.contains("linechart--mini")) draw(box, null);
  });

  // Mini sparklines redraw on size change — the same rAF-deferred,
  // dedupe-by-Set dance as the barBoxes observer below, so a redraw that
  // resizes the box (e.g. its H changes) doesn't re-trigger itself in a
  // loop. Wired to the box's own size rather than run once like draw()
  // above, since drawMini's H depends on the stretched layout height (see
  // the comment on drawMini), which can change after a viewport resize
  // re-wraps the sibling money panel's text.
  const miniBoxes = document.querySelectorAll(".linechart--mini");
  if (miniBoxes.length && "ResizeObserver" in window) {
    let miniRaf = 0;
    const miniPending = new Set();
    const flushMini = () => {
      miniRaf = 0;
      miniPending.forEach(drawMini);
      miniPending.clear();
    };
    const miniRo = new ResizeObserver((entries) => {
      entries.forEach((entry) => miniPending.add(entry.target));
      if (!miniRaf) miniRaf = requestAnimationFrame(flushMini);
    });
    miniBoxes.forEach((box) => miniRo.observe(box));
  } else {
    miniBoxes.forEach(drawMini);
  }

  // .institution__card--chart is meant to match its sibling stats card's
  // height (see .institution__grid) — previously done by leaving its own
  // block-size at the CSS default and letting the grid's align-items:stretch
  // sort it out. That relies on the browser resolving .barchart's
  // block-size:100% (a percentage against a cross-size that grid is
  // simultaneously trying to derive from this same item's natural size) —
  // an ambiguous chain that has been observed to occasionally resolve to a
  // wildly wrong height (a stray ~1400px+) and then stay stuck there,
  // surviving further resizes, until a full reload. Setting the chart
  // card's height explicitly, from the stats card's own ordinary
  // (non-percentage, non-ambiguous) rendered height, sidesteps that: a
  // definite size on a grid item isn't stretched further, so this one JS
  // assignment fully replaces the CSS stretch for this pair. Mobile is
  // unaffected — it clears the inline height so the existing aspect-ratio
  // media-query rules take over once the grid stacks to one column.
  const chartCard = document.querySelector(".institution__card--chart");
  const statsCard = document.querySelector(".institution__stats");
  if (chartCard && statsCard) {
    const stackedMQ = window.matchMedia("(width <= 40rem)");
    const syncChartHeight = () => {
      chartCard.style.blockSize = stackedMQ.matches
        ? ""
        : `${Math.round(statsCard.getBoundingClientRect().height)}px`;
    };
    syncChartHeight();
    new ResizeObserver(syncChartHeight).observe(statsCard);
    stackedMQ.addEventListener("change", syncChartHeight);
  }

  // drawBar sizes its viewBox to the container's current rendered pixels
  // (see the comment above drawBar), so a redraw is required whenever that
  // size changes — the breakpoint where .institution__grid stacks to one
  // column, a browser resize, or the stats card beside it changing height.
  // Without this, the SVG's width:100%/aspect-ratio CSS box moves on but the
  // content stays at its old viewBox aspect, letterboxing into empty space
  // or stretching. ResizeObserver's own initial callback does the first draw
  // (no plain forEach call), so there is exactly one draw path, not two.
  //
  // The redraw itself is deferred to requestAnimationFrame rather than run
  // straight from the observer callback. drawBar mutates the observed box's
  // own children, and this box's height is a CSS grid stretch matched to its
  // sibling stats card (see .institution__grid) — mutating it synchronously
  // mid-notification, before that stretch has settled, has been observed to
  // read back a one-off garbage height (a stray ~4700px) that then gets
  // etched into the viewBox and doesn't self-correct on a later resize
  // because nothing changes size again to re-trigger it. Re-measuring fresh
  // one frame later, once layout has actually settled, avoids that.
  const barBoxes = document.querySelectorAll(".barchart");
  if (barBoxes.length && "ResizeObserver" in window) {
    let raf = 0;
    const pending = new Set();
    const flush = () => {
      raf = 0;
      pending.forEach((box) => {
        const rect = box.getBoundingClientRect();
        const w = Math.round(rect.width), h = Math.round(rect.height);
        if (box.dataset.lastW !== String(w) || box.dataset.lastH !== String(h)) {
          box.dataset.lastW = String(w);
          box.dataset.lastH = String(h);
          drawBar(box);
        }
      });
      pending.clear();
    };
    const ro = new ResizeObserver((entries) => {
      entries.forEach((entry) => pending.add(entry.target));
      if (!raf) raf = requestAnimationFrame(flush);
    });
    barBoxes.forEach((box) => ro.observe(box));
  } else {
    barBoxes.forEach(drawBar);
  }

  // [data-inr]: compact form by default (e.g. "₹1.9 Cr"). Short and full
  // stack as two lines inside a clipped .amt__viewport; CSS translates that
  // viewport on :hover/:focus-within of the nearest .amt-row, rolling both
  // as one piece from short to full (and back) — see .amt-row in main.css.
  document.querySelectorAll("[data-inr]").forEach((n) => {
    const v = Number(n.dataset.inr);
    if (!Number.isFinite(v)) return;
    const s = shortINR(v);
    const full = fmtFull.format(v);
    if (!s) { n.textContent = full; return; }
    n.textContent = "";
    n.classList.add("amt");
    const viewport = document.createElement("span");
    viewport.className = "amt__viewport";
    const short = document.createElement("span");
    short.className = "amt__short";
    short.textContent = `₹${s}`;
    const fullEl = document.createElement("span");
    fullEl.className = "amt__full";
    fullEl.textContent = full;
    viewport.append(short, fullEl);
    n.append(viewport);
  });
})();
