export type TableSummary = {
  id: string
  label: string
  rows: number
  cols: number
  ignored: boolean
}

export type ToContent =
  | { type: "list" }
  | { type: "open"; id: string }
  | { type: "open-context" }
  | { type: "rescan" }
  | { type: "ignore"; id: string }
  | { type: "unignore"; id: string }

export type ListResponse = {
  ok: true
  host: string
  disabled: boolean
  tables: TableSummary[]
  notes: string[]
}
