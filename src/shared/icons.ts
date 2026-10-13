export type IconName = "close" | "refresh" | "ignore" | "show" | "copy" | "save" | "table"

const INNER: Record<IconName, string> = {
  close: `<path d="M3.2 3.2 10.8 10.8M10.8 3.2 3.2 10.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"/>`,
  refresh: `<path d="M11.3 7.1A4.3 4.3 0 1 1 8.7 3.1M8.5 1.4v2.6h2.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>`,
  ignore: `<path d="M1.6 7S3.7 3.7 7 3.7 12.4 7 12.4 7 10.3 10.3 7 10.3 1.6 7 1.6 7Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="1.15" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.6 11.4 11.4 2.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>`,
  show: `<path d="M1.6 7S3.7 3.7 7 3.7 12.4 7 12.4 7 10.3 10.3 7 10.3 1.6 7 1.6 7Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="1.15" fill="none" stroke="currentColor" stroke-width="1.3"/>`,
  copy: `<rect x="5" y="2.8" width="6.2" height="7.4" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9.1 2.8V1.8H2.8v7.4H4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>`,
  save: `<path d="M7 2v5.8M4.4 5.4 7 8l2.6-2.6M2.6 11.4h8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>`,
  table: `<path d="M2 2.2h10v9.6H2z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2 5.4h10M2 8.6h10M5.4 2.2v9.6M8.6 2.2v9.6" fill="none" stroke="currentColor" stroke-width="1.1"/>`,
}

export function iconGlyph(name: IconName): HTMLSpanElement {
  const glyph = document.createElement("span")
  glyph.className = "btn-glyph"
  glyph.setAttribute("aria-hidden", "true")
  glyph.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14">${INNER[name]}</svg>`
  return glyph
}

export function buttonLabel(text: string): HTMLSpanElement {
  const label = document.createElement("span")
  label.className = "btn-label"
  label.textContent = text
  return label
}

/** Bordered action control: icon plus the visible label. The label stays the accessible name. */
export function fillIconButton(button: HTMLButtonElement, name: IconName, label: string): void {
  button.classList.add("icon-btn")
  button.replaceChildren(iconGlyph(name), buttonLabel(label))
}
