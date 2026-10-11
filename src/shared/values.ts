export type ColumnKind = "text" | "number" | "date"

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/[\s\u00a0\u202f]/g, "")
  if (!s) return null
  s = s.replace(/[€$£¥₹%]/g, "")
  let sign = 1
  if (s.startsWith("(") && s.endsWith(")")) {
    sign = -1
    s = s.slice(1, -1)
  }
  if (s.startsWith("+")) s = s.slice(1)
  if (s.startsWith("-")) {
    sign = -1
    s = s.slice(1)
  }
  if (!/^[\d.,]+$/.test(s)) return null

  const lastDot = s.lastIndexOf(".")
  const lastComma = s.lastIndexOf(",")
  let normalized: string
  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSep = lastDot > lastComma ? "." : ","
    const thousandSep = decimalSep === "." ? "," : "."
    normalized = s.split(thousandSep).join("").replace(decimalSep, ".")
  } else if (lastComma !== -1) {
    normalized = normalizeSingle(s, ",")
  } else if (lastDot !== -1) {
    normalized = normalizeSingle(s, ".")
  } else {
    normalized = s
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized) * sign
  return Number.isFinite(value) ? value : null
}

function normalizeSingle(value: string, sep: "." | ","): string {
  const parts = value.split(sep)
  if (parts.length > 2 && parts.slice(1).every((part) => part.length === 3)) {
    return parts.join("")
  }
  if (parts.length === 2 && parts[1]?.length === 3) return parts.join("")
  if (parts.length === 2) return `${parts[0]}.${parts[1]}`
  return value
}

/** ISO dates only. Ambiguous day/month strings stay text. */
export function parseDate(raw: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(
    raw.trim(),
  )
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4] ?? 0)
  const minute = Number(match[5] ?? 0)
  const second = Number(match[6] ?? 0)
  const stamp = Date.UTC(year, month - 1, day, hour, minute, second)
  const check = new Date(stamp)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return stamp
}

export function inferKind(values: string[]): ColumnKind {
  const nonempty = values.map((value) => value.trim()).filter(Boolean)
  if (nonempty.length === 0) return "text"
  const numbers = nonempty.filter((value) => parseNumber(value) != null).length
  if (numbers / nonempty.length >= 0.8) return "number"
  const dates = nonempty.filter((value) => parseDate(value) != null).length
  if (dates / nonempty.length >= 0.8) return "date"
  return "text"
}

/**
 * Blank cells and values that do not match the column type sort last.
 * TanStack inverts a normal comparator for descending sorts, so these
 * values are returned as undefined and paired with sortUndefined: "last".
 */
export function sortValue(value: string, kind: ColumnKind): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (kind === "number" && parseNumber(trimmed) == null) return undefined
  if (kind === "date" && parseDate(trimmed) == null) return undefined
  return value
}

/** Empty cells sort last. Caller must not invert this for descending sorts. */
export function compareCells(a: string, b: string, kind: ColumnKind): number {
  const aEmpty = a.trim() === ""
  const bEmpty = b.trim() === ""
  if (aEmpty || bEmpty) {
    if (aEmpty && bEmpty) return 0
    return aEmpty ? 1 : -1
  }
  if (kind === "number") {
    const left = parseNumber(a)
    const right = parseNumber(b)
    if (left == null && right == null) return collator.compare(a, b)
    if (left == null) return 1
    if (right == null) return -1
    return left - right
  }
  if (kind === "date") {
    const left = parseDate(a)
    const right = parseDate(b)
    if (left == null && right == null) return collator.compare(a, b)
    if (left == null) return 1
    if (right == null) return -1
    return left - right
  }
  return collator.compare(a, b)
}
