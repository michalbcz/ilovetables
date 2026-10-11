import { parseNumber } from "./values.ts"

export type CsvOptions = {
  separator: "," | ";"
  formulaGuard: boolean
  bom?: boolean
}

function needsFormulaGuard(value: string): boolean {
  if (!value) return false
  const first = value[0]
  if (first === "=" || first === "+" || first === "@" || first === "\t" || first === "\r") {
    return true
  }
  return first === "-" && parseNumber(value) == null
}

function csvCell(value: string, separator: string, formulaGuard: boolean): string {
  let cell = value
  if (formulaGuard && needsFormulaGuard(cell)) cell = `'${cell}`
  if (
    cell.includes('"') ||
    cell.includes(separator) ||
    cell.includes("\n") ||
    cell.includes("\r")
  ) {
    return `"${cell.replace(/"/g, '""')}"`
  }
  return cell
}

export function toCsv(headers: string[], rows: string[][], options: CsvOptions): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => csvCell(cell, options.separator, options.formulaGuard)).join(options.separator),
  )
  const body = lines.join("\r\n")
  return options.bom === false ? body : `\uFEFF${body}`
}
