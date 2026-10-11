import { t, uiLanguage } from "../shared/i18n.ts"
import { loadSettings, saveSettings, type Settings } from "../shared/settings.ts"

const ext = globalThis.chrome ?? (globalThis as unknown as { browser: typeof chrome }).browser
const form = document.querySelector("form")
if (!(form instanceof HTMLFormElement)) throw new Error("Missing options form")

const formula = required<HTMLInputElement>("#formula")
const separator = required<HTMLSelectElement>("#separator")
const fuzzy = required<HTMLInputElement>("#fuzzy")
const hosts = required<HTMLElement>("#hosts")

document.documentElement.lang = uiLanguage()
document.title = t("extName")
const heading = document.querySelector("h1")
if (heading) heading.textContent = t("panelTitle")
const lead = document.querySelector(".lead")
if (lead) lead.textContent = t("optionsLead")
const formulaLabel = document.querySelector("#formula-label")
if (formulaLabel) formulaLabel.textContent = t("formula")
const separatorLabel = document.querySelector("#separator-label")
if (separatorLabel) separatorLabel.textContent = t("separator")
const comma = document.querySelector("#separator option[value=',']")
if (comma) comma.textContent = t("comma")
const semicolon = document.querySelector("#separator option[value=';']")
if (semicolon) semicolon.textContent = t("semicolon")
const fuzzyLabel = document.querySelector("#fuzzy-label")
if (fuzzyLabel) fuzzyLabel.textContent = t("fuzzy")
const pausedHeading = document.querySelector("#paused-heading")
if (pausedHeading) pausedHeading.textContent = t("pausedSites")

function required<T extends Element>(selector: string): T {
  const node = form instanceof HTMLFormElement ? form.querySelector(selector) : null
  if (!(node instanceof Element)) throw new Error("Options controls are missing")
  return node as T
}

let current: Settings = {
  formulaGuard: true,
  separator: ",",
  fuzzy: true,
  disabledHosts: [],
  copyAs: "markdown",
  saveAs: "csv",
}

void loadSettings().then((settings) => {
  current = settings
  paint()
})

form.addEventListener("change", async () => {
  current = {
    ...current,
    formulaGuard: formula.checked,
    separator: separator.value === ";" ? ";" : ",",
    fuzzy: fuzzy.checked,
  }
  await saveSettings(current)
})

form.addEventListener("submit", (event) => event.preventDefault())

function paint() {
  formula.checked = current.formulaGuard
  separator.value = current.separator
  fuzzy.checked = current.fuzzy
  hosts.replaceChildren()
  if (current.disabledHosts.length === 0) {
    const empty = document.createElement("p")
    empty.textContent = t("noPaused")
    hosts.append(empty)
    return
  }
  for (const host of current.disabledHosts) {
    const row = document.createElement("div")
    row.className = "host"
    const name = document.createElement("span")
    name.textContent = host
    const resume = document.createElement("button")
    resume.type = "button"
    resume.textContent = t("resume")
    resume.addEventListener("click", async () => {
      current = {
        ...current,
        disabledHosts: current.disabledHosts.filter((item) => item !== host),
      }
      await saveSettings(current)
      const [tab] = await ext.tabs.query({ active: true, currentWindow: true })
      if (tab?.id != null) {
        await ext.tabs.sendMessage(tab.id, { type: "rescan" }).catch(() => undefined)
      }
      paint()
    })
    row.append(name, resume)
    hosts.append(row)
  }
}
