# ilovetables

A Chrome and Firefox extension that finds a data table on the page you are looking at and opens it in a panel where you can sort, fuzzy-search, and export CSV or Markdown. The page’s own table stays as it is. Nothing is uploaded.

The extension is not in a store. Install it from this folder. The current architecture is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Requirements

- Node.js 22 or newer (the tests run TypeScript with `node --experimental-strip-types`)
- npm
- Chrome, or Firefox 128 or newer

## Build

From this directory:

```bash
npm install
npm test && npx tsc --noEmit && npm run build
```

`npm run build` writes the extension into `dist/`. Load that folder. The source tree is not a loadable extension.

## Chrome

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Choose the `dist/` directory inside this repo.

The toolbar icon is named ilovetables. Pin it if you want it to stay visible.

After you change the source, run `npm run build` again, then click Reload on the ilovetables card on `chrome://extensions`.

## Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click Load Temporary Add-on.
3. Choose `dist/manifest.json`.

A temporary add-on is removed when Firefox quits. Load it again the next time. Firefox 128 or newer is required (`strict_min_version` in the manifest).

After a source change, rebuild, then click Reload on the temporary add-on.

## Try it

The content script runs on `http://` and `https://` pages. It does not run on `file://`.

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/fixtures/page.html`. A small icon appears on each data table. Click it. A public check is <https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes>.

Real-page cases and the expected results are in [TEST.md](TEST.md).

## Use

- Click the icon on a table. Sort by clicking a heading. Shift-click a heading to add another sort. Search from the box labeled “Find in this table”.
- Copy as and Save as remember a format. Click the label to do that default. Click the opener to choose Markdown or CSV; the choice becomes the default and runs. “Export all rows” ignores the search and keeps the sort.
- Drag the icon when it covers something. The drag stays inside the table, and scrolling does not slide the icon: it keeps its spot and moves with the table. Hover says “Open this table. Drag to move.” The icon, the panel, and the toolbar follow the browser language: English, German, or Czech.
- Drag across cells, then press Cmd-C or Ctrl-C to copy the selection.
- Escape or Close dismisses the panel. Hide icon removes the icon. The toolbar popup can show it again.
- Right-click and choose “Open in ilovetables” to open the table under the pointer, including one that did not get an icon.
- The toolbar popup can pause the extension on the current site. The options page turns formula guarding, the CSV separator, and fuzzy search on or off, and lists paused sites.
