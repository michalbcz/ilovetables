export function toTsv(rows: string[][]): string {
  return rows.map((row) => row.map(tsvCell).join("\t")).join("\n")
}

function tsvCell(value: string): string {
  if (/[\t\n\r"]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toHtmlTable(rows: string[][]): string {
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("")
  return `<table>${body}</table>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
