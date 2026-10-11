import uFuzzy from "@leeoniya/ufuzzy/dist/uFuzzy.mjs"

const loose = new uFuzzy({ intraMode: 0 })
const typo = new uFuzzy({ intraMode: 1 })

/** null means "no query, keep every row". An array is the matching indexes. */
export function matchRows(haystack: string[], needle: string, fuzzy: boolean): number[] | null {
  const query = needle.trim()
  if (!query) return null
  const hay = haystack.map((row) => uFuzzy.latinize(row))
  const latinNeedle = uFuzzy.latinize(query)
  if (!fuzzy) {
    const q = latinNeedle.toLowerCase()
    return hay.flatMap((row, index) => (row.toLowerCase().includes(q) ? [index] : []))
  }
  const exact = loose.filter(hay, latinNeedle)
  if (exact && exact.length > 0) return [...exact]
  const rescued = typo.filter(hay, latinNeedle)
  if (rescued && rescued.length > 0) return [...rescued]
  return []
}
