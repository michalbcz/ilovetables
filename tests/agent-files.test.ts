import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import test from "node:test"

const pointerDirs = [".claude/skills"]

function frontmatter(text: string): string {
  const match = text.match(/^---\n[\s\S]*?\n---\n/)
  assert.ok(match, "SKILL.md starts with frontmatter")
  return match[0]
}

test("CLAUDE.md imports AGENTS.md", () => {
  assert.equal(readFileSync("CLAUDE.md", "utf8").trim(), "@AGENTS.md")
})

for (const name of readdirSync(".agents/skills")) {
  const source = `.agents/skills/${name}/SKILL.md`
  for (const dir of pointerDirs) {
    test(`${dir}/${name} points at ${source} with the same frontmatter`, () => {
      const pointer = `${dir}/${name}/SKILL.md`
      assert.ok(existsSync(pointer), `${pointer} exists`)
      const text = readFileSync(pointer, "utf8")
      assert.equal(frontmatter(text), frontmatter(readFileSync(source, "utf8")))
      assert.ok(text.includes(`\`${source}\``), `${pointer} names ${source}`)
    })
  }
}
