import assert from "node:assert/strict"
import test from "node:test"
import { toHtmlTable, toTsv } from "../src/shared/clipboard.ts"
import { toCsv } from "../src/shared/csv.ts"
import { matchRows } from "../src/shared/filter.ts"
import { toMarkdown } from "../src/shared/markdown.ts"

const csvOptions = { separator: "," as const, formulaGuard: true }

test("csv quotes commas, quotes, and newlines, and starts with a BOM", () => {
  const csv = toCsv(
    ["Name", "Note"],
    [
      ["Ada", 'say "hi"'],
      ["Bea, Bo", "line\nnext"],
    ],
    csvOptions,
  )
  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.ok(csv.includes("\r\n"))
  assert.ok(csv.includes('"say ""hi"""'))
  assert.ok(csv.includes('"Bea, Bo"'))
  assert.ok(csv.includes('"line\nnext"'))
})

test("formula guard prefixes triggers and leaves real negatives numeric", () => {
  const csv = toCsv(["Value"], [["=1+1"], ["@cmd"], ["-12"], ["-cmd"], ["+1"]], csvOptions)
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n")
  assert.deepEqual(lines, ["Value", "'=1+1", "'@cmd", "-12", "'-cmd", "'+1"])
})

test("semicolon is the Excel EU separator", () => {
  const csv = toCsv(["A", "B"], [["1", "2;5"]], { separator: ";", formulaGuard: true, bom: false })
  assert.equal(csv, "A;B\r\n1;\"2;5\"")
})

test("markdown escapes pipes, keeps newlines as br, and aligns numbers", () => {
  const md = toMarkdown(
    ["Name", "Amount"],
    [["a|b", "1"], ["c\nd", "2"]],
    ["text", "number"],
  )
  assert.equal(
    md,
    ["| Name | Amount |", "| --- | ---: |", "| a\\|b | 1 |", "| c<br>d | 2 |"].join("\n"),
  )
})

test("tsv quotes tabs and html escapes cells", () => {
  assert.equal(toTsv([["a\tb", "c"]]), "\"a\tb\"\tc")
  assert.equal(toHtmlTable([["a<b", "c"]]), "<table><tr><td>a&lt;b</td><td>c</td></tr></table>")
})

test("a middle-character typo matches and a different string does not", () => {
  const haystack = ["Company", "Acme Corp", "Other Industries"]
  assert.deepEqual(matchRows(haystack, "Compxny", true), [0])
  assert.deepEqual(matchRows(haystack, "Acem Corp", true), [1])
  assert.deepEqual(matchRows(haystack, "Zebra", true), [])
  assert.equal(matchRows(haystack, "   ", true), null)
  assert.deepEqual(matchRows(haystack, "company", false), [0])
})
