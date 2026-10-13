# Manual tests on real pages

Load the unpacked extension from `dist/`, then run these cases in the browser. Each case is a public page with a table shape the detector and the grid have to handle. The local fixture at the end is the known-answer page for formula cells, form controls, open shadow DOM, and a row that appears after load.

Pages change. Where a count is given, it was read on 2026-10-11. If the article has grown, the panel count should match the data rows on the page that day.

The badge is a snapshot. The host `<table>` stays in the page. Refresh inside the panel re-reads the DOM.

## Load

1. `npm test && npx tsc --noEmit && npm run build`
2. Chrome: `chrome://extensions`, Developer mode, Load unpacked, choose `dist/`.
3. Firefox 128+: `about:debugging`, This Firefox, Load Temporary Add-on, choose `dist/manifest.json`.

The content script runs on `http://` and `https://` only. A `file://` copy of the fixture will not badge.

Fixture server, from the repo root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/fixtures/page.html`.

## What to look at on every open panel

- A small icon sits on the corner of the table. Hover it: the tooltip says “Open this table. Drag to move.”, and the table blinks so you can see which one the icon belongs to. Drag stays inside the table. Scrolling does not slide the icon; it keeps its spot and moves with the table. A click still opens the panel. The page table is still there after Close.
- The count reads `N of M`. `M` is the body rows in the snapshot. `N` drops while a search is active.
- Click a heading to sort. Click again to reverse. Shift-click a second heading to add a sort.
- The type chip on a heading cycles auto, number, date, text. Empty cells and values that do not match the column type stay at the bottom in both directions.
- The search box placeholder follows the browser language (`Find in this table` in English). A one-character typo in a word still matches. A substitution in a short token can miss. See the fuzzy notes below.
- Copy as and Save as are split buttons. The label is the remembered default (Copy as Markdown, Save as CSV until you pick another). Clicking the label does that default. Clicking the opener lists Markdown and CSV; picking one makes it the default and does it. Both use the filtered, sorted view. Tick `Export all rows` to ignore the search. Sort still applies. CSV on the clipboard has no BOM. Save as CSV starts with the BOM.
- Words in the icon, panel, popup, options, and toolbar follow the browser language. English, German, and Czech are included. Any other language uses English.
- Drag across cells, then Cmd-C or Ctrl-C. The paste is tab-separated cells from the selection.
- Escape, the scrim, and Close all dismiss the panel.
- Ignore this table removes the icon. The toolbar popup still lists that table with Show.
- Drag the title bar. The panel moves and stays inside the window. Drag the corner, the left or right edge, or the bottom edge. The panel resizes, the grid still scrolls, and Close still works.
- Narrow the window to about 390px wide. The panel stays on screen and Close still works.

Popup (toolbar icon, top frame only): lists badged tables, a line when some layout tables were left alone, Ignore this page, Ignore followed by the host (port included), Ignore followed by the domain and its subdomains, and Ignore or Show on each table. Right-click the page and choose `Open in ilovetables` to open the table under the pointer, including one the score skipped or a page that is ignored.

Options: formula guard, CSV separator (comma, or semicolon labeled Excel (EU)), fuzzy on or off, and Stop ignoring for a table, page, subdomain, or domain.

## 1. Large table of links

<https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes>

The country table is a real data table whose cells are mostly links (flag, name, code). A header is what makes it data. Navboxes and other layout tables on the same article should stay quiet.

Last check: the page had several `<table>` elements and one icon, on the country list. The panel read `273 of 273`. Scrolling the panel painted a window of rows, not all 273 at once.

1. One icon on the main country table. No icon on the article navboxes.
2. Open it. The count matches the country rows you can see in the article, header excluded.
3. Scroll inside the panel. Rows come and go. The count stays on the full list.
4. Search `germny`. Germany remains. Clear the search and the full count returns.
5. Click a code column. Alpha-3 codes sort as text (`ABW` before `AFG` before `DEU`).
6. Copy the filtered view and paste into a text editor. You get a header line plus the visible rows, columns separated by tabs.
7. Open Save as and choose Markdown. The file is a GitHub-flavored table. A numeric-looking column is right-aligned (`---:`). Copy as Markdown puts the same Markdown on the clipboard. The label then stays on the format you picked.
8. Close. The Wikipedia table is unchanged. Scroll the article. The icon stays on the table and scrolls with the page. It does not pin to the screen, and it does not slide to the viewport edge.

## 2. Thousands separators and missing values

<https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)_per_capita>

US-style grouping (`158,733`) and `N/a` in the same column. The IMF column is the clean one. World Bank cells often look like `288,002 (2024)`. A trailing year in parentheses does not parse as a number.

1. Icon on the main ranking table.
2. Open it. If the IMF chip says text, click it until it says number.
3. Sort that column ascending. Luxembourg’s `158,733` ranks above the United States’ `94,430`. `1,000` would rank above `999` if both were present. The comma is a thousands separator.
4. `N/a`, em dashes, and blank cells sit at the bottom. Sort descending. Those same cells stay at the bottom. Monaco’s IMF cell is one of them.
5. Sort descending and check the top. Liechtenstein (`226,809`) is above Luxembourg. The sort is numeric, so `226,809` beats `158,733`.
6. Search `luxmbrg`. Luxembourg remains.
7. Save as CSV, with the default comma separator. Open in a spreadsheet. `158733` is a number, not the text `158,733`. Cells that were `N/a` stay text. Copy as CSV pastes the same rows.

## 3. European grouping

<https://de.wikipedia.org/wiki/Liste_der_deutschen_Bundesl%C3%A4nder_nach_Bruttoinlandsprodukt>

German Wikipedia writes grouping with a dot and decimals with a comma.

On the per-capita table, Hamburg is `90.208`. One dot and exactly three digits is a thousands separator, so the value is 90208. Sort that column descending and Hamburg stays first.

On the “BIP in Mrd. €” table the total row is `4.469,909`. Both separators are present and the comma is last, so this is 4469.909. Sort that column ascending and the Deutschland total is the smallest value.

A single comma and exactly three digits is also treated as thousands. `909,411` (Nordrhein-Westfalen, Mrd. €) sorts as 909411, not as the German decimal 909.411. That is the current rule. A pass is: `4.469,909` sorts as about 4,470, `90.208` sorts as 90208, and `909,411` sorts as 909411.

`20,3 %` parses as 20.3. The percent sign is stripped, and a comma followed by one digit is the decimal mark.

Set the CSV separator to semicolon before exporting this page if you will open the file in a European Excel.

## 4. Short article tables

<https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table>

Last check: two tables, two icons. The larger example opened as `7 of 7`, and every row was painted.

1. An icon on each example table in the article.
2. Open one. The count matches the example, header excluded.
3. Sort a column both ways. The order matches the cell text.
4. Close from the button and, on a second open, with Escape.

## 5. Spanned cells

<https://en.wikipedia.org/wiki/Periodic_table>

The element grid uses `colspan` and `rowspan` (the f-block gap, group labels, and the lanthanide and actinide rows).

1. An icon on the element grid.
2. Open it. The grid is rectangular. A label that spans several columns is repeated in each column it covers. A label that spans several rows is repeated in each row it covers.
3. If the first rows are group numbers and the element symbols start lower, raise the header-row control until the headings are the group labels and the first body row is an element period.
4. Sort is then by that body. The original Wikipedia table is untouched.

The fixture table `#span` is the known-answer version of this case. See case 10.

## 6. Sortable HTML table

<https://www.w3.org/WAI/ARIA/apg/example-index/table/sortable-table.html>

Students in “WAI-ARIA 101”: First Name, Last Name, Company, Address, Favorite Number. The Address column is not sortable on the page itself. The extension sorts whatever column you click.

1. An icon on the students table.
2. Sort Favorite Number. Order is numeric (`2` before `10`).
3. Sort Last Name. Order is alphabetic and ignores case.
4. Shift-click Favorite Number after Last Name. Rows stay grouped by name, and the number breaks ties.
5. Search `Acm`. Both Acme rows remain.

## 7. A table that is not a `<table>`

<https://www.w3.org/WAI/ARIA/apg/example-index/table/table.html>

The student list is a `<div role="table">` with `role="row"`, `role="columnheader"`, and `role="cell"`. The rows are Fred Jackson, Sara James, Ralph Jefferson, and Nancy Jensen, companies Acme, Inc. and XYZ, Inc.

1. An icon on that grid, even though there is no `<table>`.
2. The panel shows four body rows: Fred, Sara, Ralph, Nancy.
3. Search `Acem`. Fred and Sara remain (Acme). `Axme` does not match. The default fuzzy rules allow a transposition, and a substitution needs the looser second pass, which is used for longer tokens such as `Compxny` matching `Company`.
4. Sort Company. The two Acme rows sit together.

## 8. ARIA grid, currency, and dates that are not ISO

<https://www.w3.org/WAI/ARIA/apg/example-index/grid/dataGrids.html>

Three transaction grids. Example 2 is sortable on the page and contains dates like `01-Jan-16` and amounts like `$1,000,000.00` and `$250.00`.

1. An icon on each transaction grid that has column headers and real rows.
2. Open example 2. Sort Amount. `$250.00` comes before `$1,000,000.00`. The dollar sign and the comma are not part of the numeric value.
3. The Date column stays text on auto. `01-Jan-16` is not an ISO date, so it sorts alphabetically. Click the type chip to date and it still sorts as text, because the parser only accepts `YYYY-MM-DD`.
4. Editing a description on the page does not by itself rewrite the open panel. Click Refresh and the new description is in the snapshot.

## 9. Grids that are layout

<https://www.w3.org/WAI/ARIA/apg/example-index/grid/LayoutGrids.html>

These grids group links and other widgets (navigation, recipients, search results). They are the case the score should usually skip.

1. A grid with no header row whose cells are a single link each gets no icon.
2. A grid that does expose column headers can still get an icon. Links in a headed grid are cell values.
3. Right-click a skipped grid and choose `Open in ilovetables`. The panel opens with whatever cells are in the DOM.
4. The same skip rule is on Wikipedia: article navboxes have no icon, while the headed country table does.

## 10. Known answers on the fixture

`http://127.0.0.1:8765/fixtures/page.html`

Icons belong on `#data`, `#span`, `#inputs`, `#thfirst`, `#outer`, `#inner`, `#grid`, `#shadow-table`, `#guess`, `#plain`, and `#bulk`.

`#guess` has no `<th>`, but Name and Amount sit above numbers. The panel uses that first row as the header and does not show “First row is the column names”. `#plain` is names and colors. The detector leaves the header at 0 and shows that checkbox. Tick it: Ann and red become the column names, and Bo and Cy stay as the body. Untick it and Ann is a row again.

No icon on `#nav` (inside `<nav>`), `#links` (no header, every cell is one link), `#empty` (most cells blank), or `#present` (`role="presentation"`).

### Numbers, dates, formulas (`#data`)

| Name | Amount | When |
| --- | --- | --- |
| Acme Corp | 9 | 2024-01-02 |
| Bee | 10 | 2024-03-04 |
| Cee | 1,200 | 03/04/2024 |
| (blank) | €1.50 | 2024-02-31 |
| Dee | 1.234,56 | 2024-05-06 |
| Formula | =1+1 | @cmd |

1. Sort Amount ascending. First body row is `€1.50` (1.5), then 9, 10, 1200, then `1.234,56` (1234.56). The blank name and `=1+1` sit at the bottom.
2. Sort Amount descending. First body row is Dee, `1.234,56`. `€1.50` is the smallest parsed number. `=1+1` stays at the bottom.
3. Sort When. ISO dates order as dates: 2024-01-02, 2024-03-04, 2024-05-06. `03/04/2024` and `2024-02-31` stay at the bottom. Forcing the column to date does not parse those two.
4. Search `Acem Corp`. Only Acme Corp remains. The count reads `1 of 6`.
5. Save as CSV, formula guard on. The file bytes start with EF BB BF. The formula cell is `'=1+1` and the date cell `@cmd` is `'@cmd`. A leading `-` is quoted only when it is not a negative number. Rows use CRLF. Copy as CSV is the same text without the BOM.
6. Tick Export all rows while the search is still `Acem Corp` and export again. All six body rows are in the file, in the current sort.

### Spans, line breaks, footer (`#span`)

Two header rows. The panel default uses both. Body is three rows: `Left / 1 / Line` plus a newline plus `Two`; `Left / 3 / 4` (`Left` repeated from the rowspan); `Foot / 5 / 6`.

### Form controls and an image (`#inputs`)

The snapshot reads input and textarea values, the selected option (`Oslo`, not `Rome`), and the image alt plus the visible text (`flag Oslo`).

### Nested tables

`#outer` and `#inner` each have their own icon. The outer cell keeps the words `Keep` and `Stay`. It does not flatten the inner grid into that cell. Opening the inner icon shows `I1`, `I2`, then `X Y` and `Z W`.

### ARIA grid with a declared length (`#grid`)

Two body rows are in the DOM (Ann, Bo) and `aria-rowcount` is 40. The panel count follows the loaded rows. The note mentions the declared length. Qty sorts numerically, 2 then 3.

### Open shadow DOM

`#shadow-table` is inside the open shadow root of `#shadow-host`. It has an icon. The panel shows Inside/1 and Root/2.

### Rows added after load (`#bulk`)

The script inserts 40 rows. The icon appears without a reload. Click Add a row. The panel stays on the old count until Refresh, then it reads 41.

## Popup, options, and the page itself

Run these on the fixture, then spot-check the popup on the ISO 3166 page.

1. Toolbar popup lists the badged tables on the top frame. Hidden tables show Show. A layout table that was skipped is mentioned in one line, not offered as the main list.
2. Ignore this table on `#data`. That icon is gone. The other fixture icons stay. Show in the popup brings it back. The options page lists that table under Ignored.
3. Ignore this page from the popup. Icons on the fixture URL disappear. Stop ignoring brings them back. Ignore the domain `127.0.0.1` and its subdomains. Icons on that host disappear. Stop ignoring on the options page brings them back.
4. Open automatically, on the panel, then reload. The same table opens once. A second table on the page does not pop open over it.
5. After any of the above, view source or inspect `#data`. The extension has not replaced the `<table>`.

## Leave these alone

These are outside v1. A pass is that the extension does not pretend to extract them.

- A div or flex “table” with no `role="table"`, `role="grid"`, or `role="treegrid"`. No icon.
- A canvas, a PDF, or a picture of a table. No icon.
- A closed shadow root. No icon, and the right-click entry cannot see those nodes.
- A virtualized grid. The panel contains the rows currently in the DOM. It does not scroll the page to collect the rest. When `aria-rowcount` is larger, the note says so. Case 10’s `#grid` is the check.
- Another origin inside an iframe. The content script still runs in that frame, so an icon can appear there. The toolbar popup lists the top frame only. Use the right-click menu inside the frame to open it.
- Non-ISO dates such as `01-Jan-16` and `03/04/2024`. They stay text. See cases 8 and 10.
