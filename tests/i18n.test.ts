import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { catalogs, translate, type MessageKey } from "../src/shared/i18n.ts"

test("german and czech have every english string", () => {
  const keys = Object.keys(catalogs.en) as MessageKey[]
  for (const key of keys) {
    assert.ok(catalogs.de[key], key)
    assert.ok(catalogs.cs[key], key)
    assert.notEqual(catalogs.de[key], "")
    assert.notEqual(catalogs.cs[key], "")
  }
})

test("the browser language picks the catalog, and anything else is english", () => {
  assert.equal(translate("de-AT", "close"), "Schließen")
  assert.equal(translate("cs", "close"), "Zavřít")
  assert.equal(translate("fr-FR", "close"), "Close")
  assert.equal(translate("en-US", "count", { shown: "2", total: "9" }), "2 of 9")
  assert.equal(translate("de", "count", { shown: "2", total: "9" }), "2 von 9")
  assert.equal(translate("cs", "copyAs", { format: "CSV" }), "Kopírovat jako CSV")
  assert.equal(translate("de", "saveAs", { format: "Markdown" }), "Speichern als Markdown")
  assert.equal(translate("en", "badgeTip"), "Open this table. Drag to move.")
})

test("manifest locales match the in-page catalog", () => {
  for (const lang of ["en", "de", "cs"] as const) {
    const file = JSON.parse(
      readFileSync(new URL(`../_locales/${lang}/messages.json`, import.meta.url), "utf8"),
    ) as Record<string, { message?: string }>
    for (const key of ["extName", "extDescription", "actionTitle"] as const) {
      assert.equal(file[key]?.message, catalogs[lang][key])
    }
  }
})
