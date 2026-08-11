# Vendored third-party JavaScript

Checked in rather than installed, because the repo has no `package.json` and no
JS build step, and we would like to keep it that way. Files here are unmodified
upstream builds — do not edit them; replace them wholesale on upgrade.

| File | Package | Version | Licence | Source |
| --- | --- | --- | --- | --- |
| `minisearch.umd.js` | [minisearch](https://github.com/lucaong/minisearch) | 7.2.0 | MIT (`minisearch.LICENSE.txt`) | `dist/umd/index.js` from the npm tarball |

The UMD build is used (not ESM) so `static/js/search.worker.js` can stay a
classic worker and pull it in with `importScripts`, which needs no module-worker
support and no bundler. It is shipped unminified so it stays auditable; it is
~86 KB raw, ~20 KB over the wire once the host gzips it.

To upgrade:

```sh
npm pack minisearch@<version> && tar xzf minisearch-<version>.tgz
cp package/dist/umd/index.js static/js/vendor/minisearch.umd.js
cp package/LICENSE.txt static/js/vendor/minisearch.LICENSE.txt
```
