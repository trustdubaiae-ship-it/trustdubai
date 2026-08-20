// Service + area vocabulary for /services/:serviceArea, and the slug helpers
// around it. Lives in its own module because scripts/prerender.mjs needs the
// exact same lists to build each page's seed in Node — keeping a second copy
// there would drift the moment a service or area is added.

/* 20 services + 30 areas — must match DB categories & company areas */
export const SERVICES = [
  'Interior Design','Renovation','Fit-Out','Kitchen Renovation','Bathroom Renovation',
  'Carpentry & Joinery','Flooring','Painting','False Ceiling & Partition','AC Service',
  'Plumbing','Electrical','Cleaning','Landscaping','Swimming Pool',
  'Handyman','Pest Control','Smart Home & Automation','Curtains & Blinds','Waterproofing',
]

export const AREAS = [
  'Downtown Dubai','Business Bay','Dubai Marina','Palm Jumeirah','Jumeirah Village Circle (JVC)',
  'Jumeirah Lake Towers (JLT)','Jumeirah','Dubai Hills Estate','Arabian Ranches','DAMAC Hills',
  'Emirates Hills','The Springs','The Meadows','The Greens','Dubai Silicon Oasis',
  'Mirdif','Al Barsha','Deira','Bur Dubai','Dubai Investment Park (DIP)',
  'Jumeirah Beach Residence (JBR)','DIFC','City Walk','Al Furjan','Discovery Gardens',
  'Motor City','Jumeirah Golf Estates','Dubailand','International City','Town Square',
  // Added once the vocabulary audit showed them as the two largest blocks of
  // companies with no page at all (Al Quoz 97, Jebel Ali 19+1). Only their
  // populated combinations reach the sitemap — see scripts/gen-eligibility.mjs.
  'Al Quoz','Jebel Ali',
]

export const slugify = (s) => s.toLowerCase()
  .replace(/&/g,'and').replace(/[()]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')

// Resolve a URL slug (e.g. "interior-design-business-bay") back to {service, area}
export function resolveSlug(slug) {
  if (!slug) return { service: null, area: null }
  for (const svc of SERVICES) {
    const sSlug = slugify(svc)
    if (slug === sSlug || slug.startsWith(sSlug + '-')) {
      const rest = slug === sSlug ? '' : slug.slice(sSlug.length + 1)
      if (!rest) return { service: svc, area: null }
      for (const ar of AREAS) {
        if (slugify(ar) === rest) return { service: svc, area: ar }
      }
      return { service: svc, area: null }
    }
  }
  return { service: null, area: null }
}

/* ---------------------------------------------------------------------------
 * Vocabulary aliases: companies.category / companies.area hold labels that do
 * not literally equal the SERVICES / AREAS entries above, so an exact string
 * compare silently dropped 542 of 1093 approved companies off their own pages.
 *
 * Root cause on the service side: the `categories` reference table was renamed
 * at some point. Its now-inactive rows are the exact names still listed in
 * SERVICES ('AC Service', 'Flooring', 'False Ceiling & Partition', …) while the
 * active rows are what companies are actually tagged with ('HVAC & AC',
 * 'Flooring & Tiling', 'False Ceiling & Gypsum', …). SERVICES is the public URL
 * vocabulary and is deliberately NOT renamed — that would move 600 live URLs —
 * so the two are reconciled here instead.
 *
 * Alias KEYS carry the real DB spelling and casing, because SERVICE_DB_LABELS
 * below feeds them straight into a PostgREST `category.eq.` filter, which is
 * case-sensitive. Matching is still case-insensitive: every look-up goes
 * through a norm()'d index built once at module load. Values must be exact
 * AREAS / SERVICES entries. Some entries below have no companies behind them
 * yet and exist so a future retag starts matching without another code change.
 * ------------------------------------------------------------------------- */

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase()

// DB area label -> AREAS entry
export const AREA_ALIASES = {
  // live mismatches, highest-volume first
  'Dubai Investment Park': 'Dubai Investment Park (DIP)',
  'JVC': 'Jumeirah Village Circle (JVC)',
  'JLT': 'Jumeirah Lake Towers (JLT)',
  'Dubai Hills': 'Dubai Hills Estate',
  'Barsha': 'Al Barsha',
  'Jabel Ali Industrial Area 1': 'Jebel Ali',
  // not seen in the data yet — abbreviations and long forms of the same places
  'Al Qouz': 'Al Quoz',
  'Jabel Ali': 'Jebel Ali',
  'Jebel Ali Industrial Area': 'Jebel Ali',
  'DIP': 'Dubai Investment Park (DIP)',
  'Jumeirah Village Circle': 'Jumeirah Village Circle (JVC)',
  'Jumeirah Lake Towers': 'Jumeirah Lake Towers (JLT)',
  'JBR': 'Jumeirah Beach Residence (JBR)',
  'Jumeirah Beach Residence': 'Jumeirah Beach Residence (JBR)',
  'Al Barsha South': 'Al Barsha',
  'Silicon Oasis': 'Dubai Silicon Oasis',
  'DSO': 'Dubai Silicon Oasis',
  'Downtown': 'Downtown Dubai',
  'Damac Hills': 'DAMAC Hills',
}

// DB category label -> one or more SERVICES entries. An array because a single
// tag can legitimately cover two pages ('Kitchen & Bathroom').
export const SERVICE_ALIASES = {
  // live mismatches (the category-table rename)
  'HVAC & AC': ['AC Service'],
  'Flooring & Tiling': ['Flooring'],
  'False Ceiling': ['False Ceiling & Partition'],
  'Joinery & Carpentry': ['Carpentry & Joinery'],
  'Kitchen & Bathroom': ['Kitchen Renovation', 'Bathroom Renovation'],
  // active category-table rows with no companies on them yet
  'False Ceiling & Gypsum': ['False Ceiling & Partition'],
  'Cleaning Services': ['Cleaning'],
  'Swimming Pools': ['Swimming Pool'],
  'Handyman & Maintenance': ['Handyman'],
  // 'and' spelling variants
  'HVAC and AC': ['AC Service'],
  'Flooring and Tiling': ['Flooring'],
  'False Ceiling and Gypsum': ['False Ceiling & Partition'],
  'Joinery and Carpentry': ['Carpentry & Joinery'],
  'Kitchen and Bathroom': ['Kitchen Renovation', 'Bathroom Renovation'],
  'Handyman and Maintenance': ['Handyman'],
}

const AREA_BY_NORM = new Map([
  ...AREAS.map(a => [norm(a), a]),
  ...Object.entries(AREA_ALIASES).map(([k, v]) => [norm(k), v]),
])
const SERVICE_BY_NORM = new Map([
  ...SERVICES.map(s => [norm(s), [s]]),
  ...Object.entries(SERVICE_ALIASES).map(([k, v]) => [norm(k), v]),
])

// Reverse map: SERVICES entry -> every DB category label that should land on it,
// canonical name first. ServiceArea.jsx builds its Supabase filter from this —
// without it the page asks for `category.eq.AC Service`, which matches nothing,
// and wipes out the correct prerendered list on mount. Derived from
// SERVICE_ALIASES so there is no second list to keep in step.
export const SERVICE_DB_LABELS = (() => {
  const out = {}
  for (const s of SERVICES) out[s] = [s]
  for (const [label, services] of Object.entries(SERVICE_ALIASES)) {
    for (const s of services) {
      if (out[s] && !out[s].some(x => norm(x) === norm(label))) out[s].push(label)
    }
  }
  return out
})()

// A company's area label -> the AREAS entry whose page should list it, or null.
export function resolveArea(label) {
  const n = norm(label)
  if (!n) return null
  return AREA_BY_NORM.get(n) || null
}

// A company's category labels -> the set of SERVICES entries whose pages should
// list it. Reads `category` plus every element of the `categories` array.
export function resolveServices(company) {
  const out = new Set()
  const labels = [company.category, ...(Array.isArray(company.categories) ? company.categories : [])]
  for (const label of labels) {
    const n = norm(label)
    if (!n) continue
    for (const s of SERVICE_BY_NORM.get(n) || []) out.add(s)
  }
  return out
}

/* ---------------------------------------------------------------------------
 * Ranking. These pages are titled "Top <service> companies in <area>", so the
 * order has to mean something. It previously sorted on avg_rating alone, which
 * is null for 1,091 of the 1,093 approved companies — so the sort was a no-op
 * and "Top" was whatever order the rows arrived in.
 *
 * 1,075 companies do carry a real rating: google_rating / google_reviews_count,
 * imported with the listing. That is the only rating signal that exists at any
 * scale, so it is what ranks the list.
 *
 * A plain rating sort would put a lone 5.0 above a 4.7 with 500 reviews, so the
 * score is a Bayesian average: ratings pull toward the prior until enough
 * reviews back them up. PRIOR_N is the review count at which a company's own
 * rating carries half the weight.
 * ------------------------------------------------------------------------- */
const PRIOR_N = 20
const PRIOR_RATING = 4.3

export function rankScore(c) {
  // Both sources score on one scale. An earlier version gave first-party reviews
  // a flat boost, which put a 3.5 rated by 4 people above a 5.0 rated by 280 on
  // a page titled "Top …". Where the rating came from is a labelling question,
  // not a quality one — so it does not move the company up the page.
  const ownN = Number(c.total_reviews) || 0
  const r = ownN > 0 ? Number(c.avg_rating) || 0 : Number(c.google_rating) || 0
  const n = ownN > 0 ? ownN : Number(c.google_reviews_count) || 0
  if (!(n > 0) || !(r > 0)) return 0
  return (n / (n + PRIOR_N)) * r + (PRIOR_N / (n + PRIOR_N)) * PRIOR_RATING
}

// What a card or profile should show as the rating, and where it came from.
// `source` is not decoration: an imported rating has to be labelled as Google's
// wherever it appears, both because presenting it as our own would be false and
// because only first-party reviews may be marked up as AggregateRating.
export function displayRating(c) {
  const ownN = Number(c.total_reviews) || 0
  if (ownN > 0 && c.avg_rating != null) {
    return { value: Number(c.avg_rating), count: ownN, source: 'site' }
  }
  const n = Number(c.google_reviews_count) || 0
  if (n > 0 && c.google_rating != null) {
    return { value: Number(c.google_rating), count: n, source: 'google' }
  }
  return null
}

// The company set a /services/:slug page lists. Kept here so prerender.mjs can
// produce byte-identical results to what ServiceArea.jsx renders at runtime.
export function selectCompanies(rows, service, area) {
  let out = (rows || []).filter(c => resolveServices(c).has(service))
  if (area) out = out.filter(c => resolveArea(c.area || c.location) === area)
  // Tie-break on review volume so equal scores are not left in arrival order.
  return out.sort((a, b) =>
    (rankScore(b) - rankScore(a)) ||
    ((Number(b.google_reviews_count) || 0) - (Number(a.google_reviews_count) || 0))
  )
}

// Every distinct area / category label in `rows` that still maps to nothing.
// Called once per build from scripts/prerender.mjs so leftovers are visible in
// the build log rather than having to be re-derived by hand.
export function auditVocabulary(rows) {
  const areas = new Map(), services = new Map()
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1)
  for (const c of rows || []) {
    const areaLabel = c.area || c.location
    if (norm(areaLabel) && !resolveArea(areaLabel)) bump(areas, String(areaLabel).trim())
    for (const label of [c.category, ...(Array.isArray(c.categories) ? c.categories : [])]) {
      const n = norm(label)
      if (!n) continue
      if (!SERVICE_BY_NORM.has(n)) bump(services, String(label).trim())
    }
  }
  const sort = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
  return { areas: sort(areas), services: sort(services) }
}
