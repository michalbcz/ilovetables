import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type Header,
  type SortingState,
  type TableOptionsResolved,
  type TableState,
  type Updater,
} from "@tanstack/table-core"
import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "@tanstack/virtual-core"
import { toHtmlTable, toTsv } from "../shared/clipboard.ts"
import { toCsv } from "../shared/csv.ts"
import { fitPanel, resizePanel, type Box, type ResizeEdge } from "./panel-frame.ts"
import { applyHeader, type RawTable } from "../shared/extract.ts"
import { matchRows } from "../shared/filter.ts"
import { buttonLabel, fillIconButton, iconGlyph, type IconName } from "../shared/icons.ts"
import { t } from "../shared/i18n.ts"
import { toMarkdown } from "../shared/markdown.ts"
import {
  fileSlug,
  saveSettings,
  type ColumnChoice,
  type ExportFormat,
  type Settings,
  type TableMemory,
} from "../shared/settings.ts"
import { compareCells, inferKind, sortValue, type ColumnKind } from "../shared/values.ts"
import themeCss from "../theme.css"
import panelCss from "./panel.css"

type DataRow = { id: string; cells: string[] }

const CHOICES: ColumnChoice[] = ["auto", "number", "date", "text"]
const ROW_HEIGHT = 32

type SplitMenu = {
  root: HTMLElement
  close: () => void
  isOpen: () => boolean
}

export type PanelSession = {
  raw: RawTable
  element: Element
  fingerprint: string
  memory: TableMemory
  getSettings: () => Settings
  reread: () => RawTable | null
  onMemory: (next: TableMemory) => void
  onClose: () => void
}

export function mountPanel(shadow: ShadowRoot, session: PanelSession): () => void {
  let raw = session.raw
  const scrim = el("div", "scrim")
  const panel = el("div", "panel")
  panel.setAttribute("role", "dialog")
  panel.setAttribute("aria-modal", "true")
  panel.setAttribute("aria-label", t("panelTitle"))
  shadow.append(scrim, panel)

  const head = el("div", "head")
  head.title = t("dragPanel")
  const identity = el("div", "identity")
  const drag = el("span", "drag")
  drag.setAttribute("aria-hidden", "true")
  drag.innerHTML =
    '<svg width="10" height="14" viewBox="0 0 10 14"><path d="M1.5 1.5h2v2h-2zM6.5 1.5h2v2h-2zM1.5 6h2v2h-2zM6.5 6h2v2h-2zM1.5 10.5h2v2h-2zM6.5 10.5h2v2h-2z" fill="currentColor"/></svg>'
  const title = el("div", "title")
  title.textContent = t("panelTitle")
  const count = el("div", "count")
  identity.append(drag, title, count)
  const close = button(t("close"), "", "close")
  close.title = t("close")
  head.append(identity, close)
  const edgeLeft = el("div", "edge edge-w")
  const edgeRight = el("div", "edge edge-e")
  const edgeBottom = el("div", "edge edge-s")
  const grip = el("div", "grip")
  for (const handle of [edgeLeft, edgeRight, edgeBottom, grip]) {
    handle.title = t("resizePanel")
  }
  grip.setAttribute("aria-label", t("resizePanel"))

  const tools = el("div", "tools")
  const search = document.createElement("input")
  search.type = "search"
  search.placeholder = t("search")
  search.setAttribute("aria-label", t("search"))
  const headerLabel = el("label", "")
  headerLabel.append(document.createTextNode(`${t("headerRows")} `))
  const headerInput = document.createElement("input")
  headerInput.type = "number"
  headerInput.min = "0"
  headerInput.setAttribute("aria-label", t("headerRows"))
  headerLabel.append(headerInput)
  const firstRowLabel = el("label", "choice")
  const firstRowInput = document.createElement("input")
  firstRowInput.type = "checkbox"
  firstRowLabel.append(firstRowInput, document.createTextNode(t("firstRowNames")))
  let copyAs: ExportFormat = session.getSettings().copyAs
  let saveAs: ExportFormat = session.getSettings().saveAs
  const menus: SplitMenu[] = []
  const closeMenus = () => {
    for (const menu of menus) menu.close()
  }
  const copySplit = splitButton("copy")
  const saveSplit = splitButton("save")
  const refreshBtn = button(t("refresh"), "", "refresh")
  const hideBtn = button(t("hideBadge"), "", "ignore")
  const exportAllLabel = el("label", "choice")
  const exportAllInput = document.createElement("input")
  exportAllInput.type = "checkbox"
  const exportAllInfo = document.createElement("button")
  exportAllInfo.type = "button"
  exportAllInfo.className = "info"
  exportAllInfo.setAttribute("aria-label", t("exportAllTip"))
  exportAllInfo.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7 6.2V10.2M7 3.8h.01" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/></svg>'
  const exportAllHint = el("div", "tip hint")
  exportAllHint.id = "export-all-tip"
  exportAllHint.setAttribute("role", "tooltip")
  exportAllHint.textContent = t("exportAllTip")
  exportAllHint.hidden = true
  exportAllInfo.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
  })
  let exportTipHover = false
  let exportTipFocus = false
  const placeExportTip = () => {
    exportAllHint.hidden = false
    exportAllHint.style.left = "0px"
    exportAllHint.style.top = "0px"
    const anchor = exportAllInfo.getBoundingClientRect()
    const box = exportAllHint.getBoundingClientRect()
    const gap = 6
    const spaceAbove = anchor.top - gap
    const spaceBelow = window.innerHeight - anchor.bottom - gap
    let left = anchor.left + anchor.width / 2 - box.width / 2
    let top = spaceBelow >= spaceAbove ? anchor.bottom + gap : anchor.top - box.height - gap
    if (top < 4) top = 4
    if (top + box.height > window.innerHeight - 4) top = Math.max(4, window.innerHeight - box.height - 4)
    left = Math.min(Math.max(4, left), Math.max(4, window.innerWidth - box.width - 4))
    exportAllHint.style.left = `${left}px`
    exportAllHint.style.top = `${top}px`
  }
  const syncExportTip = () => {
    if (exportTipHover || exportTipFocus) placeExportTip()
    else exportAllHint.hidden = true
  }
  exportAllInfo.addEventListener("pointerenter", () => {
    exportTipHover = true
    syncExportTip()
  })
  exportAllInfo.addEventListener("pointerleave", () => {
    exportTipHover = false
    syncExportTip()
  })
  exportAllInfo.addEventListener("focus", () => {
    exportTipFocus = true
    syncExportTip()
  })
  exportAllInfo.addEventListener("blur", () => {
    exportTipFocus = false
    syncExportTip()
  })
  exportAllLabel.append(exportAllInput, document.createTextNode(t("exportAll")), exportAllInfo)
  shadow.append(exportAllHint)
  const autoLabel = el("label", "choice")
  const autoInput = document.createElement("input")
  autoInput.type = "checkbox"
  autoInput.checked = session.memory.autoOpen === true
  autoLabel.append(autoInput, document.createTextNode(t("autoOpen")))
  tools.append(
    search,
    headerLabel,
    firstRowLabel,
    copySplit.root,
    saveSplit.root,
    refreshBtn,
    hideBtn,
    exportAllLabel,
    autoLabel,
  )

  const note = el("div", "note")
  const scroller = el("div", "scroller")
  const tableEl = document.createElement("table")
  const thead = document.createElement("thead")
  const tbody = document.createElement("tbody")
  tableEl.append(thead, tbody)
  scroller.append(tableEl)
  const empty = el("div", "empty")
  empty.hidden = true
  empty.textContent = t("nothingMatches")
  const foot = el("div", "foot")
  foot.textContent = t("foot")
  panel.append(head, tools, note, scroller, empty, foot, edgeLeft, edgeRight, edgeBottom, grip)

  let memoryState: TableMemory = {
    ...session.memory,
    types: { ...session.memory.types },
  }
  let headerRows = memoryState.headerRows ?? raw.suggestedHeaderRows
  headerInput.max = String(Math.max(0, raw.matrix.length - 1))
  headerInput.value = String(headerRows)
  let choices: Record<string, ColumnChoice> = { ...memoryState.types }
  let query = ""
  let sorting: SortingState = []
  let sorted: DataRow[] = []
  let view: DataRow[] = []
  let headers: string[] = []
  let kinds: ColumnKind[] = []
  let body: string[][] = []
  let anchor: { r: number; c: number } | null = null
  let focusPos: { r: number; c: number } | null = null
  let dragging = false
  let timer = 0

  const virtualizer = new Virtualizer<HTMLElement, HTMLTableRowElement>({
    count: 0,
    getScrollElement: () => scroller,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollToFn: elementScroll,
    observeElementRect,
    observeElementOffset,
    onChange: () => paintRows(),
  })
  const stopVirtual = virtualizer._didMount()

  const persist = () => {
    memoryState = {
      ...memoryState,
      headerRows,
      types: { ...choices },
      autoOpen: autoInput.checked,
    }
    session.onMemory(memoryState)
  }

  const rebuild = () => {
    const applied = applyHeader(raw, headerRows)
    headers = applied.headers
    body = applied.body
    kinds = headers.map((_, index) => {
      const choice = choices[String(index)] ?? "auto"
      return choice === "auto" ? inferKind(body.map((row) => row[index] ?? "")) : choice
    })
    const data: DataRow[] = body.map((cells, index) => ({ id: String(index), cells }))
    const columns: ColumnDef<DataRow, unknown>[] = headers.map((header, index) => ({
      id: String(index),
      header,
      accessorFn: (row) => sortValue(row.cells[index] ?? "", kinds[index] ?? "text"),
      sortUndefined: "last" as const,
      sortingFn: (a, b, id) =>
        compareCells(String(a.getValue(id) ?? ""), String(b.getValue(id) ?? ""), kinds[index] ?? "text"),
    }))
    const state = {
      sorting,
      columnPinning: { left: [], right: [] },
    } as unknown as TableState
    const table = createTable<DataRow>({
      data,
      columns,
      state,
      onStateChange: (updater: Updater<TableState>) => {
        const next = typeof updater === "function" ? updater(state) : updater
        sorting = next.sorting ?? []
        anchor = null
        focusPos = null
        rebuild()
      },
      renderFallbackValue: null,
      enableMultiSort: true,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    } as unknown as TableOptionsResolved<DataRow>)
    sorted = table.getRowModel().rows.map((row) => row.original)
    const haystack = sorted.map((row) => row.cells.join("\n"))
    const matched = matchRows(haystack, query, session.getSettings().fuzzy)
    view = matched == null ? sorted : matched.flatMap((index) => {
      const row = sorted[index]
      return row ? [row] : []
    })
    count.textContent = t("count", {
      shown: view.length.toLocaleString(),
      total: body.length.toLocaleString(),
    })
    const loaded = raw.declaredRows
      ? t("loadedRows", {
          shown: body.length.toLocaleString(),
          total: raw.declaredRows.toLocaleString(),
        })
      : ""
    firstRowLabel.hidden = raw.suggestedHeaderRows !== 0
    firstRowInput.checked = headerRows > 0
    note.textContent = loaded
    note.hidden = note.textContent === ""
    paintHead(table.getHeaderGroups()[0]?.headers ?? [])
    virtualizer.setOptions({ ...virtualizer.options, count: view.length })
    virtualizer._willUpdate()
    paintRows()
    empty.hidden = view.length !== 0
    scroller.hidden = view.length === 0
  }

  const paintHead = (headerCells: Header<DataRow, unknown>[]) => {
    thead.replaceChildren()
    const tr = document.createElement("tr")
    headerCells.forEach((header, index) => {
      const th = document.createElement("th")
      th.scope = "col"
      if (kinds[index] === "number") th.classList.add("num")
      const sortedAs = header.column.getIsSorted()
      const mark = sortedAs === "asc" ? "▲" : sortedAs === "desc" ? "▼" : ""
      const order = sorting.length > 1 && sortedAs ? String(header.column.getSortIndex() + 1) : ""
      th.append(document.createTextNode(displayHeader(headers[index] ?? "", index)))
      const kind = button(kindLabel(choices[String(index)] ?? "auto", kinds[index] ?? "text"), "kind")
      kind.title = t("cycleType")
      kind.addEventListener("click", (event) => {
        event.stopPropagation()
        const current = choices[String(index)] ?? "auto"
        const next = CHOICES[(CHOICES.indexOf(current) + 1) % CHOICES.length] ?? "auto"
        if (next === "auto") delete choices[String(index)]
        else choices[String(index)] = next
        persist()
        rebuild()
      })
      th.append(kind)
      if (mark) {
        const sort = el("span", "sort")
        sort.textContent = ` ${mark}${order}`
        th.append(sort)
      }
      th.addEventListener("click", (event) => {
        header.column.toggleSorting(undefined, event.shiftKey)
      })
      tr.append(th)
    })
    thead.append(tr)
  }

  const paintRows = () => {
    const items = virtualizer.getVirtualItems()
    const total = virtualizer.getTotalSize()
    const padTop = items[0]?.start ?? 0
    const padBottom = items.length ? total - (items[items.length - 1]?.end ?? 0) : 0
    const cols = Math.max(1, headers.length)
    tbody.replaceChildren()
    if (padTop > 0) tbody.append(padRow(padTop, cols))
    for (const item of items) {
      const data = view[item.index]
      if (!data) continue
      const tr = document.createElement("tr")
      tr.dataset.index = String(item.index)
      tr.style.height = `${ROW_HEIGHT}px`
      data.cells.forEach((value, index) => {
        const td = document.createElement("td")
        td.dataset.c = String(index)
        td.textContent = value
        td.title = value
        if (kinds[index] === "number") td.classList.add("num")
        if (selected(item.index, index)) td.classList.add("sel")
        tr.append(td)
      })
      tbody.append(tr)
    }
    if (padBottom > 0) tbody.append(padRow(padBottom, cols))
  }

  const selected = (row: number, col: number) => {
    if (!anchor || !focusPos) return false
    const r1 = Math.min(anchor.r, focusPos.r)
    const r2 = Math.max(anchor.r, focusPos.r)
    const c1 = Math.min(anchor.c, focusPos.c)
    const c2 = Math.max(anchor.c, focusPos.c)
    return row >= r1 && row <= r2 && col >= c1 && col <= c2
  }

  tbody.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return
    const cell = (event.target as Element | null)?.closest?.("td[data-c]")
    if (!cell) return
    const row = Number((cell.parentElement as HTMLElement | null)?.dataset.index)
    const col = Number((cell as HTMLElement).dataset.c)
    if (!Number.isFinite(row) || !Number.isFinite(col)) return
    if (event.shiftKey && anchor) focusPos = { r: row, c: col }
    else {
      anchor = { r: row, c: col }
      focusPos = { r: row, c: col }
    }
    dragging = true
    paintRows()
  })

  const move = (event: PointerEvent) => {
    if (!dragging) return
    const hit = shadow.elementFromPoint(event.clientX, event.clientY)
    const cell = hit?.closest?.("td[data-c]")
    if (!cell) return
    const row = Number((cell.parentElement as HTMLElement | null)?.dataset.index)
    const col = Number((cell as HTMLElement).dataset.c)
    if (!Number.isFinite(row) || !Number.isFinite(col)) return
    focusPos = { r: row, c: col }
    paintRows()
  }
  const up = () => {
    dragging = false
  }
  window.addEventListener("pointermove", move)
  window.addEventListener("pointerup", up)

  const selectionRows = (): string[][] | null => {
    if (!anchor || !focusPos) return null
    const r1 = Math.min(anchor.r, focusPos.r)
    const r2 = Math.max(anchor.r, focusPos.r)
    const c1 = Math.min(anchor.c, focusPos.c)
    const c2 = Math.max(anchor.c, focusPos.c)
    const rows: string[][] = []
    for (let r = r1; r <= r2; r += 1) {
      const cells = view[r]?.cells ?? []
      rows.push(cells.slice(c1, c2 + 1))
    }
    return rows.length ? rows : null
  }

  const exportBody = () => (exportAllInput.checked ? sorted : view).map((row) => row.cells)
  const exportHeaders = () => headers.map((header, index) => displayHeader(header, index))
  const viewWithHeader = () => [exportHeaders(), ...exportBody()]
  const markdownText = () => toMarkdown(exportHeaders(), exportBody(), kinds)
  const csvText = (bom: boolean) => {
    const current = session.getSettings()
    return toCsv(exportHeaders(), exportBody(), {
      separator: current.separator,
      formulaGuard: current.formulaGuard,
      bom,
    })
  }

  const flash = (control: HTMLButtonElement, label: string) => {
    const slot = control.querySelector(".btn-label")
    const node = slot instanceof HTMLElement ? slot : control
    const previous = node.textContent
    node.textContent = label
    window.setTimeout(() => {
      node.textContent = previous
    }, 1200)
  }

  refreshBtn.addEventListener("click", () => {
    const next = session.reread()
    if (!next || next.matrix.length === 0) {
      note.hidden = false
      note.textContent = t("tableGone")
      return
    }
    raw = next
    headerInput.max = String(Math.max(0, raw.matrix.length - 1))
    headerRows = Math.min(headerRows, Math.max(0, raw.matrix.length - 1))
    headerInput.value = String(headerRows)
    anchor = null
    focusPos = null
    rebuild()
  })

  search.addEventListener("input", () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      query = search.value
      anchor = null
      focusPos = null
      rebuild()
    }, 90)
  })
  headerInput.addEventListener("change", () => {
    const next = Number(headerInput.value)
    if (!Number.isFinite(next)) return
    headerRows = Math.max(0, Math.min(raw.matrix.length - 1, Math.floor(next)))
    headerInput.value = String(headerRows)
    persist()
    rebuild()
  })
  firstRowInput.addEventListener("change", () => {
    headerRows = firstRowInput.checked ? 1 : 0
    headerInput.value = String(headerRows)
    persist()
    rebuild()
  })
  autoInput.addEventListener("change", persist)
  hideBtn.addEventListener("click", () => {
    memoryState = { ...memoryState, ignored: true, headerRows, types: { ...choices } }
    session.onMemory(memoryState)
    session.onClose()
  })

  const onKey = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return
    if (event.key === "Escape") {
      event.preventDefault()
      if (menus.some((menu) => menu.isOpen())) {
        closeMenus()
        return
      }
      session.onClose()
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
      if (event.target === search) return
      event.preventDefault()
      const rows = selectionRows() ?? viewWithHeader()
      void writeClipboard(rows).then(() => flash(copySplit.main, t("copied")))
    }
  }
  const onPointerDown = (event: Event) => {
    const target = event.target
    if (!(target instanceof Node)) return
    for (const menu of menus) {
      if (!menu.root.contains(target)) menu.close()
    }
  }
  shadow.addEventListener("keydown", onKey)
  shadow.addEventListener("pointerdown", onPointerDown)

  close.addEventListener("click", () => session.onClose())
  scrim.addEventListener("click", () => session.onClose())

  rebuild()
  place(panel, session.element.getBoundingClientRect())
  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight })
  const applyFrame = (box: Box) => {
    panel.style.left = `${Math.round(box.left)}px`
    panel.style.top = `${Math.round(box.top)}px`
    panel.style.width = `${Math.round(box.width)}px`
    panel.style.height = `${Math.round(box.height)}px`
  }
  const readFrame = (): Box => {
    const rect = panel.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  }
  applyFrame(fitPanel(readFrame(), viewport()))
  const onWindowResize = () => applyFrame(fitPanel(readFrame(), viewport()))
  window.addEventListener("resize", onWindowResize)
  trackPointer(head, (event) => {
    const target = event.target
    return target instanceof Element && !target.closest("button, a, input, select, textarea, label")
  }, (start, dx, dy) => {
    head.classList.add("moving")
    applyFrame(fitPanel({ ...start, left: start.left + dx, top: start.top + dy }, viewport()))
  }, () => head.classList.remove("moving"))
  const trackResize = (handle: HTMLElement, edge: ResizeEdge) => {
    trackPointer(handle, () => true, (start, dx, dy) => {
      applyFrame(resizePanel(start, dx, dy, edge, viewport()))
    })
  }
  trackResize(edgeLeft, "left")
  trackResize(edgeRight, "right")
  trackResize(edgeBottom, "bottom")
  trackResize(grip, "corner")
  search.focus()

  function splitButton(kind: "copy" | "save"): {
    root: HTMLDivElement
    main: HTMLButtonElement
  } & SplitMenu {
    const root = el("div", "split")
    const main = button("", "split-main")
    main.append(iconGlyph(kind === "copy" ? "copy" : "save"), buttonLabel(""))
    const open = button("", "split-open")
    open.setAttribute("aria-label", t("chooseFormat"))
    open.setAttribute("aria-haspopup", "menu")
    open.setAttribute("aria-expanded", "false")
    open.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7 8.5 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/></svg>'
    const menu = el("div", "menu")
    menu.hidden = true
    menu.setAttribute("role", "menu")
    const markdownItem = button(t("markdown"))
    const csvItem = button(t("csv"))
    markdownItem.setAttribute("role", "menuitem")
    csvItem.setAttribute("role", "menuitem")
    menu.append(markdownItem, csvItem)
    root.append(main, open, menu)

    const current = () => (kind === "copy" ? copyAs : saveAs)
    const paint = () => {
      const format = current()
      const name = format === "csv" ? t("csv") : t("markdown")
      const slot = main.querySelector(".btn-label")
      if (slot) slot.textContent = t(kind === "copy" ? "copyAs" : "saveAs", { format: name })
      markdownItem.setAttribute("aria-current", format === "markdown" ? "true" : "false")
      csvItem.setAttribute("aria-current", format === "csv" ? "true" : "false")
    }
    const setOpen = (next: boolean) => {
      menu.hidden = !next
      open.setAttribute("aria-expanded", next ? "true" : "false")
    }
    const close = () => setOpen(false)
    const remember = (format: ExportFormat) => {
      if (kind === "copy") copyAs = format
      else saveAs = format
      paint()
      void saveSettings({ ...session.getSettings(), copyAs, saveAs })
    }
    const run = async (format: ExportFormat) => {
      if (kind === "copy") {
        const text = format === "csv" ? csvText(false) : markdownText()
        await navigator.clipboard.writeText(text)
        flash(main, t("copied"))
        return
      }
      if (format === "csv") {
        download(`${fileSlug(document.title)}.csv`, csvText(true), "text/csv;charset=utf-8")
        return
      }
      download(`${fileSlug(document.title)}.md`, markdownText(), "text/markdown;charset=utf-8")
    }
    const choose = (format: ExportFormat) => {
      remember(format)
      closeMenus()
      void run(format)
    }

    open.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const opening = menu.hidden
      closeMenus()
      if (opening) setOpen(true)
    })
    main.addEventListener("click", () => {
      closeMenus()
      void run(current())
    })
    markdownItem.addEventListener("click", () => choose("markdown"))
    csvItem.addEventListener("click", () => choose("csv"))
    paint()
    const api = { root, main, close, isOpen: () => !menu.hidden }
    menus.push(api)
    return api
  }

  return () => {
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
    window.removeEventListener("resize", onWindowResize)
    shadow.removeEventListener("keydown", onKey)
    shadow.removeEventListener("pointerdown", onPointerDown)
    stopVirtual()
    scrim.remove()
    panel.remove()
    exportAllHint.remove()
  }

  function trackPointer(
    handle: HTMLElement,
    allow: (event: PointerEvent) => boolean,
    move: (start: Box, dx: number, dy: number) => void,
    end?: () => void,
  ) {
    let active: { id: number; x: number; y: number; box: Box } | null = null
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !allow(event)) return
      event.preventDefault()
      const rect = panel.getBoundingClientRect()
      active = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        box: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      }
      try {
        handle.setPointerCapture(event.pointerId)
      } catch {
        /* A synthetic event cannot capture the pointer. */
      }
    })
    handle.addEventListener("pointermove", (event) => {
      if (!active || event.pointerId !== active.id) return
      move(active.box, event.clientX - active.x, event.clientY - active.y)
    })
    const stop = (event: PointerEvent) => {
      if (!active || event.pointerId !== active.id) return
      active = null
      end?.()
    }
    handle.addEventListener("pointerup", stop)
    handle.addEventListener("pointercancel", stop)
  }
}

function place(panel: HTMLElement, rect: DOMRect) {
  const width = panel.offsetWidth
  const height = panel.offsetHeight
  let left = rect.left
  let top = rect.bottom + 8
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8)
  if (top + height > window.innerHeight - 8) top = 8
  if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8)
  panel.style.left = `${left}px`
  panel.style.top = `${top}px`
}

function padRow(height: number, cols: number): HTMLTableRowElement {
  const tr = document.createElement("tr")
  tr.className = "pad"
  tr.style.height = `${height}px`
  const td = document.createElement("td")
  td.colSpan = cols
  tr.append(td)
  return tr
}

function displayHeader(header: string, index: number): string {
  if (header === `Column ${index + 1}`) return t("columnFallback", { n: String(index + 1) })
  return header
}

function kindLabel(choice: ColumnChoice, kind: ColumnKind): string {
  const resolved = choice === "auto" ? kind : choice
  if (resolved === "number") return t("kindNumber")
  if (resolved === "date") return t("kindDate")
  return t("kindText")
}

async function writeClipboard(rows: string[][]): Promise<void> {
  const plain = toTsv(rows)
  const html = toHtmlTable(rows)
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ])
      return
    }
  } catch {
    /* fall through to plain text */
  }
  await navigator.clipboard.writeText(plain)
}

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"
  document.documentElement.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function button(label: string, className = "", icon?: IconName): HTMLButtonElement {
  const node = document.createElement("button")
  node.type = "button"
  if (className) node.className = className
  if (icon) fillIconButton(node, icon, label)
  else node.textContent = label
  return node
}

export function installTheme(shadow: ShadowRoot) {
  const style = document.createElement("style")
  style.textContent = `${themeCss}\n${panelCss}`
  shadow.append(style)
}
