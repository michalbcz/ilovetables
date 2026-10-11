import { parseDate, parseNumber } from "./values.ts"

export type SkipReason =
  | "layout-role"
  | "layout-chrome"
  | "too-small"
  | "no-body"
  | "too-small-no-header"
  | "mostly-empty"
  | "link-grid"
  | "no-cells"

export type RawTable = {
  matrix: string[][]
  suggestedHeaderRows: number
  kind: "table" | "grid"
  /** aria-rowcount when the widget admits it is only showing some rows. */
  declaredRows?: number
}

export function cellText(cell: Element): string {
  const parts: string[] = []
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? "")
      return
    }
    if (node.nodeType !== 1) return
    const element = node as Element
    if (element !== cell && element.tagName === "TABLE") return
    const tag = element.tagName
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return
    if (tag === "INPUT" || tag === "TEXTAREA") {
      parts.push((element as HTMLInputElement).value ?? "")
      return
    }
    if (tag === "SELECT") {
      const selected =
        element.querySelector("option[selected]") ?? element.querySelector("option")
      parts.push((selected?.textContent ?? "").trim())
      return
    }
    if (tag === "IMG") {
      parts.push(element.getAttribute("alt") ?? "")
      return
    }
    if (tag === "BR") parts.push("\n")
    for (const child of element.childNodes) walk(child)
  }
  walk(cell)
  return parts
    .join("")
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

function spanOf(cell: Element, axis: "col" | "row"): number {
  const prop = axis === "col" ? "colSpan" : "rowSpan"
  const fromProp = (cell as unknown as Record<string, unknown>)[prop]
  if (typeof fromProp === "number" && fromProp > 0) return fromProp
  const attr = cell.getAttribute(axis === "col" ? "colspan" : "rowspan")
  const n = attr ? Number(attr) : 1
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

export function directRows(table: Element): Element[] {
  const rows: Element[] = []
  const walk = (parent: Element) => {
    for (const child of parent.children) {
      const tag = child.tagName
      if (tag === "TR") rows.push(child)
      else if (tag === "THEAD" || tag === "TBODY" || tag === "TFOOT") walk(child)
    }
  }
  walk(table)
  return rows
}

function rowCells(row: Element): Element[] {
  return [...row.children].filter(
    (child) => child.tagName === "TD" || child.tagName === "TH",
  )
}

export function extractTable(table: Element): RawTable {
  const rows = directRows(table)
  const occupied: boolean[][] = []
  const grid: string[][] = []

  rows.forEach((row, r) => {
    let c = 0
    for (const cell of rowCells(row)) {
      while (occupied[r]?.[c]) c += 1
      const text = cellText(cell)
      const rowSpan = spanOf(cell, "row")
      const colSpan = spanOf(cell, "col")
      for (let dr = 0; dr < rowSpan; dr += 1) {
        for (let dc = 0; dc < colSpan; dc += 1) {
          const rr = r + dr
          const cc = c + dc
          occupied[rr] ??= []
          grid[rr] ??= []
          occupied[rr][cc] = true
          grid[rr][cc] = text
        }
      }
      c += colSpan
    }
  })

  const width = grid.reduce((max, row) => Math.max(max, row.length), 0)
  const matrix = grid.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  )
  return {
    matrix,
    suggestedHeaderRows: headerRowCount(table, matrix),
    kind: "table",
  }
}

function headerRowCount(table: Element, matrix: string[][]): number {
  if (matrix.length < 2) return 0
  const thead = [...table.children].find((child) => child.tagName === "THEAD")
  if (thead) {
    const count = directRows(thead).length
    if (count > 0) return Math.min(count, matrix.length - 1)
  }
  const first = directRows(table)[0]
  if (first && rowCells(first).every((cell) => cell.tagName === "TH")) return 1
  return guessHeaderRows(matrix)
}

function isValue(text: string): boolean {
  const trimmed = text.trim()
  return trimmed !== "" && (parseNumber(trimmed) != null || parseDate(trimmed) != null)
}

/**
 * 1 when the first row looks like column names above numbers or dates.
 * A weak signal stays 0 so the panel can ask instead of hiding a data row.
 */
export function guessHeaderRows(matrix: string[][]): 0 | 1 {
  if (matrix.length < 3) return 0
  const width = matrix[0]?.length ?? 0
  if (width < 2) return 0
  const header = matrix[0] ?? []
  const body = matrix.slice(1)
  let votes = 0
  let considered = 0
  for (let column = 0; column < width; column += 1) {
    const label = header[column]?.trim() ?? ""
    const samples = body.map((row) => row[column]?.trim() ?? "").filter(Boolean)
    if (!label || samples.length < 2) continue
    considered += 1
    if (isValue(label)) continue
    const values = samples.filter((sample) => isValue(sample)).length
    if (values / samples.length >= 0.6) votes += 1
  }
  if (votes === 0 || considered === 0) return 0
  if (votes >= 2 || votes / considered >= 0.5) return 1
  const labels = header.map((cell) => cell.trim()).filter(Boolean)
  const allShortLabels =
    labels.length >= 2 &&
    labels.every((label) => !isValue(label) && /^\S+$/.test(label) && label.length <= 40)
  return allShortLabels ? 1 : 0
}

export function extractRoleGrid(root: Element): RawTable | null {
  const rowEls = [...root.querySelectorAll("[role='row']")].filter((row) => {
    const owner = row.closest("[role='grid'], [role='table'], [role='treegrid']")
    return owner === root
  })
  if (rowEls.length < 2) return null

  const matrix = rowEls.map((row) => {
    const cells = [...row.children].filter((child) =>
      /^(cell|gridcell|columnheader|rowheader)$/.test(child.getAttribute("role") ?? ""),
    )
    const nested = cells.length
      ? cells
      : [...row.querySelectorAll("[role='cell'], [role='gridcell'], [role='columnheader'], [role='rowheader']")].filter(
          (cell) => cell.parentElement === row || cell.closest("[role='row']") === row,
        )
    return nested.map((cell) => cellText(cell))
  })

  const width = matrix.reduce((max, row) => Math.max(max, row.length), 0)
  if (width < 2) return null
  const rectangular = matrix.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  )
  const firstIsHeader = rowEls[0]?.querySelector("[role='columnheader']")
  const declared = Number(root.getAttribute("aria-rowcount"))
  return {
    matrix: rectangular,
    suggestedHeaderRows: firstIsHeader ? 1 : guessHeaderRows(rectangular),
    kind: "grid",
    declaredRows:
      Number.isFinite(declared) && declared > rectangular.length ? declared : undefined,
  }
}

export function applyHeader(
  raw: RawTable,
  headerRows: number,
): { headers: string[]; body: string[][] } {
  const width = raw.matrix[0]?.length ?? 0
  const count = Math.max(0, Math.min(headerRows, Math.max(0, raw.matrix.length - 1)))
  const headers = Array.from({ length: width }, (_, column) => {
    const parts: string[] = []
    for (let row = 0; row < count; row += 1) {
      const text = raw.matrix[row]?.[column]?.trim()
      if (text) parts.push(text)
    }
    return parts.join(" / ") || `Column ${column + 1}`
  })
  const body = raw.matrix.slice(count).map((row) =>
    Array.from({ length: width }, (_, column) => row[column] ?? ""),
  )
  return { headers, body }
}

export function ownCells(table: Element): Element[] {
  const cells: Element[] = []
  for (const row of directRows(table)) {
    for (const cell of rowCells(row)) cells.push(cell)
  }
  return cells
}

/** Share of this table's own cells whose entire text is a single link. */
export function linkRatio(table: Element): number {
  const cells =
    table.tagName === "TABLE"
      ? ownCells(table)
      : [...table.querySelectorAll("[role='cell'], [role='gridcell'], [role='columnheader']")].filter(
          (cell) => cell.closest("[role='grid'], [role='table'], [role='treegrid']") === table,
        )
  if (cells.length === 0) return 0
  let links = 0
  for (const cell of cells) {
    const anchors = [...cell.querySelectorAll("a")].filter(
      (anchor) => anchor.closest("table") === table || !anchor.closest("table"),
    )
    if (anchors.length !== 1) continue
    const text = cellText(cell)
    const linkText = cellText(anchors[0]).replace(/\n/g, " ")
    if (text && text.replace(/\n/g, " ") === linkText) links += 1
  }
  return links / cells.length
}

const LAYOUT_HOME = "nav, footer, [role='navigation'], [role='contentinfo']"

function insideLayoutChrome(element: Element): boolean {
  let current: Element | null = element
  while (current) {
    if (current.closest(LAYOUT_HOME)) return true
    const root: Node = current.getRootNode()
    current = root.nodeType === 11 && "host" in root ? (root as ShadowRoot).host : null
  }
  return false
}

/** Null means the element is a data table. A code is why it was skipped. */
export function dataTableReason(table: Element, raw: RawTable): SkipReason | null {
  const role = table.getAttribute("role")
  if (role === "presentation" || role === "none") return "layout-role"
  if (insideLayoutChrome(table)) return "layout-chrome"
  const cols = raw.matrix[0]?.length ?? 0
  const rows = raw.matrix.length
  if (cols < 2 || rows < 2) return "too-small"
  if (rows - raw.suggestedHeaderRows < 1) return "no-body"
  if (raw.suggestedHeaderRows === 0 && rows < 3) return "too-small-no-header"
  const cells = raw.matrix.flat()
  const empty = cells.filter((cell) => cell.trim() === "").length
  if (cells.length > 0 && empty / cells.length > 0.8) return "mostly-empty"
  // A real header means the links are cell values, as on Wikipedia. A link
  // grid with no header is a menu.
  if (raw.suggestedHeaderRows === 0 && linkRatio(table) > 0.8) return "link-grid"
  return null
}

export function isDataTable(table: Element, raw: RawTable): boolean {
  return dataTableReason(table, raw) == null
}

export function fingerprint(headers: string[], cols: number): string {
  return `${cols}|${headers.join("\u001f")}`
}

/** Stable across header-row overrides. Those overrides are stored under this key. */
export function tableKey(raw: RawTable): string {
  const shaped = applyHeader(raw, raw.suggestedHeaderRows)
  return fingerprint(shaped.headers, shaped.headers.length)
}
