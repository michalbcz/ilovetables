const en = {
  extName: "ilovetables",
  extDescription:
    "Sort, filter, and export any table you are looking at. The page stays as it is, and nothing is uploaded.",
  actionTitle: "Sort, filter, and export tables on this page",
  panelTitle: "ilovetables",
  close: "Close",
  search: "Find in this table",
  headerRows: "Header rows",
  copy: "Copy",
  save: "Save",
  markdown: "Markdown",
  csv: "CSV",
  copyAs: "Copy as {format}",
  saveAs: "Save as {format}",
  chooseFormat: "Choose format",
  refresh: "Refresh",
  hideBadge: "Hide icon",
  exportAll: "Export all rows",
  autoOpen: "Open automatically",
  nothingMatches: "Nothing matches.",
  foot: "Drag across cells, then press Cmd or Ctrl C. Shift-click a heading to add a sort.",
  copied: "Copied",
  cycleType: "Cycle column type",
  kindDate: "date",
  kindText: "text",
  kindNumber: "#",
  firstRowNames: "First row is the column names",
  tableGone: "This table is no longer on the page.",
  loadedRows: "Only rows currently loaded in the page are here ({shown} of {total}).",
  count: "{shown} of {total}",
  columnFallback: "Column {n}",
  badgeTip: "Open this table. Drag to move.",
  pageClosed: "This page does not share its tables.",
  resumeSite: "Resume on this site",
  pauseSite: "Pause on this site",
  pausedHere: "Badges are paused here.",
  noTables: "No data tables on this page.",
  openAnyway: "Right-click a table to open it anyway.",
  layoutLeft: "Some layout tables were left alone.",
  hidden: "hidden",
  show: "Show",
  "reason.layout-role": "Marked as a layout table.",
  "reason.layout-chrome": "Inside navigation or a footer.",
  "reason.too-small": "Needs at least two columns and two rows.",
  "reason.no-body": "No body rows.",
  "reason.too-small-no-header": "Too small, and it has no header.",
  "reason.mostly-empty": "Most cells are empty.",
  "reason.link-grid": "Almost every cell is a single link.",
  "reason.no-cells": "A grid on this page does not expose rows and cells.",
  optionsLead: "Sorting, search, and export stay in this browser. Nothing is uploaded.",
  formula: "Neutralize spreadsheet formulas in CSV",
  separator: "CSV separator",
  comma: "Comma",
  semicolon: "Semicolon (Excel EU)",
  fuzzy: "Fuzzy search when an exact match misses",
  pausedSites: "Paused sites",
  noPaused: "No paused sites.",
  resume: "Resume",
  contextOpen: "Open in ilovetables",
}

export type MessageKey = keyof typeof en

const de: Record<MessageKey, string> = {
  extName: "ilovetables",
  extDescription:
    "Sortieren, filtern und exportieren Sie jede Tabelle auf der Seite. Die Seite bleibt unverändert, und es wird nichts hochgeladen.",
  actionTitle: "Tabellen auf dieser Seite sortieren, filtern und exportieren",
  panelTitle: "ilovetables",
  close: "Schließen",
  search: "In dieser Tabelle suchen",
  headerRows: "Kopfzeilen",
  copy: "Kopieren",
  save: "Speichern",
  markdown: "Markdown",
  csv: "CSV",
  copyAs: "Kopieren als {format}",
  saveAs: "Speichern als {format}",
  chooseFormat: "Format wählen",
  refresh: "Aktualisieren",
  hideBadge: "Icon ausblenden",
  exportAll: "Alle Zeilen exportieren",
  autoOpen: "Automatisch öffnen",
  nothingMatches: "Keine Treffer.",
  foot: "Zellen aufziehen, dann Cmd oder Ctrl C drücken. Umschalt-Klick auf eine Überschrift fügt eine Sortierung hinzu.",
  copied: "Kopiert",
  cycleType: "Spaltentyp wechseln",
  kindDate: "Datum",
  kindText: "Text",
  kindNumber: "#",
  firstRowNames: "Erste Zeile enthält die Spaltennamen",
  tableGone: "Diese Tabelle ist nicht mehr auf der Seite.",
  loadedRows: "Hier sind nur die Zeilen, die die Seite gerade geladen hat ({shown} von {total}).",
  count: "{shown} von {total}",
  columnFallback: "Spalte {n}",
  badgeTip: "Diese Tabelle öffnen. Zum Verschieben ziehen.",
  pageClosed: "Diese Seite gibt ihre Tabellen nicht frei.",
  resumeSite: "Auf dieser Website fortsetzen",
  pauseSite: "Auf dieser Website pausieren",
  pausedHere: "Markierungen sind hier pausiert.",
  noTables: "Keine Datentabellen auf dieser Seite.",
  openAnyway: "Ein Rechtsklick auf eine Tabelle öffnet sie trotzdem.",
  layoutLeft: "Einige Layout-Tabellen wurden ausgelassen.",
  hidden: "ausgeblendet",
  show: "Einblenden",
  "reason.layout-role": "Als Layout-Tabelle markiert.",
  "reason.layout-chrome": "In der Navigation oder einer Fußzeile.",
  "reason.too-small": "Mindestens zwei Spalten und zwei Zeilen nötig.",
  "reason.no-body": "Keine Datenzeilen.",
  "reason.too-small-no-header": "Zu klein und ohne Kopfzeile.",
  "reason.mostly-empty": "Die meisten Zellen sind leer.",
  "reason.link-grid": "Fast jede Zelle ist ein einzelner Link.",
  "reason.no-cells": "Ein Raster auf dieser Seite zeigt keine Zeilen und Zellen.",
  optionsLead: "Sortierung, Suche und Export bleiben in diesem Browser. Es wird nichts hochgeladen.",
  formula: "Formeln in CSV entschärfen",
  separator: "CSV-Trennzeichen",
  comma: "Komma",
  semicolon: "Semikolon (Excel EU)",
  fuzzy: "Unscharfe Suche, wenn nichts genau passt",
  pausedSites: "Pausierte Websites",
  noPaused: "Keine pausierten Websites.",
  resume: "Fortsetzen",
  contextOpen: "In ilovetables öffnen",
}

const cs: Record<MessageKey, string> = {
  extName: "ilovetables",
  extDescription:
    "Seřaďte, filtrujte a exportujte libovolnou tabulku na stránce. Stránka zůstane beze změny a nic se neodesílá.",
  actionTitle: "Seřadit, filtrovat a exportovat tabulky na této stránce",
  panelTitle: "ilovetables",
  close: "Zavřít",
  search: "Hledat v této tabulce",
  headerRows: "Řádky záhlaví",
  copy: "Kopírovat",
  save: "Uložit",
  markdown: "Markdown",
  csv: "CSV",
  copyAs: "Kopírovat jako {format}",
  saveAs: "Uložit jako {format}",
  chooseFormat: "Vybrat formát",
  refresh: "Obnovit",
  hideBadge: "Skrýt ikonu",
  exportAll: "Exportovat všechny řádky",
  autoOpen: "Otevírat automaticky",
  nothingMatches: "Nic neodpovídá.",
  foot: "Táhněte přes buňky a stiskněte Cmd nebo Ctrl C. Shift a klik na záhlaví přidá řazení.",
  copied: "Zkopírováno",
  cycleType: "Přepnout typ sloupce",
  kindDate: "datum",
  kindText: "text",
  kindNumber: "#",
  firstRowNames: "První řádek jsou názvy sloupců",
  tableGone: "Tato tabulka už na stránce není.",
  loadedRows: "Tady jsou jen řádky, které stránka zrovna načetla ({shown} z {total}).",
  count: "{shown} z {total}",
  columnFallback: "Sloupec {n}",
  badgeTip: "Otevřít tuto tabulku. Táhnutím posunete.",
  pageClosed: "Tato stránka své tabulky nesdílí.",
  resumeSite: "Na tomto webu pokračovat",
  pauseSite: "Na tomto webu pozastavit",
  pausedHere: "Značky jsou tady pozastavené.",
  noTables: "Na této stránce nejsou datové tabulky.",
  openAnyway: "Klikněte pravým tlačítkem na tabulku a otevřete ji i tak.",
  layoutLeft: "Některé rozvrhovací tabulky zůstaly stranou.",
  hidden: "skryto",
  show: "Zobrazit",
  "reason.layout-role": "Označeno jako rozvrhovací tabulka.",
  "reason.layout-chrome": "Uvnitř navigace nebo zápatí.",
  "reason.too-small": "Jsou potřeba aspoň dva sloupce a dva řádky.",
  "reason.no-body": "Žádné datové řádky.",
  "reason.too-small-no-header": "Příliš malá a bez záhlaví.",
  "reason.mostly-empty": "Většina buněk je prázdná.",
  "reason.link-grid": "Skoro každá buňka je jeden odkaz.",
  "reason.no-cells": "Mřížka na této stránce neukazuje řádky a buňky.",
  optionsLead: "Řazení, hledání a export zůstávají v tomto prohlížeči. Nic se neodesílá.",
  formula: "Neutralizovat vzorce v CSV",
  separator: "Oddělovač CSV",
  comma: "Čárka",
  semicolon: "Středník (Excel EU)",
  fuzzy: "Přibližné hledání, když přesná shoda chybí",
  pausedSites: "Pozastavené weby",
  noPaused: "Žádné pozastavené weby.",
  resume: "Pokračovat",
  contextOpen: "Otevřít v ilovetables",
}

export const catalogs: Record<"en" | "de" | "cs", Record<MessageKey, string>> = { en, de, cs }

export function languageCode(language: string): "en" | "de" | "cs" {
  const base = language.toLowerCase().split("-")[0]
  if (base === "de" || base === "cs") return base
  return "en"
}

export function uiLanguage(): string {
  const root = globalThis as unknown as {
    chrome?: { i18n?: { getUILanguage?: () => string } }
    browser?: { i18n?: { getUILanguage?: () => string } }
    navigator?: { language?: string }
  }
  return (
    root.chrome?.i18n?.getUILanguage?.() ??
    root.browser?.i18n?.getUILanguage?.() ??
    root.navigator?.language ??
    "en"
  )
}

export function translate(
  language: string,
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  const template = catalogs[languageCode(language)][key] ?? catalogs.en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "")
}

export function t(key: MessageKey, vars?: Record<string, string>): string {
  return translate(uiLanguage(), key, vars)
}
