# licence to Learn

A FOSS United campaign mapping the proprietary software that India's public
universities depend on, what it costs, and who controls it. Data comes from
Right to Information (RTI) requests and community led coursework audits.

## Why "Licence" and not "License"?

We use British English (UK spelling conventions), which is the standard form of English used in India.

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

## Credits

This project was possible thanks to friends in the FOSS United community whose brains were picked, along with the staff that worked on this.

[Visit Credits Page](https://licencetolearn.in/credits)

## License

**Content and data** (case studies, RTI documents, copy, CSVs) :: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Reuse and remix freely, credit this project, keep derivatives equally open.

**Site source code** (templates, CSS, JS) :: [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html). See `[LICENSE](LICENSE)` in the repo.
