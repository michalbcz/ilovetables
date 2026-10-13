# Agent rules

ilovetables is a Manifest V3 extension (Chrome and Firefox) that badges a data table and opens a read-only snapshot. It does not replace the host table, does not fetch, and does not upload.

Install and reload steps for a person are in [README.md](README.md). Page-by-page checks are in [TEST.md](TEST.md). The current shape of the system is in [ARCHITECTURE.md](ARCHITECTURE.md).

When a change moves a boundary, or changes detection, storage, export, packaging, or permissions, or when such an approach is rejected, follow the `adr` skill. Add `docs/adr/NNNN-*.md` and make `ARCHITECTURE.md` match the code. Keep history, including rejections, in the ADR. Do not turn `ARCHITECTURE.md` into a changelog.

## Before you finish a code change

```bash
npm test && npx tsc --noEmit && npm run build
```

`npm test` is `NODE_ENV=production node --experimental-strip-types --test tests/*.test.ts`. Test files import `../src/.../*.ts`. `tsconfig.json` includes `src` only, so `tsc` does not typecheck tests.

`npm run build` fails when `dist/content.js` gzip is over 80 KB. Do not edit `dist/`. Rebuild and reload the unpacked extension after a source change.

When a change affects the panel, popup, options page, badge, or detection on a real page, verify that flow in Chrome. Firefox is often not installed on this machine. Do not claim Firefox passed unless you loaded `dist/manifest.json` and exercised it.

## Layout

- `src/shared/` — extract, parse, sort values, CSV, Markdown, clipboard, filter, settings, messages, `i18n.ts`. No DOM widgets.
- UI strings go through `t()` in `src/shared/i18n.ts`. Catalogs are English, German, and Czech. `t()` follows `chrome.i18n.getUILanguage()`, then `navigator.language`, then English. Manifest name, description, and the toolbar tooltip are `__MSG_*__` in `_locales/{en,de,cs}/messages.json` and must match the catalog. `build.mjs` copies `_locales` into `dist/`.
- `src/content/` — scan, badge, panel. Shadow host `#ilovetables-root`.
- `src/background.ts` — context menu `open-proper-table`. Pass `info.frameId`. `tabs.sendMessage` without `frameId` reaches only the top frame, so the popup list is top-frame only.
- `src/popup/`, `src/options/` — extension pages. esbuild emits IIFE bundles, so these files cannot use top-level await.
- `fixtures/page.html` — browser fixture. linkedom does not run its script, so unit tests do not see `#shadow-table` or the bulk rows.
- `manifest.json` is copied into `dist/` as-is. Permissions stay `storage` and `contextMenus`, hosts `http://*/*` and `https://*/*`. No `downloads` permission. Downloads use an object-URL anchor.

## Product behavior to keep

- Badge a snapshot. Do not rewrite the host `<table>`. Escape, the scrim, and Close dismiss the panel. Refresh re-reads the DOM.
- Detect data `<table>` elements and `role="table"|"grid"|"treegrid"`. Walk open shadow roots. Nested tables are their own candidates.
- Skip layout chrome (`nav`, `footer`, `role="presentation"|"none"`), one-row tables, tables that are more than 80% empty, and tables that are too small and have no header.
- A headerless grid where more than 80% of cells are a single link is a menu. Skip it. A table with `suggestedHeaderRows > 0` stays even when almost every cell is a link. That is why the Wikipedia ISO 3166 table badges.
- Cell text is trimmed, whitespace collapsed, `<br>` kept as newlines. Inputs, textareas, and selects contribute their value (`option[selected]`, else the first option). Images contribute `alt`. Links contribute their visible text.
- Spanned text is repeated into every covered cell. The parent cell of a nested table does not flatten the inner grid.
- Closed shadow DOM is invisible. Canvas, PDF, images, and div or flex “tables” without a table role are out of scope.
- A virtualized grid snapshots rows that are in the DOM. If `aria-rowcount` is larger, say so. Do not auto-scroll the page to collect more rows.
- The grid is read-only. Sort is type-aware. Shift-click adds a sort. Empty cells and values that do not parse for a number or date column sort last in both directions.
- Fuzzy search uses uFuzzy: `intraMode: 0`, then `intraMode: 1` if there are no hits. Haystack and needle are latinized. Fuzzy off means a case-insensitive substring. “Acem Corp” matches “Acme Corp”. “Axme Corp” does not. “Compxny” matches “Company”.
- Export the filtered, sorted view. “Export all rows” drops the filter and keeps the sort. CSV is RFC 4180, CRLF, UTF-8 BOM on Save. Copy CSV is the same text with `bom: false`. Semicolon is the Excel (EU) option. Prefix `'` on cells that start with `=`, `+`, `@`, tab, or CR. Prefix `-` only when `parseNumber` returns null. Markdown is GFM: escape `\` and `|`, newlines become `<br>`, numeric columns are right-aligned. The panel has two split buttons, Copy as and Save as. The label runs the remembered default (`copyAs` markdown, `saveAs` csv, in `chrome.storage.local`). The opener chooses Markdown or CSV, stores that default, and runs it. Cmd-C or Ctrl-C still copies the selection as TSV.
- `guessHeaderRows` returns 1 only for a strong label-over-values signal. `<thead>` and an all-`<th>` first row still win. When `suggestedHeaderRows` is 0, the panel shows “First row is the column names”, which sets the header-row override to 1 or back to 0.
- The icon stores a session offset (`dx`, `dy`) inside the table, and only after a drag (`moved`). Until then it sits at the top-right inset. The host is document-absolute, so the icon scrolls with the page and is not repositioned on scroll. Dragging past 4px moves it, clamps the whole 22px icon inside the table, and must not open the panel. A table smaller than the icon keeps the icon at the table’s top-left. Hover shows `.tip` with the constant `badgeTip` sentence (no column names) and blinks `.halo` over the host table’s rectangle. Do not write an outline onto the host element. Hide the halo while dragging. Do not hide the icon just because the table has scrolled off screen.
- `dataTableReason` returns a reason code (`layout-chrome`, `link-grid`, …). The popup translates `reason.<code>`.
- Persist in `chrome.storage.local`. Settings hold formula guard, CSV separator, fuzzy, Copy as / Save as, and ignore rules (`url`, `host`, `domain`). A host rule matches `location.host` exactly. A domain rule matches the registrable domain from the short suffix list in `src/shared/ignore.ts`, not the full Public Suffix List. Per-host memory holds the ignored flag, header-row override, column type, and “Open automatically” (default off, once per page load). `tableKey` fingerprints suggested headers only. Fold older `disabledHosts` into host rules only when stored settings have no `ignores` list. A save mirrors host rules into `disabledHosts` and does not copy that mirror back.

## Implementation traps

- Do not read `HTMLTableElement.rows` or `HTMLTableCellElement.rowSpan` / `colSpan`. linkedom does not implement them. Walk `thead` / `tbody` / `tfoot` / `tr`, and use `spanOf()` (numeric property, else attribute, else 1).
- In `cellText`, branch on `nodeType` (`3` text, `1` element). Do not reference global `Node`, `Element`, or `instanceof ShadowRoot`. An open shadow root is `nodeType === 11` and `"host" in root`.
- `chrome` may be missing in a Firefox content script. Use `globalThis.chrome ?? globalThis.browser`.
- The object passed as TanStack `state` replaces all of `TableState`. It must include `columnPinning: { left: [], right: [] }` along with `sorting`. Cast it with `as unknown as TableState`. A direct cast fails `tsc`, and a missing `columnPinning` throws in `getHeaderGroups` before the panel wires Close.
- Sort by returning `undefined` from `sortValue` for blanks and unparsed typed cells, with TanStack `sortUndefined: 'last'`. Do not prefilter and then sort.
- The virtualizer’s scroll parent needs a real CSS height. A first measure of 0 paints no rows.
- Re-query `thead th` after a header click. A rebuild replaces the header node.
- `blob.text()` strips a leading UTF-8 BOM. Assert the CSV BOM with `arrayBuffer` bytes `239, 187, 191`.
- Badge placement uses `getBoundingClientRect`. `JSON.stringify` on a `DOMRect` is `{}` because the fields are not enumerable.
- Mutation observation ignores the extension host and does not rescan on text edits inside an existing table. Refresh covers that.
- Number parsing: currency symbols and `%` are stripped. Parentheses or a leading minus make a negative. If both `.` and `,` appear, the last one is the decimal mark. A single separator followed by exactly three digits is thousands (`1,200` → 1200, `1.234` → 1234, `90.208` → 90208). Two digits after the separator is a decimal (`€1.50`, `1,50`). `1.234,56` → 1234.56. `909,411` becomes 909411, including on German pages where that shape means 909.411. Dates are ISO `YYYY-MM-DD` only. `2024-02-31`, `03/04/2024`, and `01-Jan-16` stay text. `inferKind` needs at least 0.8 of the nonempty cells.

## Do not add unless asked

React, WXT, Tabulator, AG Grid, Handsontable, Grid.js, simple-datatables, Papa Parse, dayjs, SheetJS, an LLM or Prompt API path, XLSX, network export, telemetry, editing cells back into the page, per-column filters, and scroll-to-collect. `simple-datatables` is LGPL-3.0.

UI tokens live in `src/theme.css`: ink `#1a2332`, paper `#f3f6f7`, line `#c5d0d6`, stamp `#d23b2a`, field `#fff`, quiet `#52616b`, hard shadow `4px 4px 0 #1a2332`, radius 2px, system UI sans, tabular numbers. Do not restyle toward a generic card, cream and orange, or acid green on black.
