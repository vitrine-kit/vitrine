# registry/ — copy-in feature registry

The source for `vitrine init` / `vitrine add`. Each feature = a folder with `feature.json` (manifest) + `files/` (sources). On install the files are **copied** into the client repository (the client owns the code).

`_index.json` is the registry manifest: the list of all features + the kit version.

**Rule (spec §4, §13):** the registry holds only what varies per client (UI, sections, wiring). No critical logic — that lives in `@vitrine-kit/core`. A new feature must depend **only on the contracts**.
