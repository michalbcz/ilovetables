import { catalogs, t, uiLanguage, type MessageKey } from "../shared/i18n.ts"
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

  const pause = document.createElement("button")
  pause.type = "button"
  pause.textContent = listed.disabled ? t("resumeSite") : t("pauseSite")
  pause.addEventListener("click", async () => {
    const settings = await loadSettings()
    const hosts = new Set(settings.disabledHosts)
    if (hosts.has(listed.host)) hosts.delete(listed.host)
    else hosts.add(listed.host)
    await saveSettings({ ...settings, disabledHosts: [...hosts] })
    await ext.tabs.sendMessage(tab.id!, { type: "rescan" }).catch(() => undefined)
    await render()
  })
  app.append(pause)

  if (listed.disabled) {
    app.append(p(t("pausedHere")))
    return
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
    open.textContent = table.ignored
      ? `${table.label}  ${t("hidden")}`
      : `${table.label}  ${table.rows}×${table.cols}`
    open.addEventListener("click", async () => {
      await ext.tabs.sendMessage(tab.id!, { type: "open", id: table.id })
      window.close()
    })
    item.append(open)
    if (table.ignored) {
      const show = document.createElement("button")
      show.type = "button"
      show.textContent = t("show")
      show.addEventListener("click", async () => {
        await ext.tabs.sendMessage(tab.id!, { type: "unignore", id: table.id })
        await render()
      })
      item.append(show)
    }
    list.append(item)
  }
  app.append(list)
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
