export type Box = { left: number; top: number; width: number; height: number }
export type Viewport = { width: number; height: number }
export type ResizeEdge = "left" | "right" | "bottom" | "corner"

const MARGIN = 8
const MIN_WIDTH = 280
const MIN_HEIGHT = 220

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(max, Math.max(min, value))
}

/** Keep a panel inside the window. A short window may shrink it below the usual minimum. */
export function fitPanel(box: Box, viewport: Viewport): Box {
  const maxWidth = Math.max(MARGIN, viewport.width - MARGIN * 2)
  const maxHeight = Math.max(MARGIN, viewport.height - MARGIN * 2)
  const width = clamp(box.width, Math.min(MIN_WIDTH, maxWidth), maxWidth)
  const height = clamp(box.height, Math.min(MIN_HEIGHT, maxHeight), maxHeight)
  return {
    left: clamp(box.left, MARGIN, Math.max(MARGIN, viewport.width - MARGIN - width)),
    top: clamp(box.top, MARGIN, Math.max(MARGIN, viewport.height - MARGIN - height)),
    width,
    height,
  }
}

/** Resize one edge. The opposite edge stays put, and the panel stops at the window. */
export function resizePanel(start: Box, dx: number, dy: number, edge: ResizeEdge, viewport: Viewport): Box {
  const maxWidth = Math.max(MARGIN, viewport.width - MARGIN * 2)
  const maxHeight = Math.max(MARGIN, viewport.height - MARGIN * 2)
  const minWidth = Math.min(MIN_WIDTH, maxWidth)
  const minHeight = Math.min(MIN_HEIGHT, maxHeight)
  let left = start.left
  let top = start.top
  let width = start.width
  let height = start.height
  if (edge === "left") {
    const right = start.left + start.width
    width = clamp(start.width - dx, minWidth, Math.min(maxWidth, right - MARGIN))
    left = right - width
  }
  if (edge === "right" || edge === "corner") {
    width = clamp(start.width + dx, minWidth, Math.min(maxWidth, viewport.width - MARGIN - start.left))
  }
  if (edge === "bottom" || edge === "corner") {
    height = clamp(start.height + dy, minHeight, Math.min(maxHeight, viewport.height - MARGIN - start.top))
  }
  return { left, top, width, height }
}
