// Generates src/generated/eligibility.json — the ONE derivation of which
// /services/ pages are indexable, used by every consumer so they cannot drift:
//
//   scripts/gen-sitemap.mjs   which URLs enter sitemap.xml
//   scripts/prerender.mjs     which routes get a company seed, and which extra
//                             (ineligible) routes still get crawled so they ship
//                             a real empty state instead of the SPA shell
//   src/pages/ServiceArea.jsx robots meta + the internal link grids
//
// The rule, in one place: a service x area combination is eligible when
// selectCompanies() returns at least one company at build time. A broad
// /services/<service> page is eligible when that service has any company at all.
// Nothing is hardcoded — a supplier appearing in a new area makes its page
// eligible on the next build with no code change, and the last supplier leaving
// takes it back out.
//
// Ineligible routes are NOT deleted. They still resolve 200 with an empty state
// and <meta name="robots" content="noindex,follow">, so the page returns to the
// index automatically the day someone lists there.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVICES, AREAS, slugify, selectCompanies, auditVocabulary } from '../src/serviceAreas.js'

const SUPABASE_URL = 'https://ribdorraxxhfbfkjhpie.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYmRvcnJheHhoZmJma2pocGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTkzNDUsImV4cCI6MjA5NTM3NTM0NX0.w5EMvd47CtWTc-8NgTlsM44EYmbGSQHc79wgjXTQlHE'
const FIELDS = 'id,name,slug,category,categories,area,location,avg_rating,updated_at,created_at'

export async function fetchApproved() {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/companies?select=${FIELDS}&status=eq.approved&order=id&limit=1000&offset=${offset}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const rows = await res.json()
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

// Latest content timestamp across a set of companies — drives <lastmod> so a URL
// only claims to have changed when its companies actually did.
const stamp = (rows) => {
  let max = ''
  for (const c of rows) {
    const t = c.updated_at || c.created_at || ''
    if (t > max) max = t
  }
  return max ? max.slice(0, 10) : null
}

export function buildEligibility(all) {
  const combos = {}        // "service-area" slug -> company count
  const lastmod = {}       // path -> YYYY-MM-DD
  const byService = {}     // service -> [eligible areas]
  const byArea = {}        // area -> [eligible services]
  const services = []      // broad /services/<service> pages that have companies

  for (const svc of SERVICES) {
    const forService = selectCompanies(all, svc, null)
    if (forService.length) {
      services.push(svc)
      lastmod[`/services/${slugify(svc)}`] = stamp(forService)
    }
    for (const area of AREAS) {
      const rows = selectCompanies(all, svc, area)
      if (!rows.length) continue
      const slug = `${slugify(svc)}-${slugify(area)}`
      combos[slug] = rows.length
      lastmod[`/services/${slug}`] = stamp(rows)
      ;(byService[svc] ||= []).push(area)
      ;(byArea[area] ||= []).push(svc)
    }
  }

  // Every combination the vocabulary can express, so consumers know what is
  // ineligible without re-deriving the cross product themselves.
  const allCombos = []
  for (const svc of SERVICES) for (const area of AREAS) allCombos.push(`${slugify(svc)}-${slugify(area)}`)
  const ineligible = allCombos.filter((s) => !(s in combos))
  const ineligibleServices = SERVICES.filter((s) => !services.includes(s))

  return { services, ineligibleServices, combos, ineligible, byService, byArea, lastmod, totals: {
    allCombos: allCombos.length, eligibleCombos: Object.keys(combos).length, ineligibleCombos: ineligible.length,
  } }
}

// Client-facing slice — keep it small, it ships in the bundle. No company rows,
// no per-URL lastmod (build-time only).
function clientSlice(e) {
  return { services: e.services, combos: e.combos, byService: e.byService, byArea: e.byArea }
}

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const all = await fetchApproved()
  const e = buildEligibility(all)
  const out = resolve(__dirname, '..', 'src', 'generated', 'eligibility.json')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(clientSlice(e), null, 1) + '\n')

  const leftovers = auditVocabulary(all)
  console.log(`eligibility: ${e.totals.eligibleCombos}/${e.totals.allCombos} combos eligible, ` +
    `${e.services.length}/${SERVICES.length} services, ${Object.keys(e.byArea).length}/${AREAS.length} areas`)
  if (e.ineligibleServices.length) console.log(`  services with no supplier anywhere: ${e.ineligibleServices.join(', ')}`)
  if (leftovers.areas.length || leftovers.services.length) {
    console.log('  vocabulary leftovers (companies matching no page):')
    for (const { label, count } of leftovers.areas) console.log(`     area     ${String(count).padStart(4)}  "${label}"`)
    for (const { label, count } of leftovers.services) console.log(`     category ${String(count).padStart(4)}  "${label}"`)
  } else {
    console.log('  vocabulary: every company area and category maps to a page.')
  }
}

// Only run when invoked directly — gen-sitemap.mjs imports the helpers above.
if (process.argv[1] && process.argv[1].endsWith('gen-eligibility.mjs')) await main()
