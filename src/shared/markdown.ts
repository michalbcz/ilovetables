import type { ColumnKind } from "./values.ts"

export function toMarkdown(
  headers: string[],
  rows: string[][],
  kinds: ColumnKind[],
): string {
  const head = headers.map(markdownCell)
  const rule = headers.map((_, index) => (kinds[index] === "number" ? "---:" : "---"))
  const body = rows.map((row) => headers.map((_, index) => markdownCell(row[index] ?? "")))
  return [head, rule, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n")
}

function markdownCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>")
}
