# 0002. Ignore a table, a page, a host, or a domain

- Status: accepted
- Date: 2026-10-11

## Context

Hiding was only two switches: one table, remembered for the whole host by its headers, and one host, which hid every table there. A person also needs to skip a single URL, one subdomain, or every subdomain of a site, and to undo any of those later.

## Decision

Keep a table ignore in the per-host memory, under the header fingerprint. Add page, host, and domain rules to the settings object. A page rule is the URL without its hash. A host rule is `location.host`, port included, and does not cover a sibling subdomain. A domain rule is the registrable domain. The popup adds a rule for the current page. The options page lists every rule and every ignored table and can remove them. The right-click command can still open a table on an ignored page.

Older “pause this site” entries are host rules. Load copies `disabledHosts` into host rules only when the stored object has no `ignores` list. A save writes the current host rules back into `disabledHosts` and does not copy that mirror into `ignores`, so removing a host stays removed.

## Alternatives

- Leave pause as the only site-wide switch. Rejected. It cannot say “this URL only” or “the whole domain”.
- Ship the Public Suffix List to decide where a domain starts. Rejected. The list is larger than the content-script budget. A short list of multi-label suffixes covers the common cases.
- Key a table ignore to one URL. Rejected. The same grid often repeats across a host. The page rule already means “nothing on this URL”.

## Consequences

A domain the short suffix list does not know is treated as its last two labels. New suffixes belong in that list, not in a bundled copy of the Public Suffix List. Page, host, and domain ignores hide icons; they do not block an explicit open.
