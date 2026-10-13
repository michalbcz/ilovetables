import {
  applyHeader,
  dataTableReason,
  extractRoleGrid,
  extractTable,
  tableKey,
  type RawTable,
} from "../shared/extract.ts"
import { matchingPageRules } from "../shared/ignore.ts"
import { t } from "../shared/i18n.ts"
import type { ListResponse, TableSummary, ToContent } from "../shared/messages.ts"
import {
  loadMemory,
  loadSettings,
  saveMemory,
  type Settings,
  type TableMemory,
} from "../shared/settings.ts"
import { installTheme, mountPanel } from "./panel.ts"

const HOST_ID = "ilovetables-root"
const TABLE_SELECTOR = "table, [role='grid'], [role='table'], [role='treegrid']"

type Entry = {
  id: string
  element: Element
  raw: RawTable
  key: string
  button: HTMLButtonElement
  /** Position inside the table, from its top-left. Ignored until moved. */
  dx: number
  dy: number
  moved: boolean
}

let settings: Settings = {
  formulaGuard: true,
  separator: ",",
  fuzzy: true,
  disabledHosts: [],
  ignores: [],
  copyAs: "markdown",
  saveAs: "csv",
}
let memory: Record<string, TableMemory> = {}
let entries: Entry[] = []
let hidden: Entry[] = []
let notes: string[] = []
let nextId = 1
let closePanel: (() => void) | null = null
let lastTarget: Element | null = null
let shadow: ShadowRoot | null = null
let observer: MutationObserver | null = null
let scanTimer = 0
const watchedShadows = new WeakSet<ShadowRoot>()
const autoOpened = new Set<string>()
const badgeEntry = new WeakMap<HTMLButtonElement, Entry>()
let tip: HTMLDivElement | null = null
let halo: HTMLDivElement | null = null
let hoverButton: HTMLButtonElement | null = null

void boot()

async function boot() {
  if (!document.documentElement) return
  settings = await loadSettings()
  memory = await loadMemory(location.host)
  shadow = ensureShadow()
  document.addEventListener(
    "contextmenu",
    (event) => {
      lastTarget = event.target instanceof Element ? event.target : null
    },
    true,
  )
  window.addEventListener("resize", schedulePlace)
  window.addEventListener("pageshow", schedulePlace)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedulePlace()
  })
  window.addEventListener("scroll", scheduleHover, true)
  const ext = extensionApis()
  ext?.storage.onChanged.addListener(() => {
    void reloadSettings()
  })
  ext?.runtime.onMessage.addListener((message: ToContent, _sender, sendResponse) => {
    void handle(message).then(sendResponse)
    return true
  })
  observer = new MutationObserver((records) => {
    if (!records.some(recordMightMatter)) return
    window.clearTimeout(scanTimer)
    scanTimer = window.setTimeout(scan, 150)
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  scan()
}

async function reloadSettings() {
  settings = await loadSettings()
  memory = await loadMemory(location.host)
  scan()
}

function extensionApis() {
  const root = globalThis as unknown as {
    chrome?: typeof chrome
    browser?: typeof chrome
  }
  return root.chrome ?? root.browser
}

function ensureShadow(): ShadowRoot {
  let host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement("div")
    host.id = HOST_ID
    document.documentElement.append(host)
  }
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" })
  if (!root.querySelector("style")) installTheme(root)
  halo = knownDiv(root, "halo")
  tip = knownDiv(root, "tip")
  tip.setAttribute("role", "tooltip")
  return root
}

function knownDiv(root: ShadowRoot, className: string): HTMLDivElement {
  const found = root.querySelector(`.${className}`)
  if (found instanceof HTMLDivElement) return found
  const node = document.createElement("div")
  node.className = className
  node.hidden = true
  root.append(node)
  return node
}

function disabled(): boolean {
  return matchingPageRules(settings.ignores, { href: location.href, host: location.host }).length > 0
}

function scan() {
  if (!shadow) return
  if (disabled()) {
    clearEntries()
    notes = []
    return
  }
  const seen = new Set<Element>()
  const next: Entry[] = []
  const nextHidden: Entry[] = []
  const reasons = new Set<string>()
  for (const element of collect(document)) {
    if (seen.has(element)) continue
    seen.add(element)
    const raw = readElement(element)
    if (!raw) {
      reasons.add("no-cells")
      continue
    }
    const reason = dataTableReason(element, raw)
    if (reason) {
      reasons.add(reason)
      continue
    }
    const key = tableKey(raw)
    const previous = [...entries, ...hidden].find((entry) => entry.element === element)
    const entry: Entry = previous ?? {
      id: `t${nextId++}`,
      element,
      raw,
      key,
      button: makeBadge(),
      dx: 0,
      dy: 0,
      moved: false,
    }
    entry.raw = raw
    entry.key = key
    badgeEntry.set(entry.button, entry)
    entry.button.setAttribute("aria-label", t("badgeTip"))
    if (memory[key]?.ignored) {
      entry.button.remove()
      nextHidden.push(entry)
      continue
    }
    if (!entry.button.isConnected) shadow.append(entry.button)
    next.push(entry)
  }
  for (const entry of entries) {
    if (!next.includes(entry)) entry.button.remove()
  }
  entries = next
  hidden = nextHidden
  notes = [...reasons]
  schedulePlace()
  maybeAutoOpen()
}

function readElement(element: Element): RawTable | null {
  return element.tagName === "TABLE" ? extractTable(element) : extractRoleGrid(element)
}

function collect(root: ParentNode): Element[] {
  if (root instanceof ShadowRoot && observer && !watchedShadows.has(root)) {
    watchedShadows.add(root)
    observer.observe(root, { childList: true, subtree: true })
  }
  const found: Element[] = []
  const nodes = root.querySelectorAll?.(TABLE_SELECTOR)
  nodes?.forEach((node) => {
    if (!(node instanceof Element)) return
    if (node.tagName !== "TABLE" && node.closest("table")) return
    found.push(node)
  })
  root.querySelectorAll?.("*").forEach((node) => {
    if (!(node instanceof Element) || node.id === HOST_ID || !node.shadowRoot) return
    found.push(...collect(node.shadowRoot))
  })
  return found
}

function makeBadge(): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "badge"
  // A hidden tab defers layout. Stay invisible until placeBadge has a real table box.
  button.hidden = true
  button.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1.2 1.2h11.6v11.6H1.2z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.2 5h11.6M1.2 9h11.6M5 1.2v11.6M9 1.2v11.6" stroke="currentColor" stroke-width="1.2"/></svg>'
  let drag: { x: number; y: number; left: number; top: number; moved: boolean } | null = null
  let suppressUntil = 0
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return
    const box = button.getBoundingClientRect()
    drag = {
      x: event.clientX,
      y: event.clientY,
      left: box.left + window.scrollX,
      top: box.top + window.scrollY,
      moved: false,
    }
    try {
      button.setPointerCapture(event.pointerId)
    } catch {
      /* A synthetic event cannot capture the pointer. Window listeners still drag. */
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
  })
  const onMove = (event: PointerEvent) => {
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    drag.moved = true
    button.classList.add("dragging")
    hideHover()
    const entry = badgeEntry.get(button)
    const page = entry ? tablePageBox(entry.element) : null
    if (!page) return
    const spot = clampInside(page, drag.left + dx, drag.top + dy)
    button.hidden = false
    button.style.left = `${spot.left}px`
    button.style.top = `${spot.top}px`
  }
  const endDrag = (event: PointerEvent) => {
    if (!drag) return
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", endDrag)
    window.removeEventListener("pointercancel", endDrag)
    const moved = drag.moved
    drag = null
    button.classList.remove("dragging")
    if (!moved) return
    suppressUntil = event.timeStamp + 400
    const entry = badgeEntry.get(button)
    const box = entry ? tablePageBox(entry.element) : null
    if (entry && box) {
      entry.moved = true
      entry.dx = (parseFloat(button.style.left) || 0) - box.left
      entry.dy = (parseFloat(button.style.top) || 0) - box.top
    }
  }
  button.addEventListener("click", (event) => {
    if (event.timeStamp < suppressUntil) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const entry = badgeEntry.get(button)
    if (entry) openEntry(entry)
  })
  button.addEventListener("pointerenter", () => showHover(button))
  button.addEventListener("pointerleave", () => {
    if (!button.classList.contains("dragging")) hideHover()
  })
  return button
}

function showHover(button: HTMLButtonElement) {
  if (button.classList.contains("dragging") || button.hidden) return
  hoverButton = button
  const entry = badgeEntry.get(button)
  if (tip) {
    tip.hidden = false
    tip.textContent = t("badgeTip")
    placeTip(button)
  }
  if (entry) placeHalo(entry.element)
}

function hideHover() {
  hoverButton = null
  if (tip) tip.hidden = true
  if (halo) halo.hidden = true
}

function placeTip(button: HTMLButtonElement) {
  if (!tip || tip.hidden) return
  tip.style.left = "0px"
  tip.style.top = "0px"
  const rect = button.getBoundingClientRect()
  const width = tip.offsetWidth
  const height = tip.offsetHeight
  let left = rect.left + rect.width / 2 - width / 2
  let top = rect.bottom + 6
  if (top + height > window.innerHeight - 4) top = Math.max(4, rect.top - height - 6)
  left = clamp(left, 4, Math.max(4, window.innerWidth - width - 4))
  tip.style.left = `${left}px`
  tip.style.top = `${top}px`
}

function placeHalo(element: Element) {
  if (!halo) return
  const rect = element.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) {
    halo.hidden = true
    return
  }
  halo.hidden = false
  halo.style.left = `${rect.left}px`
  halo.style.top = `${rect.top}px`
  halo.style.width = `${rect.width}px`
  halo.style.height = `${rect.height}px`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const ICON = 22

let placeQueued = false
function schedulePlace() {
  // Measuring while the document is hidden can report the origin. Place on the next visible frame.
  if (document.hidden) return
  if (placeQueued) return
  placeQueued = true
  requestAnimationFrame(() => {
    placeQueued = false
    if (document.hidden) return
    for (const entry of entries) placeBadge(entry)
  })
}

function scheduleHover() {
  if (!hoverButton || hoverButton.classList.contains("dragging")) return
  const entry = badgeEntry.get(hoverButton)
  if (entry) placeHalo(entry.element)
  placeTip(hoverButton)
}

function tablePageBox(element: Element): { left: number; top: number; width: number; height: number } | null {
  const rect = element.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
  }
}

/** Keep the whole icon inside the table. A table smaller than the icon uses its top-left. */
function clampInside(
  box: { left: number; top: number; width: number; height: number },
  left: number,
  top: number,
): { left: number; top: number } {
  const maxLeft = box.left + Math.max(0, box.width - ICON)
  const maxTop = box.top + Math.max(0, box.height - ICON)
  return {
    left: clamp(left, box.left, maxLeft),
    top: clamp(top, box.top, maxTop),
  }
}

function placeBadge(entry: Entry) {
  const button = entry.button
  if (button.classList.contains("dragging")) return
  const box = tablePageBox(entry.element)
  if (!box) {
    button.hidden = true
    if (hoverButton === button) hideHover()
    return
  }
  const dx = entry.moved ? entry.dx : Math.max(0, box.width - ICON - 6)
  const dy = entry.moved ? entry.dy : Math.min(6, Math.max(0, box.height - ICON))
  const spot = clampInside(box, box.left + dx, box.top + dy)
  button.hidden = false
  button.style.left = `${spot.left}px`
  button.style.top = `${spot.top}px`
}

function clearEntries() {
  closePanel?.()
  closePanel = null
  for (const entry of [...entries, ...hidden]) entry.button.remove()
  entries = []
  hidden = []
}

function maybeAutoOpen() {
  if (closePanel) return
  for (const entry of entries) {
    if (!memory[entry.key]?.autoOpen || autoOpened.has(entry.key)) continue
    autoOpened.add(entry.key)
    openEntry(entry)
    return
  }
}

function openEntry(entry: Entry) {
  if (!shadow) return
  closePanel?.()
  const key = entry.key
  const stored = memory[key] ?? {}
  closePanel = mountPanel(shadow, {
    raw: entry.raw,
    element: entry.element,
    fingerprint: key,
    memory: stored,
    getSettings: () => settings,
    reread: () => {
      if (!entry.element.isConnected) return null
      const raw = readElement(entry.element)
      if (!raw) return null
      entry.raw = raw
      return raw
    },
    onMemory: (next) => {
      memory = { ...memory, [key]: next }
      void saveMemory(location.host, memory)
      if (next.ignored) scan()
    },
    onClose: () => {
      const cleanup = closePanel
      closePanel = null
      cleanup?.()
      if (entry.button.isConnected) entry.button.focus()
    },
  })
}

function openFromTarget(target: Element | null) {
  if (!target || !shadow) return
  const table = target.closest("table")
  const grid = target.closest("[role='grid'], [role='table'], [role='treegrid']")
  const element = table ?? grid
  if (!element) return
  const raw = readElement(element)
  if (!raw || raw.matrix.length === 0 || (raw.matrix[0]?.length ?? 0) < 1) return
  const key = tableKey(raw)
  const existing = [...entries, ...hidden].find((entry) => entry.element === element)
  const entry: Entry = existing ?? {
    id: `t${nextId++}`,
    element,
    raw,
    key,
    button: makeBadge(),
    dx: 0,
    dy: 0,
    moved: false,
  }
  entry.raw = raw
  entry.key = key
  openEntry(entry)
}

function findEntry(id: string): Entry | undefined {
  return entries.find((entry) => entry.id === id) ?? hidden.find((entry) => entry.id === id)
}

function summary(entry: Entry, ignored: boolean): TableSummary {
  const shaped = applyHeader(entry.raw, memory[entry.key]?.headerRows ?? entry.raw.suggestedHeaderRows)
  return {
    id: entry.id,
    label: shaped.headers
      .slice(0, 3)
      .map((header, index) =>
        header === `Column ${index + 1}` ? t("columnFallback", { n: String(index + 1) }) : header,
      )
      .join(", "),
    rows: shaped.body.length,
    cols: shaped.headers.length,
    ignored,
  }
}

async function handle(message: ToContent): Promise<ListResponse | { ok: true } | undefined> {
  if (message.type === "rescan") {
    await reloadSettings()
    return { ok: true }
  }
  if (message.type === "open-context") {
    openFromTarget(lastTarget)
    return { ok: true }
  }
  if (message.type === "open") {
    const entry = findEntry(message.id)
    if (entry) openEntry(entry)
    return { ok: true }
  }
  if (message.type === "ignore") {
    const entry = findEntry(message.id)
    if (entry) {
      memory = { ...memory, [entry.key]: { ...memory[entry.key], ignored: true } }
      await saveMemory(location.host, memory)
      scan()
    }
    return { ok: true }
  }
  if (message.type === "unignore") {
    const entry = findEntry(message.id)
    if (entry) {
      memory = { ...memory, [entry.key]: { ...memory[entry.key], ignored: false } }
      await saveMemory(location.host, memory)
      scan()
    }
    return { ok: true }
  }
  if (message.type === "list") {
    const response: ListResponse = {
      ok: true,
      host: location.host,
      disabled: disabled(),
      tables: [
        ...entries.map((entry) => summary(entry, false)),
        ...hidden.map((entry) => summary(entry, true)),
      ],
      notes,
    }
    return response
  }
  return undefined
}

function recordMightMatter(record: MutationRecord): boolean {
  const host = document.getElementById(HOST_ID)
  const target = record.target
  if (
    host &&
    target instanceof Node &&
    (target === host || host.contains(target) || host.shadowRoot?.contains(target))
  ) {
    return false
  }
  const interesting = (node: Node) => {
    if (!(node instanceof Element) || node === host || host?.contains(node)) return false
    return Boolean(node.matches(TABLE_SELECTOR) || node.querySelector(TABLE_SELECTOR) || node.shadowRoot)
  }
  return [...record.addedNodes, ...record.removedNodes].some(interesting)
}
