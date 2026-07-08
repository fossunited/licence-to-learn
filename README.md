# License to Learn

A FOSS United campaign mapping the proprietary software that India's public
universities depend on, what it costs, and who controls it. Data comes from
Right to Information (RTI) requests and community led coursework audits.

## Why this setup

The site is intentionally small and static. Data changes often and new cases
get added over time, so data lives in plain text files (CSV plus a JSON Schema)
and the design lives only in templates. Content authors edit CSV and Markdown,
never markup. The result is a fast, accessible site with effectively no runtime
JavaScript, built by [Zola](https://www.getzola.org/).

## Important links

- Forum thread: https://forum.fossunited.org/t/6693

## Develop

All tools are pinned in `shell.nix`.

```sh
nix-shell        # enter the dev shell with packages
just             # list tasks
just serve       # live preview at http://127.0.0.1:1111
just check       # full gate: data validation, linters, link and HTML checks
```

or simply `zola serve`

## Contributing

- Edit data in `data/*.csv`. Each file has a sibling `*.schema.json` that
  defines its columns, allowed values, and per column styling (`x-display`).
  Add a column to both the CSV and the schema.
- Edit prose in `content/*.md`. Add a new case study as
  `content/cases/<name>.md` with `title`, `date`, and `description` front
  matter. `just import-case <file.docx> <name>` converts a Google Doc export.
- Refresh data from the spreadsheet with `just sync-data`.
- Run `just check` before opening a pull request. CI runs the same gate and
  blocks deploy if data or code fails, so bad data never ships.
- Keep design in templates and CSS. Keep data in CSV and schema. Do not mix.
