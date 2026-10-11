export type ExportFormat = "markdown" | "csv"

export type Settings = {
  formulaGuard: boolean
  separator: "," | ";"
  fuzzy: boolean
  disabledHosts: string[]
  copyAs: ExportFormat
  saveAs: ExportFormat
}

export type ColumnChoice = "auto" | "number" | "date" | "text"

export type TableMemory = {
  ignored?: boolean
  headerRows?: number
  types?: Record<string, ColumnChoice>
  /** Open the panel once when the page loads. Default off. */
  autoOpen?: boolean
}

export const defaultSettings: Settings = {
  formulaGuard: true,
  separator: ",",
  fuzzy: true,
  disabledHosts: [],
  copyAs: "markdown",
  saveAs: "csv",
}

function exportFormat(value: unknown, fallback: ExportFormat): ExportFormat {
  return value === "markdown" || value === "csv" ? value : fallback
}

type StorageArea = {
  get: (key: string) => Promise<Record<string, unknown>>
  set: (items: Record<string, unknown>) => Promise<void>
}

function storage(): StorageArea | null {
  const root = globalThis as unknown as {
    chrome?: { storage?: { local?: StorageArea } }
    browser?: { storage?: { local?: StorageArea } }
  }
  return root.chrome?.storage?.local ?? root.browser?.storage?.local ?? null
}

export async function loadSettings(): Promise<Settings> {
  const area = storage()
  if (!area) return { ...defaultSettings }
  const got = await area.get("settings")
  const stored = got.settings
  if (!stored || typeof stored !== "object") return { ...defaultSettings }
  const value = stored as Partial<Settings>
  return {
    formulaGuard: value.formulaGuard ?? defaultSettings.formulaGuard,
    separator: value.separator === ";" ? ";" : ",",
    fuzzy: value.fuzzy ?? defaultSettings.fuzzy,
    copyAs: exportFormat(value.copyAs, defaultSettings.copyAs),
    saveAs: exportFormat(value.saveAs, defaultSettings.saveAs),
    disabledHosts: Array.isArray(value.disabledHosts)
      ? value.disabledHosts.filter((host) => typeof host === "string")
      : [],
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const area = storage()
  if (!area) return
  await area.set({ settings })
}

function memoryKey(host: string): string {
  return `mem:${host}`
}

export async function loadMemory(host: string): Promise<Record<string, TableMemory>> {
  const area = storage()
  if (!area) return {}
  const key = memoryKey(host)
  const got = await area.get(key)
  const stored = got[key]
  if (!stored || typeof stored !== "object") return {}
  return stored as Record<string, TableMemory>
}

export async function saveMemory(
  host: string,
  memory: Record<string, TableMemory>,
): Promise<void> {
  const area = storage()
  if (!area) return
  await area.set({ [memoryKey(host)]: memory })
}

export function fileSlug(title: string): string {
  const slug = title
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
  return slug || "table"
}
