import assert from "node:assert/strict"
import test from "node:test"
import { fitPanel, resizePanel } from "../src/content/panel-frame.ts"

const view = { width: 800, height: 600 }
const start = { left: 100, top: 80, width: 400, height: 300 }

test("a drag stays inside the window", () => {
  assert.deepEqual(fitPanel({ left: -40, top: 900, width: 400, height: 300 }, view), {
    left: 8,
    top: 292,
    width: 400,
    height: 300,
  })
})

test("resize from the corner keeps the top-left and stops at the window", () => {
  assert.deepEqual(resizePanel(start, 50, 40, "corner", view), {
    left: 100,
    top: 80,
    width: 450,
    height: 340,
  })
  const limited = resizePanel(start, 5000, 5000, "corner", view)
  assert.equal(limited.left, 100)
  assert.equal(limited.top, 80)
  assert.equal(limited.width, 692)
  assert.equal(limited.height, 512)
})

test("resize from the left edge moves only that edge", () => {
  assert.deepEqual(resizePanel(start, -30, 80, "left", view), {
    left: 70,
    top: 80,
    width: 430,
    height: 300,
  })
  const pinned = resizePanel({ left: 20, top: 40, width: 400, height: 200 }, -1000, 0, "left", view)
  assert.equal(pinned.left, 8)
  assert.equal(pinned.left + pinned.width, 420)
})

test("a panel cannot shrink past the minimum", () => {
  assert.deepEqual(resizePanel(start, -500, -500, "corner", view), {
    left: 100,
    top: 80,
    width: 280,
    height: 220,
  })
})

test("a short window can hold a shorter panel", () => {
  assert.deepEqual(fitPanel({ left: 0, top: 0, width: 800, height: 600 }, { width: 320, height: 240 }), {
    left: 8,
    top: 8,
    width: 304,
    height: 224,
  })
})
