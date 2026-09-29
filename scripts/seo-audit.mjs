// Weekly SEO audit + report.
//
// Audits the LIVE site by default, not a local build: the questions worth asking
// weekly are whether the deployed HTML still carries a correct canonical, title,
// description and JSON-LD, and whether Search Console rankings moved. A local
// build cannot answer either.
//
//   node scripts/seo-audit.mjs                     # live, sampled companies
//   node scripts/seo-audit.mjs --all               # live, every sitemap URL
//   node scripts/seo-audit.mjs --dist              # the local dist/ instead
//   node scripts/seo-audit.mjs --strict            # exit 1 if any error-level finding
//
// Writes seo/report-latest.md (the weekly report) and seo/history/<date>.json
// (machine-readable, so the next run can report deltas). Search Console numbers
// are included when GSC_SERVICE_ACCOUNT_JSON is set; without it the technical
// audit still runs and the report says the query data was unavailable.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gscAvailable, searchAnalytics, searchWindow, byPage, pathOf } from './gsc.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')
const SEO_DIR = join(ROOT, 'seo')
const HISTORY = join(SEO_DIR, 'history')

const argv = process.argv.slice(2)
const flag = (name) => argv.includes('--' + name)
const opt = (name, def) => {
  const i = argv.indexOf('--' + name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def
}

const BASE = (opt('base', 'https://www.quvera.ae')).replace(/\/$/, '')
const LOCAL = flag('dist')
const COMPANY_SAMPLE = flag('all') ? Infinity : Number(opt('companies', 60))
const CONCURRENCY = Number(opt('concurrency', 8))
const TODAY = new Date().toISOString().slice(0, 10)

/* -------------------------------------------------------------------------- */
/* fetching                                                                   */
/* -------------------------------------------------------------------------- */

async function getPage(path) {
  if (LOCAL) {
    const candidates = path === '/'
      ? [join(DIST, 'index.html')]
      : [join(DIST, path), join(DIST, path, 'index.html')]
    for (const f of candidates) {
      try { return { status: 200, html: readFileSync(f, 'utf8') } } catch { /* next */ }
    }
    return { status: 404, html: '' }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: { 'user-agent': 'QuveraSEOAudit/1.0' }, redirect: 'follow' })
      return { status: res.status, html: res.ok ? await res.text() : '' }
    } catch (e) {
      if (attempt) return { status: 0, html: '', error: e.message }
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  return { status: 0, html: '' }
}

async function mapLimit(items, limit, fn) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  }))
  return out
}

/* -------------------------------------------------------------------------- */
/* parsing — regex rather than a DOM, to keep this dependency-free            */
/* -------------------------------------------------------------------------- */

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? (m[2] ?? m[3] ?? '') : null
}
const metaContent = (html, name, asProperty = false) => {
  const re = new RegExp(`<meta[^>]*${asProperty ? 'property' : 'name'}\\s*=\\s*["']${name}["'][^>]*>`, 'i')
  const m = html.match(re)
  return m ? attr(m[0], 'content') : null
}

// Titles and descriptions arrive HTML-escaped, so "Carpentry &amp; Joinery"
// measured five characters longer than it renders. That inflated the
// title-too-long count — the homepage reads 65 characters and was reported as 69.
const decodeEntities = (s) => (s || '')
  .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'",
  }[e]))
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

export function parsePage(html) {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const canonM = html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)
  const jsonld = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const types = []
  let jsonldValid = true
  for (const m of jsonld) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const nodes = parsed['@graph'] || [parsed]
      for (const n of nodes) if (n && n['@type']) types.push(n['@type'])
    } catch { jsonldValid = false }
  }
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  return {
    title: titleM ? decodeEntities(titleM[1]).replace(/\s+/g, ' ').trim() : null,
    description: decodeEntities(metaContent(html, 'description')) || null,
    robots: metaContent(html, 'robots'),
    canonical: canonM ? attr(canonM[0], 'href') : null,
    ogImage: metaContent(html, 'og:image', true),
    twitterCard: metaContent(html, 'twitter:card'),
    h1Count: (body.match(/<h1[\s>]/gi) || []).length,
    jsonldCount: jsonld.length,
    jsonldValid,
    jsonldTypes: [...new Set(types)],
    textLength: body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length,
  }
}

/* -------------------------------------------------------------------------- */
/* checks                                                                     */
/* -------------------------------------------------------------------------- */

const norm = (u) => (u || '').replace(/\/+$/, '') || '/'

export function checkPage({ path, status, page, kind }) {
  const f = []
  const add = (severity, rule, detail) => f.push({ severity, rule, path, detail })
  if (status !== 200) { add('error', 'http-error', `HTTP ${status}`); return f }

  const expected = norm(BASE + path)

  if (!page.title) add('error', 'title-missing', '')
  else if (page.title.length > 65) add('warn', 'title-too-long', `${page.title.length} chars`)
  else if (page.title.length < 15) add('warn', 'title-too-short', `${page.title.length} chars`)

  // Service page titles carry the current year ("Top 10 Fit-Out Companies in
  // Dubai (2026)"), which is a freshness signal while it is true and a liability
  // the moment it is not. The prerendered HTML only changes on a deploy, so this
  // is what catches a site that has not been rebuilt since December.
  const yearInTitle = (page.title || '').match(/\((20\d{2})\)/)
  if (yearInTitle && Number(yearInTitle[1]) !== new Date().getFullYear()) {
    add('warn', 'stale-year-in-title', `title says ${yearInTitle[1]} — redeploy to refresh it`)
  }

  if (!page.description) add('error', 'description-missing', '')
  else if (page.description.length > 160) add('warn', 'description-too-long', `${page.description.length} chars`)
  else if (page.description.length < 70) add('warn', 'description-too-short', `${page.description.length} chars`)

  if (!page.canonical) add('error', 'canonical-missing', '')
  else if (norm(page.canonical) !== expected) add('error', 'canonical-mismatch', `points at ${page.canonical}`)

  // A URL we submit in the sitemap telling Google not to index it is a
  // contradiction — one of the two is wrong.
  if (/noindex/i.test(page.robots || '')) add('error', 'noindex-in-sitemap', page.robots)

  if (!page.jsonldValid) add('error', 'jsonld-invalid', 'a ld+json block does not parse')
  else if (kind !== 'static-file' && page.jsonldCount === 0) add('warn', 'jsonld-missing', '')

  if (!page.ogImage) add('warn', 'og-image-missing', '')
  else if (/icon-\d+\.png$/.test(page.ogImage) && /summary_large_image/.test(page.twitterCard || '')) {
    add('warn', 'og-image-square', `${page.ogImage} with a wide card`)
  }

  if (page.h1Count === 0) add('warn', 'h1-missing', '')
  // Company profiles prerender a deliberately light SEO body, so the floor only
  // applies to the pages whose job is to carry content.
  const thinFloor = kind === 'company' ? 250 : 600
  if (page.textLength < thinFloor) add('warn', 'thin-content', `${page.textLength} chars of text`)

  return f
}

/* -------------------------------------------------------------------------- */
/* sitemap                                                                    */
/* -------------------------------------------------------------------------- */

// The build's self-reported prerender stats, shipped to the live site. Tells us
// whether the HTML Google is reading was actually prerendered this week.
async function loadBuildStats() {
  try {
    if (LOCAL) return JSON.parse(readFileSync(join(DIST, '__prerender_stats.json'), 'utf8'))
    const res = await fetch(BASE + '/__prerender_stats.json')
    return res.ok ? await res.json() : null
  } catch { return null }
}

async function loadSitemap() {
  const xml = LOCAL
    ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8')
    : await fetch(BASE + '/sitemap.xml').then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1] || '',
    lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || null,
  })).filter((e) => e.loc)
  const findings = []
  const seen = new Set()
  for (const e of entries) {
    if (seen.has(e.loc)) findings.push({ severity: 'error', rule: 'sitemap-duplicate', path: e.loc, detail: '' })
    seen.add(e.loc)
    if (!e.loc.startsWith(BASE + '/') && !LOCAL) findings.push({ severity: 'error', rule: 'sitemap-foreign-host', path: e.loc, detail: '' })
    if (e.lastmod && e.lastmod > TODAY) findings.push({ severity: 'warn', rule: 'sitemap-lastmod-future', path: e.loc, detail: e.lastmod })
  }
  if (!entries.length) findings.push({ severity: 'error', rule: 'sitemap-empty', path: '/sitemap.xml', detail: '' })
  return { entries, findings }
}

const kindOf = (path) => {
  if (/\.html$/.test(path) || path === '/os/') return 'static-file'
  if (path.startsWith('/services/')) return 'service'
  if (['/', '/partner', '/claim-company', '/terms', '/privacy', '/refund'].includes(path)) return 'static'
  return 'company'
}

/* -------------------------------------------------------------------------- */
/* Search Console section                                                     */
/* -------------------------------------------------------------------------- */

const pct = (n) => `${(n * 100).toFixed(2)}%`
const delta = (now, then, digits = 0) => {
  if (then == null) return '—'
  const d = now - then
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(digits)}`
}

async function searchPerformance() {
  if (!gscAvailable()) return { available: false }
  const days = Number(process.env.SEO_WINDOW_DAYS || 28)
  const current = searchWindow({ days })
  const prevEnd = new Date(new Date(current.startDate).getTime() - 86400000)
  const prev = {
    startDate: new Date(prevEnd.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10),
    endDate: prevEnd.toISOString().slice(0, 10),
  }
  try {
    const [nowPages, thenPages, nowQueries] = await Promise.all([
      searchAnalytics({ ...current, dimensions: ['page'] }),
      searchAnalytics({ ...prev, dimensions: ['page'] }),
      searchAnalytics({ ...current, dimensions: ['query', 'page'] }),
    ])
    const totals = (rows) => rows.reduce((a, r) => ({
      clicks: a.clicks + (r.clicks || 0),
      impressions: a.impressions + (r.impressions || 0),
      positionSum: a.positionSum + (r.position || 0) * (r.impressions || 0),
    }), { clicks: 0, impressions: 0, positionSum: 0 })
    const t = totals(nowPages), p = totals(thenPages)
    const fold = (rows) => Object.fromEntries(Object.entries(byPage(rows)).map(([k, v]) => [k, v]))
    const nowBy = fold(nowPages), thenBy = fold(thenPages)

    const movers = Object.values(nowBy).map((page) => ({
      path: page.path,
      clicks: page.clicks,
      clicksBefore: thenBy[page.path]?.clicks ?? 0,
      impressions: page.impressions,
      position: page.position,
      positionBefore: thenBy[page.path]?.position ?? null,
    }))

    // Queries ranking 11-20: one page of ranking away from clicks. This is the
    // list that tells a human where the next win is.
    const striking = nowQueries
      .map((r) => ({ query: r.keys[0], path: pathOf(r.keys[1]), clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position || 0, ctr: r.ctr || 0 }))
      .filter((r) => r.position > 10 && r.position <= 20 && r.impressions >= 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15)

    const noClicks = Object.values(nowBy)
      .filter((x) => x.clicks === 0 && x.impressions >= 40)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15)

    return {
      available: true, current, prev,
      totals: {
        clicks: t.clicks, impressions: t.impressions,
        ctr: t.impressions ? t.clicks / t.impressions : 0,
        position: t.impressions ? t.positionSum / t.impressions : 0,
      },
      previousTotals: {
        clicks: p.clicks, impressions: p.impressions,
        ctr: p.impressions ? p.clicks / p.impressions : 0,
        position: p.impressions ? p.positionSum / p.impressions : 0,
      },
      gainers: [...movers].sort((a, b) => (b.clicks - b.clicksBefore) - (a.clicks - a.clicksBefore)).slice(0, 8),
      losers: [...movers].sort((a, b) => (a.clicks - a.clicksBefore) - (b.clicks - b.clicksBefore)).filter((m) => m.clicks < m.clicksBefore).slice(0, 8),
      striking, noClicks,
      pagesWithImpressions: Object.keys(nowBy).length,
    }
  } catch (e) {
    return { available: false, error: e.message }
  }
}

/* -------------------------------------------------------------------------- */
/* report                                                                     */
/* -------------------------------------------------------------------------- */

function previousRun() {
  if (!existsSync(HISTORY)) return null
  const files = readdirSync(HISTORY).filter((f) => f.endsWith('.json')).sort()
  if (!files.length) return null
  try { return JSON.parse(readFileSync(join(HISTORY, files[files.length - 1]), 'utf8')) } catch { return null }
}

function buildReport({ sitemap, findings, checked, perf, overrides, prevRun, build }) {
  const bySeverity = (s) => findings.filter((f) => f.severity === s)
  const errors = bySeverity('error')
  const warns = bySeverity('warn')
  const count = (list) => {
    const m = {}
    for (const f of list) m[f.rule] = (m[f.rule] || 0) + 1
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }
  const L = []
  L.push(`# Quvera — weekly SEO report`)
  L.push('')
  L.push(`**${TODAY}** · ${LOCAL ? 'local dist/' : BASE} · ${checked} pages checked · ${sitemap.entries.length} URLs in sitemap`)
  if (prevRun) L.push(`_Previous run ${prevRun.date}: ${prevRun.sitemapUrls} sitemap URLs, ${prevRun.errors} errors, ${prevRun.warnings} warnings._`)
  L.push('')

  L.push('## 1. Search performance')
  L.push('')
  if (!perf.available) {
    L.push(perf.error
      ? `Search Console data unavailable this run: ${perf.error}`
      : 'Search Console data unavailable: `GSC_SERVICE_ACCOUNT_JSON` is not set. See SEO.md for the one-time setup.')
    L.push('')
  } else {
    const t = perf.totals, p = perf.previousTotals
    L.push(`Window **${perf.current.startDate} → ${perf.current.endDate}** vs the ${perf.prev.startDate} → ${perf.prev.endDate} window.`)
    L.push('')
    L.push('| Metric | This window | Previous | Change |')
    L.push('|---|---|---|---|')
    L.push(`| Clicks | ${t.clicks} | ${p.clicks} | ${delta(t.clicks, p.clicks)} |`)
    L.push(`| Impressions | ${t.impressions} | ${p.impressions} | ${delta(t.impressions, p.impressions)} |`)
    L.push(`| CTR | ${pct(t.ctr)} | ${pct(p.ctr)} | ${delta(t.ctr * 100, p.ctr * 100, 2)} pp |`)
    L.push(`| Avg position | ${t.position.toFixed(1)} | ${p.position.toFixed(1)} | ${delta(t.position, p.position, 1)} (lower is better) |`)
    L.push(`| Pages with impressions | ${perf.pagesWithImpressions} | — | — |`)
    L.push('')
    if (perf.gainers.length) {
      L.push('**Gained the most clicks**')
      L.push('')
      L.push('| Page | Clicks | Was | Position |')
      L.push('|---|---|---|---|')
      for (const g of perf.gainers) L.push(`| \`${g.path}\` | ${g.clicks} | ${g.clicksBefore} | ${g.position.toFixed(1)} |`)
      L.push('')
    }
    if (perf.losers.length) {
      L.push('**Lost the most clicks** — check these first')
      L.push('')
      L.push('| Page | Clicks | Was | Position | Was |')
      L.push('|---|---|---|---|---|')
      for (const g of perf.losers) L.push(`| \`${g.path}\` | ${g.clicks} | ${g.clicksBefore} | ${g.position.toFixed(1)} | ${g.positionBefore == null ? '—' : g.positionBefore.toFixed(1)} |`)
      L.push('')
    }
    if (perf.striking.length) {
      L.push('**Striking distance** (position 11–20 — one page of ranking from real traffic)')
      L.push('')
      L.push('| Query | Page | Impressions | Position |')
      L.push('|---|---|---|---|')
      for (const s of perf.striking) L.push(`| ${s.query} | \`${s.path}\` | ${s.impressions} | ${s.position.toFixed(1)} |`)
      L.push('')
    }
    if (perf.noClicks.length) {
      L.push('**Impressions but zero clicks** — snippet problems, which is what the weekly override job targets')
      L.push('')
      L.push('| Page | Impressions | Position |')
      L.push('|---|---|---|')
      for (const s of perf.noClicks) L.push(`| \`${s.path}\` | ${s.impressions} | ${s.position.toFixed(1)} |`)
      L.push('')
    }
  }

  L.push('## 2. Auto-updates applied')
  L.push('')
  if (overrides?.source === 'gsc') {
    const s = overrides.stats || {}
    L.push(`Title/meta overrides regenerated from Search Console (${overrides.window?.startDate} → ${overrides.window?.endDate}):`)
    L.push('')
    L.push(`- **${s.overridesLive ?? 0}** overrides live — ${s.new ?? 0} new, ${s.replaced ?? 0} replaced, ${s.refreshed ?? 0} re-worded, ${s.kept ?? 0} unchanged, ${s.skipped ?? 0} skipped by validation`)
    L.push(`- ${s.servicePagesConsidered ?? 0} service pages qualified out of ${s.pagesWithData ?? 0} with query data`)
    L.push('')
    const fresh = Object.entries(overrides.overrides || {}).filter(([, v]) => v.firstSeen === TODAY)
    if (fresh.length) {
      L.push('Live since today:')
      L.push('')
      for (const [slug, v] of fresh.slice(0, 15)) {
        L.push(`- \`/services/${slug}\` → “${v.title}”  \n  from query “${v.from?.query}” (${v.from?.impressions} impressions, position ${v.from?.position})`)
      }
      L.push('')
    }
  } else {
    L.push('No override refresh this run (no Search Console credentials). Pages are on their templates, which is the safe default.')
    L.push('')
  }
  L.push(`- Sitemap: **${sitemap.entries.length}** URLs${prevRun ? ` (${delta(sitemap.entries.length, prevRun.sitemapUrls)} vs last week)` : ''}, regenerated every build from live company data`)
  if (build) {
    const age = build.builtAt ? Math.round((Date.now() - Date.parse(build.builtAt)) / 3600000) : null
    L.push(`- Live build: ${build.prerendered}/${build.routes} routes prerendered (${build.full} full, ${build.partial} partial, ${build.failed} failed)` +
      (age == null ? '' : `, built ${age}h ago`) + (build.budgetHit ? ' — **the crawl budget was hit, some routes shipped as the SPA shell**' : ''))
  } else {
    L.push('- Live build: prerender stats unavailable (`/__prerender_stats.json` not reachable)')
  }
  L.push('')

  L.push('## 3. Technical audit')
  L.push('')
  L.push(`**${errors.length} errors · ${warns.length} warnings** across ${checked} pages.`)
  L.push('')
  if (errors.length) {
    L.push('| Error | Count |')
    L.push('|---|---|')
    for (const [rule, n] of count(errors)) L.push(`| \`${rule}\` | ${n} |`)
    L.push('')
    L.push('<details><summary>First 40 errors in detail</summary>')
    L.push('')
    for (const f of errors.slice(0, 40)) L.push(`- \`${f.rule}\` — \`${f.path}\`${f.detail ? ` — ${f.detail}` : ''}`)
    L.push('')
    L.push('</details>')
    L.push('')
  } else {
    L.push('No errors. Every checked page has a self-referencing canonical, a title, a description and valid structured data.')
    L.push('')
  }
  if (warns.length) {
    L.push('| Warning | Count |')
    L.push('|---|---|')
    for (const [rule, n] of count(warns)) L.push(`| \`${rule}\` | ${n} |`)
    L.push('')
    L.push('<details><summary>First 30 warnings in detail</summary>')
    L.push('')
    for (const f of warns.slice(0, 30)) L.push(`- \`${f.rule}\` — \`${f.path}\`${f.detail ? ` — ${f.detail}` : ''}`)
    L.push('')
    L.push('</details>')
    L.push('')
  }

  L.push('## 4. What to do next')
  L.push('')
  const next = []
  if (errors.length) next.push(`Fix the ${errors.length} error-level finding(s) above — those cost indexing, not just ranking.`)
  if (perf.available && perf.striking?.length) next.push(`Strengthen the ${perf.striking.length} striking-distance page(s): more on-page depth and internal links to them.`)
  if (perf.available && perf.losers?.length) next.push(`Check the ${perf.losers.length} page(s) losing clicks — compare their titles against the queries they used to win.`)
  if (!perf.available) next.push('Add the `GSC_SERVICE_ACCOUNT_JSON` secret so the ranking half of this report and the automatic title tuning can run (SEO.md).')
  if (!next.length) next.push('Nothing blocking. The loop keeps the sitemap, overrides and this report current on its own.')
  for (const n of next) L.push(`- ${n}`)
  L.push('')
  L.push('---')
  L.push(`_Generated by \`npm run seo:audit\`. Machine-readable copy: \`seo/history/${TODAY}.json\`._`)
  return L.join('\n') + '\n'
}

/* -------------------------------------------------------------------------- */

async function main() {
  const sitemap = await loadSitemap()
  const paths = sitemap.entries
    .map((e) => { try { return new URL(e.loc).pathname } catch { return null } })
    .filter(Boolean)

  // Non-company pages are always checked in full — they are the templates, so a
  // regression there hits hundreds of URLs. Company profiles are sampled evenly
  // across the list unless --all is passed.
  const nonCompany = paths.filter((p) => kindOf(p) !== 'company')
  const company = paths.filter((p) => kindOf(p) === 'company')
  const step = Math.max(1, Math.ceil(company.length / COMPANY_SAMPLE))
  const sampled = COMPANY_SAMPLE === Infinity ? company : company.filter((_, i) => i % step === 0)
  const toCheck = [...nonCompany, ...sampled]

  console.log(`SEO audit: ${LOCAL ? 'dist/' : BASE} — ${toCheck.length} pages (${nonCompany.length} template/static + ${sampled.length} of ${company.length} company profiles)`)

  const findings = [...sitemap.findings]
  const push = (map, key, value) => { const arr = map.get(key) || []; arr.push(value); map.set(key, arr) }
  const titles = new Map()
  const descriptions = new Map()
  let done = 0

  const results = await mapLimit(toCheck, CONCURRENCY, async (path) => {
    const { status, html } = await getPage(path)
    const page = status === 200 ? parsePage(html) : null
    if (++done % 50 === 0) console.log(`   ${done}/${toCheck.length}`)
    return { path, status, page }
  })

  for (const r of results) {
    findings.push(...checkPage({ path: r.path, status: r.status, page: r.page || {}, kind: kindOf(r.path) }))
    if (!r.page) continue
    if (r.page.title) push(titles, r.page.title, r.path)
    if (r.page.description) push(descriptions, r.page.description, r.path)
  }
  // Duplicate titles/descriptions across pages: two URLs competing for the same
  // query, which is how a template bug shows up at scale.
  for (const [title, where] of titles) {
    if (where.length > 1) findings.push({ severity: 'warn', rule: 'duplicate-title', path: where.slice(0, 4).join(', '), detail: `${where.length} pages share “${title.slice(0, 60)}”` })
  }
  for (const [, where] of descriptions) {
    if (where.length > 1) findings.push({ severity: 'warn', rule: 'duplicate-description', path: where.slice(0, 4).join(', '), detail: `${where.length} pages` })
  }

  const [perf, build] = await Promise.all([searchPerformance(), loadBuildStats()])
  let overrides = null
  try { overrides = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'seoOverrides.json'), 'utf8')) } catch { /* optional */ }
  const prevRun = previousRun()

  const report = buildReport({ sitemap, findings, checked: toCheck.length, perf, overrides, prevRun, build })
  mkdirSync(HISTORY, { recursive: true })
  writeFileSync(join(SEO_DIR, 'report-latest.md'), report)
  writeFileSync(join(HISTORY, `${TODAY}.json`), JSON.stringify({
    date: TODAY,
    base: LOCAL ? 'dist' : BASE,
    sitemapUrls: sitemap.entries.length,
    checked: toCheck.length,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warn').length,
    byRule: findings.reduce((m, f) => ({ ...m, [f.rule]: (m[f.rule] || 0) + 1 }), {}),
    search: perf.available ? { window: perf.current, totals: perf.totals, previousTotals: perf.previousTotals } : { available: false },
    overrides: overrides?.stats || null,
    build: build ? { builtAt: build.builtAt || null, prerendered: build.prerendered, partial: build.partial, failed: build.failed, budgetHit: build.budgetHit } : null,
  }, null, 2) + '\n')

  const errs = findings.filter((f) => f.severity === 'error').length
  const warns = findings.filter((f) => f.severity === 'warn').length
  console.log(`\n${errs ? '✗' : '✔'} ${errs} errors, ${warns} warnings — seo/report-latest.md written`)
  if (errs && flag('strict')) process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('seo-audit failed: ' + (e.stack || e.message)); process.exit(flag('strict') ? 1 : 0) })
}
