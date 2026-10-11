import { spawnSync } from "node:child_process"
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { deflateSync, gzipSync } from "node:zlib"
import * as esbuild from "esbuild"

const bin = new URL("./node_modules/esbuild/bin/esbuild", import.meta.url)
const probe = spawnSync(bin.pathname, ["--version"], { encoding: "utf8" })
if (probe.status !== 0) {
  console.error(probe.stderr || probe.stdout)
  console.error("esbuild's install script has not produced a runnable binary.")
  process.exit(1)
}

rmSync("dist", { recursive: true, force: true })
mkdirSync("dist/icons", { recursive: true })

await esbuild.build({
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background.ts",
    popup: "src/popup/popup.ts",
    options: "src/options/options.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: ["chrome120", "firefox128"],
  legalComments: "none",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
})

for (const name of ["popup", "options"]) {
  const html = readFileSync(`src/${name}/${name}.html`, "utf8").replaceAll("../theme.css", "theme.css")
  writeFileSync(`dist/${name}.html`, html)
  cpSync(`src/${name}/${name}.css`, `dist/${name}.css`)
}
cpSync("src/theme.css", "dist/theme.css")
cpSync("manifest.json", "dist/manifest.json")
cpSync("_locales", "dist/_locales", { recursive: true })

for (const size of [16, 48, 128]) writeFileSync(`dist/icons/${size}.png`, icon(size))

const content = readFileSync("dist/content.js")
const zipped = gzipSync(content).length
console.log(`content.js ${content.length} bytes, ${zipped} bytes gzip`)
if (zipped > 80 * 1024) {
  console.error(`content script is over the 80 KB gzip budget (${zipped})`)
  process.exit(1)
}

function icon(size) {
  const ink = [0x1a, 0x23, 0x32]
  const stamp = [0xd2, 0x3b, 0x2a]
  const line = [0xf3, 0xf6, 0xf7]
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const pad = Math.max(1, Math.round(size * 0.14))
  const stampSize = Math.max(3, Math.round(size * 0.32))
  const inset = Math.max(2, Math.round(size * 0.22))
  const y1 = Math.round(size * 0.4)
  const y2 = Math.round(size * 0.62)
  const x1 = Math.round(size * 0.4)
  const x2 = Math.round(size * 0.62)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const corner =
        x >= size - pad - stampSize && x < size - pad && y >= pad && y < pad + stampSize
      const grid =
        x >= inset &&
        x < size - inset &&
        y >= inset &&
        y < size - inset &&
        (y === y1 || y === y2 || x === x1 || x === x2)
      const px = corner ? stamp : grid ? line : ink
      const i = row + 1 + x * 4
      raw[i] = px[0]
      raw[i + 1] = px[1]
      raw[i + 2] = px[2]
      raw[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function crc32(buffer) {
  let c = ~0
  for (const byte of buffer) {
    c ^= byte
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
