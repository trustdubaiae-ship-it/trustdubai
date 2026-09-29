// Generates src/generated/seoOverrides.json — the title/meta overrides derived
// from what people actually searched for, refreshed weekly.
//
// This automates what was previously done by hand four times: read Search
// Console, find the pages with impressions but no clicks, and write them a title
// that names the query instead of the template's generic phrasing. The hand-
// written tables in src/seoOverrides.js still win over anything generated here,
// so a tuned page stays tuned.
//
// Safety, because this writes the text Google shows for a page:
//   * Only /services/ pages. Company titles are built from the company row and
//     a query-derived title could contradict it, so those are reported as
//     candidates for a human instead (see scripts/seo-audit.mjs).
//   * The top query must share a word with the page's own service or area, so an
//     unrelated query that happens to land here cannot rename the page.
//   * Every candidate passes validate() — length, brand, relevance, no junk —
//     and a rejected one leaves the page on its template.
//   * Churn guard: an override already live is only replaced when a *different*
//     query overtakes it by 25%+. Rewriting titles every week teaches Google
//     nothing and costs the ranking it just earned.
//
// No credentials -> the existing file is left exactly as it is and the run exits
// 0. This is called from prebuild, so it must never break a deploy.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gscAvailable, searchAnalytics, searchWindow, byPage } from './gsc.mjs'
import { resolveSlug, SERVICE_DB_LABELS } from '../src/serviceAreas.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'src', 'generated', 'seoOverrides.json')
const ELIGIBILITY_PATH = resolve(__dirname, '..', 'src', 'generated', 'eligibility.json')

// Tunable from the workflow. Defaults are deliberately conservative: a page
// needs real impressions before its title is worth touching.
const MIN_IMPRESSIONS = Number(process.env.SEO_MIN_IMPRESSIONS || 60)
const CTR_FLOOR = Number(process.env.SEO_CTR_FLOOR || 0.02)
const POSITION_BAND = [Number(process.env.SEO_POS_MIN || 5), Number(process.env.SEO_POS_MAX || 60)]
const MIN_QUERY_IMPRESSIONS = Number(process.env.SEO_MIN_QUERY_IMPRESSIONS || 15)
const CHURN_RATIO = Number(process.env.SEO_CHURN_RATIO || 1.25)

// Bumped whenever the copy templates below change. A stored override carrying an
// older version is rebuilt from its own (still sticky) query, so a wording fix
// reaches live pages instead of being frozen out by the churn guard.
const TEMPLATE_VERSION = 2

const TITLE_MAX = 65
const TITLE_MIN = 25
const DESC_MAX = 158
const DESC_MIN = 100

const SMALL_WORDS = new Set(['in', 'of', 'and', 'the', 'for', 'to', 'a', 'at', 'on', 'or', 'with', 'near', 'my'])
const STOPWORDS = new Set([...SMALL_WORDS, 'best', 'top', 'cheap', 'good', 'company', 'companies', 'service',
  'services', 'dubai', 'uae', 'me', 'contractor', 'contractors', 'quvera'])

// Queries arrive lowercased from Search Console, so these have to be restored by
// name — "Ac Repair Business Bay" in a title reads as a typo.
const ACRONYMS = new Set(['ac', 'uae', 'jbr', 'jlt', 'jvc', 'difc', 'dip', 'hvac', 'pvc', 'mdf', 'led', 'knx', 'dewa', 'tv', 'uk', 'usa'])

export const titleCase = (s) => s
  .split(/\s+/)
  .map((w, i) => {
    if (!w) return w
    const bare = w.toLowerCase().replace(/[^a-z]/g, '')
    if (ACRONYMS.has(bare)) return w.toUpperCase()
    if (i > 0 && SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase()
    if (w.length <= 3 && w === w.toUpperCase()) return w
    return w[0].toUpperCase() + w.slice(1).toLowerCase()
  })
  .join(' ')

// 'AC Service'.toLowerCase() reads as "ac service companies" in a description.
export const serviceInProse = (service) => service
  .toLowerCase()
  .split(' ')
  .map((w) => (ACRONYMS.has(w.replace(/[^a-z]/g, '')) ? w.toUpperCase() : w))
  .join(' ')

const tokens = (s) => (s || '').toLowerCase().match(/[a-z\u0600-\u06FF]{2,}/g) || []
const meaningful = (s) => tokens(s).filter((t) => !STOPWORDS.has(t))

// Words that prove nothing about relevance — every service on the site is a
// "service" offered by a "company" in "Dubai".
const GENERIC = new Set(['service', 'services', 'company', 'companies', 'dubai', 'uae', 'home', 'general', 'work', 'works'])

// Vocabulary the service's own name does not spell out. 'AC Service' tokenises
// to nothing usable ('ac' is two letters, 'service' is generic), and nobody
// searches "false ceiling & partition" — they search "gypsum partition".
const SERVICE_KEYWORDS = {
  'AC Service': ['ac', 'hvac', 'aircon', 'air', 'conditioning', 'conditioner', 'cooling', 'chiller', 'duct'],
  'Fit-Out': ['fitout', 'fit', 'out'],
  'Carpentry & Joinery': ['carpenter', 'carpenters', 'joiner', 'joinery', 'woodwork', 'wardrobe', 'wardrobes'],
  'False Ceiling & Partition': ['gypsum', 'ceiling', 'ceilings', 'partition', 'partitions', 'drywall'],
  'Smart Home & Automation': ['automation', 'smart', 'knx'],
  'Curtains & Blinds': ['curtain', 'curtains', 'blind', 'blinds', 'shutter', 'shutters'],
  'Swimming Pool': ['pool', 'pools', 'jacuzzi'],
  'Kitchen Renovation': ['kitchen', 'kitchens', 'cabinet', 'cabinets'],
  'Bathroom Renovation': ['bathroom', 'bathrooms', 'toilet'],
  'Pest Control': ['pest', 'cockroach', 'termite', 'bed bugs'],
  'Waterproofing': ['waterproof', 'waterproofing', 'leak', 'leakage'],
  'Interior Design': ['interior', 'interiors', 'designer', 'designers', 'decor', 'decoration'],
  'Electrical': ['electrical', 'electrician', 'electricians', 'wiring'],
  'Plumbing': ['plumbing', 'plumber', 'plumbers'],
  'Landscaping': ['landscape', 'landscaping', 'garden', 'gardening', 'gardener'],
  'Flooring': ['flooring', 'floor', 'tiles', 'tiling', 'parquet', 'marble'],
  'Painting': ['painting', 'painter', 'painters', 'paint'],
  'Cleaning': ['cleaning', 'cleaner', 'cleaners', 'maid'],
  'Handyman': ['handyman', 'repair', 'repairs', 'fixing'],
  'Renovation': ['renovation', 'renovate', 'remodel', 'remodeling', 'refurbishment'],
}

// The words that, appearing in a query, show it is about this service. Built from
// the service name, the DB labels that alias to it (so 'HVAC & AC' counts for
// 'AC Service') and the map above.
export function serviceTokens(service) {
  const labels = SERVICE_DB_LABELS[service] || [service]
  const fromLabels = labels.flatMap((l) => tokens(l)).filter((t) => t.length >= 3)
  return new Set([...fromLabels, ...(SERVICE_KEYWORDS[service] || [])].filter((t) => !GENERIC.has(t)))
}

// Exact match for short tokens; prefix match only once both sides are long
// enough that it means something ('designers' ~ 'design', but not 'ac' ~ 'academy').
const tokenMatch = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a)))

// A query may only rename a page when it is about that page's SERVICE. Matching
// the area alone is not enough: "villa for rent al barsha" is about Al Barsha
// and has nothing to do with the interior-design page it landed on.
export function isRelevant(query, service, area) {
  const subject = serviceTokens(service)
  if (!subject.size) return false
  return tokens(query).some((t) => [...subject].some((s) => tokenMatch(t, s)))
}

// Rejects anything we should not put in front of a searcher. Returns null when
// the candidate is fine, or the reason it is not.
export function validate({ title, description, service, area }) {
  const subject = [...serviceTokens(service), ...tokens(area || '')]
  const inTitle = tokens(title)
  if (title.length < TITLE_MIN) return `title too short (${title.length})`
  if (title.length > TITLE_MAX) return `title too long (${title.length})`
  if (description.length < DESC_MIN) return `description too short (${description.length})`
  if (description.length > DESC_MAX) return `description too long (${description.length})`
  if (!/quvera/i.test(title)) return 'title does not carry the brand'
  if (!subject.some((t) => inTitle.includes(t))) return 'title does not name the page subject'
  if (/[<>{}\\|]{2,}|\s{2,}|undefined|null|NaN/.test(title + description)) return 'title/description contains junk'
  if (/https?:|www\.|@|\+\d{6,}/.test(title + description)) return 'title/description contains a URL, email or phone'
  const letters = title.replace(/[^A-Za-z]/g, '')
  if (letters.length > 8 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.6) return 'title is shouting'
  return null
}

// Builds the candidate copy for one page from its real queries.
export function buildCandidate({ service, area, queries }) {
  const where = area || 'Dubai'
  const relevant = queries.filter((q) => q.impressions >= MIN_QUERY_IMPRESSIONS && isRelevant(q.query, service, area))
  if (!relevant.length) return { skip: 'no relevant query above the impression floor' }
  const top = relevant[0]
  const phrase = titleCase(top.query.replace(/\bquvera\b/gi, '').replace(/\s+/g, ' ').trim())
  if (!phrase) return { skip: 'top query is empty after cleaning' }

  const mentionsPlace = new RegExp(`\\b(dubai|uae|${(area || '').toLowerCase().replace(/[^a-z ]/g, '')})\\b`, 'i').test(top.query)
  // Don't say "companies" twice when the query already does.
  const suffix = /\bcompan(y|ies)\b/i.test(phrase) ? 'Verified & Reviewed – Quvera' : 'Verified Companies – Quvera'
  const candidates = [
    mentionsPlace ? `${phrase} | ${suffix}` : `${phrase} in ${where} | ${suffix}`,
    mentionsPlace ? `${phrase} | Verified – Quvera` : `${phrase} in ${where} | Verified – Quvera`,
    `${phrase} | Quvera`,
  ]
  const title = candidates.find((t) => t.length <= TITLE_MAX && t.length >= TITLE_MIN) || candidates[candidates.length - 1]

  // Secondary queries go in the description, which is where the long-tail
  // phrasings earn their keep without making the title unreadable.
  const extras = []
  for (const q of relevant.slice(1)) {
    const t = q.query.toLowerCase().trim()
    if (extras.length >= 2) break
    if (meaningful(t).some((w) => meaningful(extras.join(' ')).includes(w))) continue
    if (t !== top.query.toLowerCase()) extras.push(t)
  }
  const tail = extras.length ? `Includes ${extras.join(' and ')}.` : 'Real reviews, verified trade licences and trust scores.'
  let description = `Compare verified ${serviceInProse(service)} companies in ${where} on Quvera. ${tail} Get up to 3 free quotes, no obligation.`
  if (description.length > DESC_MAX) {
    description = `Compare verified ${serviceInProse(service)} companies in ${where} on Quvera. Real reviews, trust scores and up to 3 free quotes — no obligation.`.slice(0, DESC_MAX)
  }

  const reason = validate({ title, description, service, area })
  if (reason) return { skip: reason, title, description }
  return {
    title, description, templateVersion: TEMPLATE_VERSION,
    from: { query: top.query, impressions: top.impressions, position: Number(top.position.toFixed(1)), ctr: Number((top.ctr * 100).toFixed(2)) },
  }
}

// Does this page need its snippet rewritten at all? Impressions with no clicks,
// or a position where the snippet is what decides the click.
export function qualifies(page) {
  if (page.impressions < MIN_IMPRESSIONS) return false
  const [lo, hi] = POSITION_BAND
  return page.ctr < CTR_FLOOR || (page.position >= lo && page.position <= hi)
}

const TODAY = new Date().toISOString().slice(0, 10)

const readJson = (p, fallback) => {
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return fallback }
}

const EMPTY = { generatedAt: null, window: null, source: 'none', overrides: {}, skipped: [], stats: {} }

async function main() {
  const previous = readJson(OUT, EMPTY)

  if (!gscAvailable()) {
    console.log('seoOverrides: GSC_SERVICE_ACCOUNT_JSON not set — keeping the existing file.')
    if (!existsSync(OUT)) {
      mkdirSync(dirname(OUT), { recursive: true })
      writeFileSync(OUT, JSON.stringify(EMPTY, null, 2) + '\n')
      console.log('seoOverrides: wrote an empty skeleton so the import resolves.')
    }
    return
  }

  const win = searchWindow({ days: Number(process.env.SEO_WINDOW_DAYS || 28) })
  let rows
  try {
    rows = await searchAnalytics({ ...win, dimensions: ['page', 'query'] })
  } catch (e) {
    console.warn(`seoOverrides: Search Console query failed (${e.message}) — keeping the existing file.`)
    return
  }

  const eligibility = readJson(ELIGIBILITY_PATH, { services: [], combos: {} })
  const isEligible = (slug) => eligibility.combos?.[slug] != null ||
    (eligibility.services || []).some((s) => slug === s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))

  const pages = byPage(rows)
  const overrides = {}
  const skipped = []
  let considered = 0, kept = 0, replaced = 0, fresh = 0, refreshed = 0

  for (const page of Object.values(pages).sort((a, b) => b.impressions - a.impressions)) {
    if (!page.path.startsWith('/services/')) continue
    const slug = page.path.slice('/services/'.length)
    const { service, area } = resolveSlug(slug)
    if (!service) { skipped.push({ slug, reason: 'slug resolves to no service' }); continue }
    if (!isEligible(slug)) { skipped.push({ slug, reason: 'page is not indexable (no companies)' }); continue }
    if (!qualifies(page)) continue
    considered++

    const candidate = buildCandidate({ service, area, queries: page.queries })
    const prior = previous.overrides?.[slug]

    if (candidate.skip) {
      // A page that fails validation keeps whatever it already had rather than
      // losing a working override to one bad week of data.
      if (prior) { overrides[slug] = prior; kept++ }
      else skipped.push({ slug, reason: candidate.skip })
      continue
    }

    if (prior) {
      const sameQuery = prior.from?.query === candidate.from.query
      const overtaken = !sameQuery && candidate.from.impressions >= (prior.from?.impressions || 0) * CHURN_RATIO
      if (sameQuery) {
        if (prior.templateVersion !== TEMPLATE_VERSION) {
          // Same query, newer copy template: rebuild the wording, keep firstSeen.
          overrides[slug] = { ...candidate, firstSeen: prior.firstSeen || TODAY }
          refreshed++
        } else {
          // Nothing changed that matters: refresh the metrics, leave the copy alone.
          overrides[slug] = { ...prior, from: candidate.from }
          kept++
        }
      } else if (overtaken) {
        overrides[slug] = { ...candidate, firstSeen: TODAY, replaces: prior.from?.query }
        replaced++
      } else {
        overrides[slug] = prior
        kept++
      }
      continue
    }

    overrides[slug] = { ...candidate, firstSeen: TODAY }
    fresh++
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    window: win,
    source: 'gsc',
    overrides,
    skipped: skipped.slice(0, 50),
    stats: {
      pagesWithData: Object.keys(pages).length,
      servicePagesConsidered: considered,
      overridesLive: Object.keys(overrides).length,
      new: fresh, kept, replaced, refreshed, skipped: skipped.length,
      thresholds: { MIN_IMPRESSIONS, CTR_FLOOR, POSITION_BAND, MIN_QUERY_IMPRESSIONS, CHURN_RATIO },
    },
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')

  console.log(`seoOverrides: ${win.startDate}..${win.endDate}, ${payload.stats.pagesWithData} pages with query data`)
  console.log(`  ${considered} service pages qualified → ${Object.keys(overrides).length} overrides live (${fresh} new, ${replaced} replaced, ${refreshed} re-worded, ${kept} unchanged, ${skipped.length} skipped)`)
}

// Only run when invoked directly, so the pure functions above stay testable.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.warn('seoOverrides: unexpected error — keeping the existing file. ' + e.message); process.exit(0) })
}
