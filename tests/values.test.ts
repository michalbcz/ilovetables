import assert from "node:assert/strict"
import test from "node:test"
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  type TableOptionsResolved,
  type TableState,
} from "@tanstack/table-core"
import { compareCells, inferKind, parseDate, parseNumber, sortValue, type ColumnKind } from "../src/shared/values.ts"

test("numbers: integers, thousands, currency, and European decimals", () => {
  assert.equal(parseNumber("9"), 9)
  assert.equal(parseNumber("10"), 10)
  assert.equal(parseNumber("1,200"), 1200)
  assert.equal(parseNumber("€1.50"), 1.5)
  assert.equal(parseNumber("1.234,56"), 1234.56)
  assert.equal(parseNumber("1.234"), 1234)
  assert.equal(parseNumber("-12"), -12)
  assert.equal(parseNumber("(12)"), -12)
})

test("only real ISO dates parse", () => {
  assert.equal(typeof parseDate("2024-03-04"), "number")
  assert.equal(typeof parseDate("2024-03-04T12:30:00"), "number")
  assert.equal(parseDate("03/04/2024"), null)
  assert.equal(parseDate("2024-02-31"), null)
})

test("column kind needs most of the cells to agree", () => {
  assert.equal(inferKind(["9", "10", "1,200", "€1.50", "1.234,56"]), "number")
  assert.equal(inferKind(["2024-01-02", "2024-03-04", "2024-05-06", "2024-06-07"]), "date")
  assert.equal(inferKind(["2024-01-02", "03/04/2024", "2024-02-31"]), "text")
})

test("empty cells and unparsed values sort last in both directions", () => {
  const asc = sorted(["10", "=1+1", "9", "", "1,200"], false, "number")
  const desc = sorted(["10", "=1+1", "9", "", "1,200"], true, "number")
  assert.deepEqual(asc.slice(0, 3), ["9", "10", "1,200"])
  assert.deepEqual(desc.slice(0, 3), ["1,200", "10", "9"])
  assert.deepEqual(new Set(asc.slice(3)), new Set(["", "=1+1"]))
  assert.deepEqual(new Set(desc.slice(3)), new Set(["", "=1+1"]))
  assert.ok(compareCells("9", "10", "number") < 0)
})

function sorted(values: string[], desc: boolean, kind: ColumnKind): string[] {
  const data = values.map((value, index) => ({ id: String(index), cells: [value] }))
  let sorting = [{ id: "0", desc }]
  const state = { sorting } as TableState
  const table = createTable({
    data,
    columns: [
      {
        id: "0",
        header: "Value",
        accessorFn: (row: { cells: string[] }) => sortValue(row.cells[0] ?? "", kind),
        sortUndefined: "last" as const,
        sortingFn: (a, b, id) => compareCells(String(a.getValue(id) ?? ""), String(b.getValue(id) ?? ""), kind),
      },
    ],
    state,
    onStateChange: (updater) => {
      sorting = (typeof updater === "function" ? updater(state) : updater).sorting ?? []
    },
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  } as unknown as TableOptionsResolved<{ id: string; cells: string[] }>)
  return table.getRowModel().rows.map((row) => row.original.cells[0] ?? "")
}
