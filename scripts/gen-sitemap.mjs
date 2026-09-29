// Generates public/sitemap.xml — runs automatically before every build.
//
// Only ELIGIBLE pages are listed. Eligibility is not decided here: it comes from
// scripts/gen-eligibility.mjs, which is the single derivation shared with the
// prerender and the page component, so the three can never drift apart. A
// service x area combination is eligible when it has at least one company; a
// broad [service] page when that service has any company at all.
//
// Ineligible URLs are deliberately absent from the sitemap but still resolve
// (200 + empty state + noindex), so they return here automatically on the first
// build after someone lists in that area.
//
// <lastmod> is derived from the companies' own updated_at, so a URL only claims
// to have changed when its content actually did — it no longer resets to the
// build date on every deploy. Static pages carry no lastmod at all (it is an
// optional tag, and a fabricated date is worse than none).
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugify } from '../src/serviceAreas.js'
import { fetchApproved, buildEligibility } from './gen-eligibility.mjs'

const ORIGIN = 'https://www.quvera.ae'
const RESERVED = new Set(['services', 'partner', 'claim-company', 'terms', 'privacy', 'refund'])

const urls = []
const add = (path, priority, changefreq = 'weekly', lastmod = null) =>
  urls.push({ loc: ORIGIN + path, priority, changefreq, lastmod })

add('/', '1.0', 'daily')
add('/partner', '0.6', 'monthly')
add('/claim-company', '0.6', 'monthly')
// Marketing landing pages served straight from public/ as real .html files.
// They carry their own <head> (see the canonical added to each), and the Home
// footer links them, but nothing submitted them until now.
add('/for-customers.html', '0.7', 'monthly')
add('/for-business.html', '0.7', 'monthly')
add('/business.html', '0.6', 'monthly')
add('/how-we-verify.html', '0.6', 'monthly')
add('/os/', '0.6', 'monthly')
// Legal routes. Low priority, but leaving them out of the sitemap also left
// them out of the prerender, so they shipped the SPA shell's homepage canonical.
add('/terms', '0.3', 'yearly')
add('/privacy', '0.3', 'yearly')
add('/refund', '0.3', 'yearly')

let all = []
try {
  all = await fetchApproved()
} catch (e) {
  console.warn(`  ! company fetch failed (${e.message}) — writing static pages only`)
}

const e = buildEligibility(all)

// Broad service pages, then the eligible service x area combinations.
for (const svc of e.services) {
  const p = `/services/${slugify(svc)}`
  add(p, '0.9', 'weekly', e.lastmod[p])
}
for (const slug of Object.keys(e.combos)) {
  const p = `/services/${slug}`
  add(p, '0.7', 'weekly', e.lastmod[p])
}

// Individual company profile pages (/:slug), each stamped with its own row.
let n = 0
for (const c of all) {
  if (!c.slug || RESERVED.has(c.slug)) continue
  add('/' + c.slug, '0.6', 'weekly', (c.updated_at || c.created_at || '').slice(0, 10) || null)
  n++
}

const body = urls.map((u) => [
  '  <url>',
  `    <loc>${u.loc}</loc>`,
  ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
  `    <changefreq>${u.changefreq}</changefreq>`,
  `    <priority>${u.priority}</priority>`,
  '  </url>',
].join('\n')).join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '..', 'public', 'sitemap.xml')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, xml)

console.log(`sitemap.xml written: ${urls.length} URLs`)
console.log(`  ${e.services.length} broad service pages (${e.ineligibleServices.length} withheld — no supplier anywhere)`)
console.log(`  ${e.totals.eligibleCombos} service x area combos (${e.totals.ineligibleCombos} withheld — no company)`)
console.log(`  ${n} company profile pages`)
