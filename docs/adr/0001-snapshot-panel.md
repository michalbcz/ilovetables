# 0001. Snapshot the table instead of taking it over

- Status: accepted
- Date: 2026-10-11

## Context

A person looking at a page wants to sort, filter, and export a table without losing the page the site actually rendered. Early options included rewriting that table in place, asking a model to interpret it, or handing it to a spreadsheet product.

This record was written when the ADR log started. The choices below are already how the extension works.

## Decision

Keep the host table. Read it into a string matrix and open a read-only snapshot in the extension’s shadow tree. Sort, fuzzy search, and export run on that copy. Refresh reads the DOM again.

Find tables with deterministic rules: real `<table>` elements and `role="table"|"grid"|"treegrid"`, then drop layout chrome. Parse numbers and ISO dates in code. Export CSV and Markdown locally. Use TanStack Table and Virtual for the grid mechanics, and uFuzzy for fuzzy match. Do not adopt a UI framework or a full grid product.

## Alternatives

- Rewrite or replace the host table. Rejected. The site’s table, listeners, and layout would change under the user, and a later site update would fight the extension.
- Detect or interpret tables with an in-browser model. Rejected. The result would not be deterministic, and the content script would carry a model for a job rules already do.
- Export XLSX, or upload the table to convert it. Rejected. The useful outputs are CSV and Markdown, and the table must not leave the browser.
- Build the panel on a spreadsheet or data-grid library. Rejected. Those libraries own rendering, theming, and often editing, and they blow the content-script size budget. The panel only needs sort, a window of rows, and export.
- Scroll a virtualized page to collect every row. Rejected. The snapshot is what the page has loaded. When the page declares a larger row count, the panel says so.

## Consequences

The content script is the product surface. Popup and options only list tables and change local settings. The original page stays intact, closed shadow roots stay invisible, and a table that has not loaded its rows cannot be invented. New export formats, network calls, or a model in the detection path need a new ADR.
