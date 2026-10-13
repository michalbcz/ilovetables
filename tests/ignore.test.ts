import assert from "node:assert/strict"
import test from "node:test"
import {
  addIgnore,
  labelFromTableKey,
  matchingPageRules,
  pageUrl,
  parseIgnores,
  registrableDomain,
  removeIgnore,
  type IgnoreRule,
} from "../src/shared/ignore.ts"
import { defaultSettings, loadSettings, normalizeSettings, saveSettings } from "../src/shared/settings.ts"

test("a page url drops the hash and keeps the query", () => {
  assert.equal(
    pageUrl("https://en.wikipedia.org/wiki/A?b=1#section"),
    "https://en.wikipedia.org/wiki/A?b=1",
  )
})

test("a registrable domain keeps a public suffix and one label", () => {
  assert.equal(registrableDomain("en.wikipedia.org"), "wikipedia.org")
  assert.equal(registrableDomain("wikipedia.org"), "wikipedia.org")
  assert.equal(registrableDomain("blog.example.co.uk"), "example.co.uk")
  assert.equal(registrableDomain("example.co.uk"), "example.co.uk")
  assert.equal(registrableDomain("127.0.0.1"), "127.0.0.1")
  assert.equal(registrableDomain("localhost"), "localhost")
})

test("page, host, and domain rules match only their own scope", () => {
  const rules: IgnoreRule[] = [
    { scope: "url", target: "https://en.wikipedia.org/wiki/A" },
    { scope: "host", target: "de.wikipedia.org" },
    { scope: "domain", target: "example.com" },
  ]
  const wiki = { href: "https://en.wikipedia.org/wiki/A#top", host: "en.wikipedia.org" }
  assert.deepEqual(
    matchingPageRules(rules, wiki).map((rule) => rule.scope),
    ["url"],
  )
  assert.deepEqual(
    matchingPageRules(rules, { href: "https://en.wikipedia.org/wiki/B", host: "en.wikipedia.org" }),
    [],
  )
  assert.equal(
    matchingPageRules(rules, { href: "https://de.wikipedia.org/wiki/A", host: "de.wikipedia.org" })[0]
      ?.scope,
    "host",
  )
  assert.deepEqual(
    matchingPageRules(rules, { href: "https://fr.wikipedia.org/wiki/A", host: "fr.wikipedia.org" }),
    [],
  )
  assert.equal(
    matchingPageRules(rules, { href: "https://blog.example.com/x", host: "blog.example.com" })[0]
      ?.scope,
    "domain",
  )
  assert.equal(
    matchingPageRules(rules, { href: "https://example.com/x", host: "example.com" })[0]?.scope,
    "domain",
  )
})

test("a host rule does not cover a sibling subdomain", () => {
  const rules: IgnoreRule[] = [{ scope: "host", target: "blog.example.com" }]
  assert.equal(
    matchingPageRules(rules, { href: "https://www.example.com/", host: "www.example.com" }).length,
    0,
  )
  assert.equal(
    matchingPageRules(rules, { href: "https://blog.example.com/a", host: "blog.example.com" }).length,
    1,
  )
})

test("paused hosts from older settings become host rules", () => {
  const rules = parseIgnores([{ scope: "url", target: "https://example.com/a" }, { scope: "nope" }], [
    "example.com",
    "example.com",
  ])
  assert.deepEqual(rules, [
    { scope: "url", target: "https://example.com/a" },
    { scope: "host", target: "example.com" },
  ])
  assert.deepEqual(removeIgnore(addIgnore(rules, rules[1]!), rules[0]!), [
    { scope: "host", target: "example.com" },
  ])
})

test("removing a host rule does not restore it from the mirror", async () => {
  const saved: Record<string, unknown> = {}
  const previous = (globalThis as { chrome?: unknown }).chrome
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: {
          get: async (key: string | null) => (key == null ? { ...saved } : { [key]: saved[key] }),
          set: async (items: Record<string, unknown>) => {
            Object.assign(saved, items)
          },
        },
      },
    },
  })
  try {
    await saveSettings({
      ...defaultSettings,
      ignores: [{ scope: "host", target: "127.0.0.1:8765" }],
    })
    const loaded = await loadSettings()
    await saveSettings({ ...loaded, ignores: removeIgnore(loaded.ignores, loaded.ignores[0]!) })
    const again = await loadSettings()
    assert.deepEqual(again.ignores, [])
    assert.deepEqual(again.disabledHosts, [])

    saved.settings = {
      formulaGuard: true,
      separator: ",",
      fuzzy: true,
      disabledHosts: ["example.com"],
      copyAs: "markdown",
      saveAs: "csv",
    }
    assert.deepEqual((await loadSettings()).ignores, [{ scope: "host", target: "example.com" }])

    saved.settings = { ...defaultSettings, ignores: [], disabledHosts: ["example.com"] }
    const explicit = await loadSettings()
    assert.deepEqual(explicit.ignores, [])
    assert.deepEqual(explicit.disabledHosts, [])
  } finally {
    if (previous === undefined) delete (globalThis as { chrome?: unknown }).chrome
    else Object.assign(globalThis, { chrome: previous })
  }
})

test("a save mirrors host rules and does not fold them back", () => {
  const saved = normalizeSettings(
    {
      ...defaultSettings,
      ignores: [{ scope: "domain", target: "example.com" }],
      disabledHosts: ["stale.example.com"],
    },
    false,
  )
  assert.deepEqual(saved.ignores, [{ scope: "domain", target: "example.com" }])
  assert.deepEqual(saved.disabledHosts, [])
})

test("a table fingerprint shows its headers", () => {
  assert.equal(labelFromTableKey("3|Name\u001fAmount\u001fWhen"), "Name, Amount, When")
})
