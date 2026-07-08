/* Progressive enhancement for tables rendered by the Zola `table` macro.
   The <table> is complete and readable without this file. Here we add, per
   table[data-enhance]: ₹ grouping, a two-row toolbar (search+count+width-modes,
   then filters), collapse, column resize, and sort. No dependencies. */
(() => {
  "use strict";

  const LIMIT = 40;
  const mobile = matchMedia("(max-width: 40rem)").matches;
  const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  // Compact suffix shown in brackets beside a full ₹ number: "2.3 Cr" / "1.5 L".
  const shortINR = (n) => {
    if (n >= 1e7) return `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.?0+$/, "")}k`;
    return "";
  };

  const enhance = (table) => {
    const thead = table.tHead;
    const tbody = table.tBodies[0];
    if (!thead || !tbody) return;
    const heads = [...thead.rows[0].cells];
    const rowsOf = () => [...tbody.rows];
    const fig = table.closest(".table-fig");
    const total = rowsOf().length;

    // 1. ₹ grouping on cost cells (raw number stays in data-val for sorting)
    table.querySelectorAll("td.col--cost[data-val]").forEach((td) => {
      const n = Number(td.dataset.val);
      if (!Number.isFinite(n)) return;
      const s = shortINR(n);
      td.textContent = s ? `${inr.format(n)} (${s})` : inr.format(n);
    });

    // 2. Toolbar — row 1: search + count (+ width modes); row 2: filters
    const tools = document.createElement("div");
    tools.className = "table-tools";
    const row1 = document.createElement("div");
    row1.className = "table-tools__row";
    tools.append(row1);

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search…";
    search.setAttribute("aria-label", "Search table");
    row1.append(search);

    const count = document.createElement("span");
    count.className = "table-count";
    count.setAttribute("aria-live", "polite");
    row1.append(count);

    // Download CSV: reconstruct the original values (title holds the raw cell
    // for text/tag/link/count columns; data-val holds raw numbers for costs).
    const dl = document.createElement("button");
    dl.type = "button";
    dl.className = "btn btn--surface table-download";
    dl.textContent = "Download CSV";
    dl.addEventListener("click", () => {
      const esc = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
      const header = heads.map((th) =>
        esc((th.querySelector(".th-label")?.textContent ?? th.textContent).trim()));
      const lines = [header.join(",")];
      rowsOf().forEach((row) => {
        const cells = [...row.cells].map((td) => {
          const raw = td.getAttribute("title") || td.dataset.val || td.textContent || "";
          return esc(raw.trim());
        });
        lines.push(cells.join(","));
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const name = ((fig?.querySelector("figcaption")?.textContent) || "table")
        .trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "table";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    row1.append(dl);

    const filtersRow = document.createElement("div");
    filtersRow.className = "table-filters";
    const filters = [];
    heads.forEach((th, col) => {
      const cell = tbody.rows[0]?.cells[col];
      if (!cell || !cell.matches(".col--tag, .col--status")) return;
      // Opt-in: only columns with x-display.filter (non-multi) get a dropdown.
      if (!th.dataset.filter || th.dataset.filter === "multi") return;
      const values = [...new Set(rowsOf().map((r) => r.cells[col].dataset.val).filter(Boolean))].sort();
      const sel = document.createElement("select");
      const name = th.textContent.trim();
      sel.setAttribute("aria-label", `Filter by ${name}`);
      sel.append(new Option(`All ${name}`, ""));
      values.forEach((v) => sel.append(new Option(v, v)));
      sel.dataset.col = col;
      filters.push(sel);
      filtersRow.append(sel);
    });

    // Multi-value filters (e.g. the software "Used by" institutes column):
    // dropdown from the union of split values, matched by contains.
    heads.forEach((th, col) => {
      if (th.dataset.filter !== "multi") return;
      const vals = new Set();
      rowsOf().forEach((r) => {
        const cell = r.cells[col];
        (cell.getAttribute("title") || cell.textContent || "")
          .split(",").forEach((v) => { const t = v.trim(); if (t) vals.add(t); });
      });
      const sel = document.createElement("select");
      const name = (th.querySelector(".th-label")?.textContent ?? th.textContent).trim();
      sel.setAttribute("aria-label", `Filter by ${name}`);
      sel.append(new Option(`All ${name}`, ""));
      [...vals].sort().forEach((v) => sel.append(new Option(v, v)));
      sel.dataset.col = col;
      sel.dataset.multi = "1";
      filters.push(sel);
      filtersRow.append(sel);
    });
    if (filters.length) tools.append(filtersRow);

    // Width modes (Page / Fit / Full). Mobile starts in Fit; control hidden by CSS.
    if (fig) {
      const ICON = {
        page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="7" y="5" width="10" height="14" rx="1"/></svg>',
        fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 6 5 6 5 18 10 18M14 6 19 6 19 18 14 18"/></svg>',
        full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>',
      };
      const LABEL = { page: "Page width", fit: "Fit to content", full: "Full width" };
      const initial = mobile ? "fit" : "page";
      fig.classList.add(`tw--${initial}`);
      const modes = document.createElement("div");
      modes.className = "table-modes";
      modes.setAttribute("role", "group");
      modes.setAttribute("aria-label", "Table width");
      ["page", "fit", "full"].forEach((m) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "table-mode";
        b.title = LABEL[m];
        b.setAttribute("aria-label", LABEL[m]);
        b.setAttribute("aria-pressed", String(m === initial));
        b.innerHTML = ICON[m];
        b.addEventListener("click", () => {
          fig.classList.remove("tw--page", "tw--fit", "tw--full");
          fig.classList.add(`tw--${m}`);
          modes.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        });
        modes.append(b);
      });
      row1.append(modes);
    }

    table.parentNode.before(tools);

    // 3. Collapse long tables to LIMIT rows + a show-all button
    let collapsed = total > LIMIT;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "btn btn--surface table-more";
    table.parentNode.after(more);

    const apply = () => {
      const q = search.value.trim().toLowerCase();
      const matches = rowsOf().filter((row) => {
        const okSearch = !q || row.textContent.toLowerCase().includes(q);
        const okFilters = filters.every((sel) => {
          if (!sel.value) return true;
          const cell = row.cells[sel.dataset.col];
          if (sel.dataset.multi) {
            return (cell.getAttribute("title") || cell.textContent || "")
              .split(",").map((s) => s.trim()).includes(sel.value);
          }
          return cell.dataset.val === sel.value;
        });
        return okSearch && okFilters;
      });
      const cap = collapsed ? LIMIT : Infinity;
      rowsOf().forEach((row) => (row.hidden = true));
      matches.forEach((row, i) => (row.hidden = i >= cap));

      count.textContent = matches.length === total ? `${total} rows` : `Showing ${matches.length} of ${total}`;
      const overflowing = matches.length > LIMIT;
      more.hidden = !overflowing;
      more.textContent = collapsed ? `Show all ${matches.length}` : "Show less";
      fig?.classList.toggle("is-collapsed", collapsed && overflowing);
    };
    more.addEventListener("click", () => {
      collapsed = !collapsed;
      apply();
    });
    search.addEventListener("input", apply);
    filters.forEach((sel) => sel.addEventListener("change", apply));

    // 4. Column resize — visible grip, works with mouse + touch (Pointer Events)
    heads.forEach((th) => {
      const grip = document.createElement("span");
      grip.className = "col-resize";
      grip.setAttribute("aria-hidden", "true");
      grip.title = "Drag to resize column";
      th.append(grip);
      grip.addEventListener("click", (e) => e.stopPropagation());
      grip.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = th.getBoundingClientRect().width;
        grip.setPointerCapture(e.pointerId);
        table.classList.add("is-resizing");
        const move = (ev) => (th.style.width = `${Math.max(60, startW + ev.clientX - startX)}px`);
        const up = () => {
          table.classList.remove("is-resizing");
          grip.removeEventListener("pointermove", move);
          grip.removeEventListener("pointerup", up);
        };
        grip.addEventListener("pointermove", move);
        grip.addEventListener("pointerup", up);
      });
    });

    // 5. Sort — click/Enter a header, toggle asc/desc
    heads.forEach((th, col) => {
      th.dataset.sortable = "";
      th.setAttribute("role", "button");
      th.tabIndex = 0;
      const kind = th.dataset.sort || "text";
      const val = (row) => row.cells[col].dataset.val ?? row.cells[col].textContent;
      const cmp =
        kind === "number"
          ? (a, b) => (parseFloat(val(a)) || 0) - (parseFloat(val(b)) || 0)
          : (a, b) => val(a).localeCompare(val(b), undefined, { numeric: true });
      const sort = () => {
        const dir = th.getAttribute("aria-sort") === "ascending" ? -1 : 1;
        heads.forEach((h) => h.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
        rowsOf().sort((a, b) => cmp(a, b) * dir).forEach((r) => tbody.append(r));
        apply();
      };
      th.addEventListener("click", sort);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          sort();
        }
      });
    });

    apply();
  };

  document.querySelectorAll("table[data-enhance]").forEach(enhance);
})();
