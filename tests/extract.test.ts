import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { parseHTML } from "linkedom"
import {
  applyHeader,
  dataTableReason,
  extractRoleGrid,
  extractTable,
  fingerprint,
  guessHeaderRows,
  isDataTable,
  tableKey,
} from "../src/shared/extract.ts"

const { document } = parseHTML(readFileSync(new URL("../fixtures/page.html", import.meta.url), "utf8"))

function table(id: string): Element {
  const node = document.querySelector(`#${id}`)
  assert.ok(node)
  return node
}

test("colspan, rowspan, thead, and tfoot become a rectangle", () => {
  const raw = extractTable(table("span"))
  assert.deepEqual(raw.matrix, [
    ["Pair", "Pair", "Extra"],
    ["A", "B", "C"],
    ["Left", "1", "Line\nTwo"],
    ["Left", "3", "4"],
    ["Foot", "5", "6"],
  ])
  assert.equal(raw.suggestedHeaderRows, 2)
  const shaped = applyHeader(raw, 2)
  assert.deepEqual(shaped.headers, ["Pair / A", "Pair / B", "Extra / C"])
  assert.equal(shaped.body.length, 3)
  const overridden = applyHeader(raw, 0)
  assert.notEqual(tableKey(raw), fingerprint(overridden.headers, overridden.headers.length))
})

test("a first row of names above numbers is the header", () => {
  const { document: page } = parseHTML(
    `<table id="guess"><tr><td>Name</td><td>Amount</td></tr><tr><td>Ann</td><td>10</td></tr><tr><td>Bo</td><td>3</td></tr></table>
     <table id="plain"><tr><td>Ann</td><td>red</td></tr><tr><td>Bo</td><td>blue</td></tr><tr><td>Cy</td><td>green</td></tr></table>
     <table id="mixed"><tr><td>Alice</td><td>see note</td><td>hello</td></tr><tr><td>Bob</td><td>12</td><td>world</td></tr><tr><td>Cara</td><td>15</td><td>there</td></tr></table>`,
  )
  const guess = page.querySelector("#guess")
  const plain = page.querySelector("#plain")
  const mixed = page.querySelector("#mixed")
  assert.ok(guess && plain && mixed)
  assert.equal(guessHeaderRows(extractTable(guess).matrix), 1)
  assert.equal(extractTable(guess).suggestedHeaderRows, 1)
  assert.equal(extractTable(plain).suggestedHeaderRows, 0)
  assert.equal(isDataTable(plain, extractTable(plain)), true)
  assert.equal(guessHeaderRows(extractTable(mixed).matrix), 0)
})

test("a th-only first row is the header", () => {
  const raw = extractTable(table("thfirst"))
  assert.equal(raw.suggestedHeaderRows, 1)
  assert.equal(isDataTable(table("thfirst"), raw), true)
})

test("inputs, selects, textareas, images, and line breaks", () => {
  const raw = extractTable(table("inputs"))
  assert.deepEqual(raw.matrix, [
    ["Name", "Qty", "City"],
    ["Ada", "9", "Oslo"],
    ["Note", "10", "flag Oslo"],
  ])
})

test("a nested table stays its own grid", () => {
  const outer = extractTable(table("outer"))
  const inner = extractTable(table("inner"))
  assert.deepEqual(outer.matrix, [
    ["H1", "H2"],
    ["Keep", "Stay"],
    ["More", "Rows"],
  ])
  assert.deepEqual(inner.matrix[1], ["X", "Y"])
  assert.equal(isDataTable(table("outer"), outer), true)
  assert.equal(isDataTable(table("inner"), inner), true)
})

test("layout tables stay off and a data table stays on", () => {
  const data = extractTable(table("data"))
  assert.equal(dataTableReason(table("data"), data), null)
  assert.equal(dataTableReason(table("nav"), extractTable(table("nav"))), "layout-chrome")
  assert.equal(dataTableReason(table("links"), extractTable(table("links"))), "link-grid")
  assert.equal(dataTableReason(table("empty"), extractTable(table("empty"))), "mostly-empty")
  assert.equal(dataTableReason(table("present"), extractTable(table("present"))), "layout-role")
})

test("a headed table of links is data, and a headerless link grid is not", () => {
  const { document: linked } = parseHTML(
    `<table id="t"><thead><tr><th>Name</th><th>Code</th></tr></thead><tbody><tr><td><a>Alpha</a></td><td><a>AA</a></td></tr><tr><td><a>Beta</a></td><td><a>BB</a></td></tr><tr><td><a>Gamma</a></td><td><a>GG</a></td></tr></tbody></table>`,
  )
  const node = linked.querySelector("#t")
  assert.ok(node)
  assert.equal(dataTableReason(node, extractTable(node)), null)
  assert.equal(
    dataTableReason(table("links"), extractTable(table("links"))),
    "link-grid",
  )
})

test("role=grid reads rows, headers, and aria-rowcount", () => {
  const raw = extractRoleGrid(table("grid"))
  assert.ok(raw)
  assert.equal(raw.suggestedHeaderRows, 1)
  assert.equal(raw.declaredRows, 40)
  assert.deepEqual(applyHeader(raw, 1).body, [
    ["Ann", "2"],
    ["Bo", "3"],
  ])
  assert.equal(isDataTable(table("grid"), raw), true)
})
