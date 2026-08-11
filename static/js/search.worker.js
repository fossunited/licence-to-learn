/* Full-text search over the RTI response PDFs — the expensive half.

   Everything costly happens here rather than on the main thread: fetching
   rti-index.json, parsing it, building the MiniSearch index, and running
   queries. The page therefore stays responsive no matter how large the corpus
   grows; a slow index build shows up as a spinner, never as a frozen tab.

   Protocol (see search.js):
     in   { type: "init", url }        -> out { type: "ready", docs } | { type: "error" }
     in   { type: "query", q, seq }    -> out { type: "results", hits, total, seq }
   Only the handful of hits being rendered cross the boundary, never the corpus.

   Classic worker on purpose: importScripts needs no module-worker support and
   no bundler. */
"use strict";

importScripts("./vendor/minisearch.umd.js");

const LIMIT = 30; // results rendered per query
const EXCERPT = 220; // characters of context around the first match

let mini = null;
let byId = new Map();

/* Fuzzy is not a nicety here: roughly half these pages come from OCR, so real
   hits carry character-level noise that exact matching would drop. Institute
   names are boosted so "NIT Warangal" ranks the right documents first. */
const SEARCH_OPTS = {
  fuzzy: 0.2,
  prefix: true,
  boost: { institute: 2 },
};

const buildExcerpt = (text, terms) => {
  // Anchor on the earliest matching term so the snippet shows why this hit
  // matched; fall back to the head of the page when nothing matches literally
  // (which happens on fuzzy hits, where the indexed term differs from input).
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase());
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) at = 0;

  let start = Math.max(0, Math.floor(at - EXCERPT / 3));
  let end = Math.min(text.length, start + EXCERPT);
  // Avoid slicing mid-word.
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    if (sp !== -1 && sp < start + 20) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > start) end = sp;
  }
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
};

const init = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`index fetch failed: ${res.status}`);
  const docs = await res.json();

  // The documents are kept in byId and looked up on the way out, so there is
  // no `storeFields` here — that would keep a second copy of every field.
  byId = new Map(docs.map((d) => [d.id, d]));
  mini = new MiniSearch({ fields: ["text", "institute"] });
  mini.addAll(docs);

  // Distinct PDFs, not pages — that is the number worth telling the reader.
  return new Set(docs.map((d) => d.ref)).size;
};

self.addEventListener("message", async ({ data }) => {
  if (data.type === "init") {
    try {
      const docs = await init(data.url);
      self.postMessage({ type: "ready", docs });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err && err.message) });
    }
    return;
  }

  if (data.type === "query") {
    if (!mini) return;
    const q = data.q.trim();
    if (!q) {
      self.postMessage({ type: "results", hits: [], total: 0, seq: data.seq });
      return;
    }
    const found = mini.search(q, SEARCH_OPTS);
    const hits = found.slice(0, LIMIT).map((hit) => {
      const doc = byId.get(hit.id);
      return {
        url: doc.url,
        institute: doc.institute,
        type: doc.type,
        page: doc.page,
        pages: doc.pages,
        excerpt: buildExcerpt(doc.text, hit.terms),
        terms: hit.terms,
      };
    });
    self.postMessage({ type: "results", hits, total: found.length, seq: data.seq });
  }
});
