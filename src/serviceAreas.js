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
 * Keys are lowercased+trimmed; look-ups go through norm(). Values must be exact
 * AREAS / SERVICES entries. Some entries below have no companies behind them
 * yet and exist so a future retag starts matching without another code change.
 * ------------------------------------------------------------------------- */

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase()

// DB area label -> AREAS entry
export const AREA_ALIASES = {
  // live mismatches, highest-volume first
  'dubai investment park': 'Dubai Investment Park (DIP)',
  'jvc': 'Jumeirah Village Circle (JVC)',
  'jlt': 'Jumeirah Lake Towers (JLT)',
  'dubai hills': 'Dubai Hills Estate',
  'barsha': 'Al Barsha',
  // not seen in the data yet — abbreviations and long forms of the same places
  'dip': 'Dubai Investment Park (DIP)',
  'jumeirah village circle': 'Jumeirah Village Circle (JVC)',
  'jumeirah lake towers': 'Jumeirah Lake Towers (JLT)',
  'jbr': 'Jumeirah Beach Residence (JBR)',
  'jumeirah beach residence': 'Jumeirah Beach Residence (JBR)',
  'al barsha south': 'Al Barsha',
  'silicon oasis': 'Dubai Silicon Oasis',
  'dso': 'Dubai Silicon Oasis',
  'downtown': 'Downtown Dubai',
  'damac hills': 'DAMAC Hills',
  'difc': 'DIFC',
}

// DB category label -> one or more SERVICES entries. An array because a single
// tag can legitimately cover two pages ('Kitchen & Bathroom').
export const SERVICE_ALIASES = {
  // live mismatches (the category-table rename)
  'hvac & ac': ['AC Service'],
  'flooring & tiling': ['Flooring'],
  'false ceiling': ['False Ceiling & Partition'],
  'joinery & carpentry': ['Carpentry & Joinery'],
  'kitchen & bathroom': ['Kitchen Renovation', 'Bathroom Renovation'],
  // active category-table rows with no companies on them yet
  'false ceiling & gypsum': ['False Ceiling & Partition'],
  'cleaning services': ['Cleaning'],
  'swimming pools': ['Swimming Pool'],
  'handyman & maintenance': ['Handyman'],
  // '&' / 'and' spelling variants
  'hvac and ac': ['AC Service'],
  'flooring and tiling': ['Flooring'],
  'false ceiling and gypsum': ['False Ceiling & Partition'],
  'joinery and carpentry': ['Carpentry & Joinery'],
  'kitchen and bathroom': ['Kitchen Renovation', 'Bathroom Renovation'],
  'handyman and maintenance': ['Handyman'],
}

const AREA_BY_NORM = new Map(AREAS.map(a => [norm(a), a]))
const SERVICE_BY_NORM = new Map(SERVICES.map(s => [norm(s), s]))

// A company's area label -> the AREAS entry whose page should list it, or null.
export function resolveArea(label) {
  const n = norm(label)
  if (!n) return null
  return AREA_BY_NORM.get(n) || AREA_ALIASES[n] || null
}

// A company's category labels -> the set of SERVICES entries whose pages should
// list it. Reads `category` plus every element of the `categories` array.
export function resolveServices(company) {
  const out = new Set()
  const labels = [company.category, ...(Array.isArray(company.categories) ? company.categories : [])]
  for (const label of labels) {
    const n = norm(label)
    if (!n) continue
    const exact = SERVICE_BY_NORM.get(n)
    if (exact) { out.add(exact); continue }
    for (const s of SERVICE_ALIASES[n] || []) out.add(s)
  }
  return out
}

// The company set a /services/:slug page lists. Kept here so prerender.mjs can
// produce byte-identical results to what ServiceArea.jsx renders at runtime.
export function selectCompanies(rows, service, area) {
  let out = (rows || []).filter(c => resolveServices(c).has(service))
  if (area) out = out.filter(c => resolveArea(c.area || c.location) === area)
  return out.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
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
      if (!SERVICE_BY_NORM.has(n) && !SERVICE_ALIASES[n]) bump(services, String(label).trim())
    }
  }
  const sort = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
  return { areas: sort(areas), services: sort(services) }
}
