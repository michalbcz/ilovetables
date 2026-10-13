export type IgnoreScope = "url" | "host" | "domain"

export type IgnoreRule = {
  scope: IgnoreScope
  target: string
}

export type PageAddress = {
  href: string
  host: string
}

const SCOPES = new Set<IgnoreScope>(["url", "host", "domain"])

/** Common multi-label public suffixes. The full Public Suffix List does not fit the content script. */
const MULTI_SUFFIXES = new Set([
  "ac.uk",
  "co.id",
  "co.in",
  "co.jp",
  "co.kr",
  "co.nz",
  "co.uk",
  "co.za",
  "com.ar",
  "com.au",
  "com.br",
  "com.cn",
  "com.hk",
  "com.mx",
  "com.pl",
  "com.sg",
  "com.tr",
  "com.tw",
  "com.ua",
  "edu.au",
  "gov.uk",
  "ne.jp",
  "net.au",
  "net.uk",
  "or.jp",
  "org.au",
  "org.uk",
])

export function pageUrl(href: string): string {
  try {
    const url = new URL(href)
    url.hash = ""
    return url.href
  } catch {
    return href.split("#")[0] ?? href
  }
}

export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, "")
  if (host === "" || host === "localhost" || host.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return host
  }
  const labels = host.split(".")
  if (labels.length <= 2) return host
  const suffix = labels.slice(-2).join(".")
  if (MULTI_SUFFIXES.has(suffix)) return labels.slice(-3).join(".")
  return suffix
}

export function sameIgnore(left: IgnoreRule, right: IgnoreRule): boolean {
  return left.scope === right.scope && left.target === right.target
}

export function addIgnore(rules: IgnoreRule[], rule: IgnoreRule): IgnoreRule[] {
  if (rules.some((item) => sameIgnore(item, rule))) return rules
  return [...rules, rule]
}

export function removeIgnore(rules: IgnoreRule[], rule: IgnoreRule): IgnoreRule[] {
  return rules.filter((item) => !sameIgnore(item, rule))
}

export function parseIgnores(value: unknown, disabledHosts: string[]): IgnoreRule[] {
  const rules: IgnoreRule[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue
      const scope = (item as { scope?: unknown }).scope
      const target = (item as { target?: unknown }).target
      if (typeof scope !== "string" || !SCOPES.has(scope as IgnoreScope)) continue
      if (typeof target !== "string" || target === "") continue
      rules.push({ scope: scope as IgnoreScope, target })
    }
  }
  for (const host of disabledHosts) {
    if (host !== "") rules.push({ scope: "host", target: host })
  }
  return rules.filter((rule, index) => rules.findIndex((item) => sameIgnore(item, rule)) === index)
}

export function matchingPageRules(rules: IgnoreRule[], page: PageAddress): IgnoreRule[] {
  const url = pageUrl(page.href)
  let hostname = page.host
  try {
    hostname = new URL(page.href).hostname
  } catch {
    hostname = page.host.replace(/:\d+$/, "")
  }
  const domain = registrableDomain(hostname)
  const rank: Record<IgnoreScope, number> = { url: 0, host: 1, domain: 2 }
  return rules
    .filter((rule) => {
      if (rule.scope === "url") return rule.target === url
      if (rule.scope === "host") return rule.target === page.host || rule.target === hostname
      return rule.target === domain
    })
    .sort((left, right) => rank[left.scope] - rank[right.scope])
}

/** Headers stored in a table fingerprint, for the ignore list. */
export function labelFromTableKey(key: string): string {
  const pipe = key.indexOf("|")
  const headers = (pipe >= 0 ? key.slice(pipe + 1) : key)
    .split("\u001f")
    .map((part) => part.trim())
    .filter(Boolean)
  return headers.slice(0, 4).join(", ") || key
}
