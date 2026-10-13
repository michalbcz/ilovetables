import { fillIconButton } from "../shared/icons.ts"
import { catalogs, t, uiLanguage, type MessageKey } from "../shared/i18n.ts"
import { addIgnore, matchingPageRules, pageUrl, registrableDomain, removeIgnore, type IgnoreRule } from "../shared/ignore.ts"
import type { ListResponse } from "../shared/messages.ts"
import { loadSettings, saveSettings } from "../shared/settings.ts"

const ext = globalThis.chrome ?? (globalThis as unknown as { browser: typeof chrome }).browser
const appRoot = document.querySelector("#app")
if (!(appRoot instanceof HTMLElement)) throw new Error("Missing popup root")
const app: HTMLElement = appRoot

document.documentElement.lang = uiLanguage()
document.title = t("extName")
void render()

async function render() {
  app.replaceChildren()
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true })
  if (tab?.id == null) {
    app.append(p(t("pageClosed")))
    return
  }
  let listed: ListResponse | undefined
  try {
    listed = await ext.tabs.sendMessage(tab.id, { type: "list" })
  } catch {
    listed = undefined
  }
  if (!listed?.ok) {
    app.append(p(t("pageClosed")))
    return
  }

  const head = document.createElement("div")
  head.className = "head"
  const title = document.createElement("strong")
  title.textContent = t("panelTitle")
  head.append(title)
  app.append(head)

  const settings = await loadSettings()
  const href = tab.url ?? ""
  const address = { href, host: listed.host }
  const covered = href ? matchingPageRules(settings.ignores, address) : []
  if (covered.length > 0) {
    for (const rule of covered) app.append(ignoreRow(rule, tab.id))
    return
  }
  if (href) {
    const actions = document.createElement("div")
    actions.className = "actions"
    let hostname = listed.host
    try {
      hostname = new URL(href).hostname
    } catch {
      hostname = listed.host.replace(/:\d+$/, "")
    }
    actions.append(
      ignoreButton(t("ignorePage"), { scope: "url", target: pageUrl(href) }, tab.id),
      ignoreButton(t("ignoreHost", { host: listed.host }), { scope: "host", target: listed.host }, tab.id),
      ignoreButton(
        t("ignoreDomain", { domain: registrableDomain(hostname) }),
        { scope: "domain", target: registrableDomain(hostname) },
        tab.id,
      ),
    )
    app.append(actions)
  }
  if (listed.tables.length === 0) {
    const reason = listed.notes.length
      ? `${listed.notes.map(reasonText).join(" ")} `
      : `${t("noTables")} `
    app.append(p(`${reason}${t("openAnyway")}`))
    return
  }
  if (listed.notes.length) app.append(p(t("layoutLeft")))

  const list = document.createElement("ul")
  for (const table of listed.tables) {
    const item = document.createElement("li")
    const open = document.createElement("button")
    open.type = "button"
    open.className = "row"
    fillIconButton(
      open,
      "table",
      table.ignored ? `${table.label}  ${t("hidden")}` : `${table.label}  ${table.rows}×${table.cols}`,
    )
    open.addEventListener("click", async () => {
      await ext.tabs.sendMessage(tab.id!, { type: "open", id: table.id })
      window.close()
    })
    item.append(open)
    const toggle = document.createElement("button")
    toggle.type = "button"
    fillIconButton(toggle, table.ignored ? "show" : "ignore", table.ignored ? t("show") : t("ignore"))
    toggle.addEventListener("click", async () => {
      await ext.tabs.sendMessage(tab.id!, {
        type: table.ignored ? "unignore" : "ignore",
        id: table.id,
      })
      await render()
    })
    item.append(toggle)
    list.append(item)
  }
  app.append(list)
}

function ignoreButton(label: string, rule: IgnoreRule, tabId: number): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  fillIconButton(button, "ignore", label)
  button.addEventListener("click", async () => {
    const settings = await loadSettings()
    await saveSettings({ ...settings, ignores: addIgnore(settings.ignores, rule) })
    await ext.tabs.sendMessage(tabId, { type: "rescan" }).catch(() => undefined)
    await render()
  })
  return button
}

function ignoreRow(rule: IgnoreRule, tabId: number): HTMLElement {
  const row = document.createElement("div")
  row.className = "actions"
  const note = p(
    rule.scope === "url" ? t("ignoredPage") : rule.scope === "host" ? t("ignoredHost") : t("ignoredDomain"),
  )
  const stop = document.createElement("button")
  stop.type = "button"
  fillIconButton(stop, "show", `${t("stopIgnoring")}: ${rule.target}`)
  stop.addEventListener("click", async () => {
    const settings = await loadSettings()
    await saveSettings({ ...settings, ignores: removeIgnore(settings.ignores, rule) })
    await ext.tabs.sendMessage(tabId, { type: "rescan" }).catch(() => undefined)
    await render()
  })
  row.append(note, stop)
  return row
}

function reasonText(code: string): string {
  const key = `reason.${code}`
  if (Object.prototype.hasOwnProperty.call(catalogs.en, key)) return t(key as MessageKey)
  return code
}

function p(text: string): HTMLParagraphElement {
  const node = document.createElement("p")
  node.textContent = text
  return node
}
