// Post-build prerender: crawls the built SPA in a real headless browser and
// writes fully-rendered static HTML for every sitemap URL. This gives crawlers
// and social scrapers correct per-page <title>, meta, canonical and JSON-LD in
// the raw HTML — which a client-rendered SPA cannot do on its own.
//
// Why a real browser (not Node SSR): the app reads document/window/localStorage
// at render time and sets SEO tags inside useEffect (see ServiceArea.jsx). Those
// only run in a browser, so a headless-Chrome snapshot captures them with zero
// source changes. Runs as part of `npm run build`, so asset hashes match.
//
// Safety: prerender never breaks the deploy — on any fatal error it logs loudly
// and exits 0, leaving the working SPA (dist/index.html + assets) in place.
import { createServer } from 'node:http'
import { readFileSync as readSync, promises as fs } from 'node:fs'
import { join, dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cpus, totalmem } from 'node:os'
import { resolveSlug, selectCompanies } from '../src/serviceAreas.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')
// Since company pages render from injected data (no Supabase per page), the crawl
// is CPU/render-bound, so scale concurrency with the container's cores. Vercel's
// build box is bigger than its Lambda runtime, so this unblocks real parallelism.
const CPU_COUNT = cpus().length
// Company pages now render a light SEO-only body during prerender, so the crawl
// is largely IO/navigation-bound — over-subscribing the cores helps overlap it.
const CONCURRENCY = Math.min(16, Math.max(8, CPU_COUNT * 2))
const NAV_TIMEOUT = 25000
// Hard wall-clock budget for the whole crawl. If a slow/rate-limited DB drags
// it out, we stop taking new pages and ship what we have (uncrawled routes fall
// back to the SPA) — so the build always finishes well under Vercel's ~45min cap.
const MAX_CRAWL_MS = 33 * 60 * 1000
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Public Supabase creds (same anon values shipped in the client). Used ONCE to
// bulk-fetch the SEO fields for every company, which we inject into each page so
// the crawl needs no per-page DB query (see armPage / PublicProfile prerender path).
const SUPABASE_URL = 'https://ribdorraxxhfbfkjhpie.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYmRvcnJheHhoZmJma2pocGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTkzNDUsImV4cCI6MjA5NTM3NTM0NX0.w5EMvd47CtWTc-8NgTlsM44EYmbGSQHc79wgjXTQlHE'

async function fetchCompanyMap() {
  const map = {}
  const fields = 'slug,name,category,description,phone,location,area,avg_rating,total_reviews'
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/companies?select=${fields}&status=eq.approved&slug=not.is.null&order=slug&limit=${pageSize}&offset=${offset}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const rows = await res.json()
    for (const r of rows) {
      if (!r.slug) continue
      map[r.slug] = {
        slug: r.slug,
        name: r.name,
        category: r.category || '',
        description: (r.description || '').slice(0, 160),
        phone: r.phone || '',
        location: r.location || r.area || 'Dubai',
        avg_rating: r.avg_rating != null ? r.avg_rating : null,
        total_reviews: r.total_reviews || 0,
      }
    }
    if (rows.length < pageSize) break
  }
  return map
}

// --- homepage seed --------------------------------------------------------
// '/' is in STATIC_PATHS, so the crawl never waited for its data: the snapshot
// was taken ~150ms after mount and the prerendered homepage shipped as an empty
// shell — no companies for crawlers to read. Waiting in the browser did not fix
// it (12s of network-idle still produced zeros; the DB is rate-limited with 16
// pages crawling at once), so fetch it here in Node instead, the same way the
// company map already is, and inject it into the shell we serve for '/'.
//
// Home.jsx reads this at module load, so during the crawl it renders WITH data
// (fixing the SEO gap) and the same JSON stays in the output for real visitors,
// letting React's first render match what was painted instead of blanking while
// Supabase answers.
//
// The derivation below mirrors fetchAll() in Home.jsx. Keep the two in step.
const SB = (path) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
}).then((r) => (r.ok ? r.json() : null)).catch(() => null)

// Same request, but also asks for the row count. PostgREST caps a response at
// 1000 rows, so counting the returned array undercounts a 1093-row table.
const SBCount = (path) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: 'count=estimated',
  },
}).then(async (r) => {
  if (!r.ok) return { rows: null, count: null }
  // Content-Range looks like "0-999/1093"
  const total = parseInt((r.headers.get('content-range') || '').split('/')[1], 10)
  return { rows: await r.json(), count: Number.isFinite(total) ? total : null }
}).catch(() => ({ rows: null, count: null }))

const CO_FIELDS = 'id,name,slug,category,categories,area,location,avg_rating,total_reviews,trust_score,is_verified,plan,logo_url,profile_views,created_at'
const DEFAULT_TH = { min_companies: 50, min_reviews: 100, min_rating: 3.5, min_rating_reviews: 50, min_verified: 100, trust_score_min_verified: 100 }

async function fetchHomeSeed() {
  const [settingsArr, allCo, revAll, recentRev, areaRes, categories] = await Promise.all([
    SB('platform_settings?select=*&id=eq.1'),
    SB(`companies?select=${CO_FIELDS}&status=eq.approved&order=created_at.desc&limit=50`),
    SB('reviews?select=rating,created_at&is_approved=eq.true'),
    SB('reviews?select=id,reviewer_name,rating,review_text,created_at&is_approved=eq.true&order=created_at.desc&limit=5'),
    SBCount('companies?select=area,is_verified&status=eq.approved'),
    SB('categories?select=id,name,icon,type,sort_order&is_active=eq.true&order=sort_order.asc'),
  ])
  const areaRows = areaRes.rows
  if (!allCo || !areaRows) return null            // no data → ship the shell, as before

  const th = { ...DEFAULT_TH, ...(settingsArr?.[0] || {}) }
  const minR = parseFloat(th.min_rating) || 3.5
  const approved = allCo
  const verifiedRated = approved.filter((c) => c.is_verified && (parseFloat(c.avg_rating) || 0) >= minR)

  const totalCo = areaRes.count ?? areaRows.length
  const totalRev = revAll?.length || 0
  const verifiedSeen = areaRows.filter((c) => c.is_verified).length
  const verifiedCo = (areaRows.length && totalCo > areaRows.length)
    ? Math.round(verifiedSeen * (totalCo / areaRows.length))
    : verifiedSeen
  const avg = totalRev > 0 ? (revAll.reduce((s, r) => s + r.rating, 0) / totalRev).toFixed(1) : '0.0'

  const counts = {}
  for (const r of areaRows) { const a = (r.area || '').trim(); if (a) counts[a] = (counts[a] || 0) + 1 }
  const areaList = Object.entries(counts).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count)

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const tm = (revAll || []).filter((r) => r.created_at >= monthStart)
  const n = (k) => tm.filter((r) => r.rating === k).length
  const total = tm.length
  const s5 = n(5), s4 = n(4)

  return {
    stats: { companies: totalCo, reviews: totalRev, avgRating: avg, verified: verifiedCo },
    topCos: [...verifiedRated].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 4),
    newCos: approved.slice(0, 4),
    trending: [...verifiedRated].sort((a, b) =>
      ((b.profile_views || 0) + (b.total_reviews || 0) * 3) - ((a.profile_views || 0) + (a.total_reviews || 0) * 3)
    ).slice(0, 5),
    areaList,
    recentReviews: recentRev || [],
    reviewData: {
      total, s5, s4, s3: n(3), s2: n(2), s1: n(1),
      s5_pct: total > 0 ? Math.round(s5 / total * 100) : 0,
      s4_pct: total > 0 ? Math.round(s4 / total * 100) : 0,
    },
    trustScore: Math.min(100, Math.round(
      (verifiedCo / Math.max(totalCo, 1)) * 40 + (parseFloat(avg) / 5) * 40 + Math.min(totalRev / 100, 1) * 20
    )),
    thresholds: th,
    categories: categories || [],
  }
}
let HOME_SEED = null

// --- service-page seeds ----------------------------------------------------
// /services/:slug pages had the same hole as the homepage, for a different
// reason: ServiceArea calls applySEO([]) on mount, so #jsonld-service exists
// immediately and the crawler's wait for it was satisfied before any company
// data arrived. So these prerendered with an empty list — including the two
// highest-impression pages in Search Console.
//
// One bulk fetch here, then each route's list is computed with the same
// selectCompanies() the page uses at runtime, so seed and fetch agree.
const SA_FIELDS = 'id,name,slug,category,categories,area,location,avg_rating,total_reviews,plan,is_verified,logo_url'
// Enough to fill the visible list; the client fetch fills in the rest. Keeps the
// seed off pages that match hundreds of companies (a service with no area).
const SEED_MAX = 30
let SERVICE_SEEDS = {}

async function fetchServiceSeeds(routes) {
  const all = []
  for (let offset = 0; ; offset += 1000) {
    const rows = await SB(`companies?select=${SA_FIELDS}&status=eq.approved&order=id&limit=1000&offset=${offset}`)
    if (!rows || !rows.length) break
    all.push(...rows)
    if (rows.length < 1000) break
  }
  if (!all.length) return {}
  const seeds = {}
  for (const path of routes) {
    if (!path.startsWith('/services/')) continue
    const slug = path.slice('/services/'.length).replace(/\/$/, '')
    const { service, area } = resolveSlug(slug)
    if (!service) continue
    const list = selectCompanies(all, service, area)
    if (list.length) seeds[slug] = { slug, companies: list.slice(0, SEED_MAX) }
  }
  return seeds
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

function bail(msg, err) {
  console.warn('\n\x1b[33m⚠  Prerender skipped — site ships as SPA.\x1b[0m')
  console.warn('   ' + msg)
  if (err) console.warn('   ' + (err.stack || err.message || String(err)))
  process.exit(0) // never fail the deploy
}

// --- routes from the built sitemap -----------------------------------------
function readRoutes() {
  const xml = readSync(join(DIST, 'sitemap.xml'), 'utf8')
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  const paths = locs
    .map(u => { try { return new URL(u).pathname } catch { return null } })
    .filter(Boolean)
  // dedupe, keep '/' first
  return [...new Set(paths)]
}

// Company SEO data, served to pages over localhost during the crawl. Each page
// fetches ONLY its own row (tiny) — not the whole map — so the crawl stays fast
// in Vercel's constrained @sparticuz build container. No per-page Supabase call.
let COMPANY_MAP = {}
const COMPANY_EP = '/__prerender_company/'

// --- tiny static server with SPA fallback ----------------------------------
function startServer() {
  return new Promise((res) => {
    const server = createServer(async (req, resp) => {
      try {
        let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
        if (pathname.startsWith(COMPANY_EP)) {
          const slug = pathname.slice(COMPANY_EP.length).replace(/\.json$/, '')
          resp.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          return resp.end(JSON.stringify(COMPANY_MAP[slug] || null))
        }
        const ext = extname(pathname).toLowerCase()
        // asset request (has a real extension) → serve file if present
        if (ext) {
          const file = join(DIST, pathname)
          if (file.startsWith(DIST)) {
            try {
              const buf = await fs.readFile(file)
              resp.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
              return resp.end(buf)
            } catch { /* fall through to SPA shell */ }
          }
        }
        // route → original index.html shell (client JS renders per route)
        let shell = await fs.readFile(join(DIST, 'index.html'), 'utf8')
        // Each page carries only its own seed — the JSON would be dead weight on
        // the 1715 routes that never read it. Escaping </ is what stops a value
        // containing "</script>" from closing the tag early; JSON.parse reads the
        // escape back out, so the string itself is unchanged.
        const inject = (html, id, seed) =>
          html.replace('</body>', `<script id="${id}" type="application/json">${JSON.stringify(seed).replace(/<\//g, '<\\/')}</script></body>`)

        if (pathname.startsWith('/services/')) {
          const slug = pathname.slice('/services/'.length).replace(/\/$/, '')
          const seed = SERVICE_SEEDS[slug]
          if (seed) shell = inject(shell, '__service_seed__', seed)
        }
        if (pathname === '/' && HOME_SEED) shell = inject(shell, '__home_seed__', HOME_SEED)
        resp.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        resp.end(shell)
      } catch (e) {
        resp.writeHead(500); resp.end('err')
      }
    })
    server.listen(0, '127.0.0.1', () => res(server))
  })
}

// --- browser launch ---------------------------------------------------------
// Vercel's (Amazon Linux) build image lacks the system libraries a normal
// headless Chromium needs, so a plain puppeteer.launch() fails there. On that
// environment we drive a self-contained @sparticuz/chromium build via
// puppeteer-core; locally we use full puppeteer with its bundled Chromium.
async function launchBrowser() {
  const onServerless =
    !!process.env.VERCEL || !!process.env.CI || process.env.PRERENDER_CHROMIUM === 'sparticuz'

  if (onServerless) {
    console.log('   Launching @sparticuz/chromium (serverless build environment)…')
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteerCore = (await import('puppeteer-core')).default
    const executablePath = await chromium.executablePath()
    // @sparticuz defaults to --single-process / --no-zygote for Lambda's tiny
    // memory — but that serialises ALL tabs into one process, killing our
    // concurrency (crawl ran ~25x slower than local). A Vercel BUILD container
    // has plenty of RAM, so drop those and let Chromium go multi-process.
    const fastArgs = chromium.args.filter(
      (a) => a !== '--single-process' && a !== '--no-zygote'
    )
    const base = { executablePath, headless: chromium.headless, defaultViewport: chromium.defaultViewport }
    try {
      return await puppeteerCore.launch({ ...base, args: [...fastArgs, '--no-sandbox', '--disable-setuid-sandbox'] })
    } catch (e) {
      console.warn('   multi-process launch failed — falling back to @sparticuz defaults: ' + e.message)
      return await puppeteerCore.launch({ ...base, args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'] })
    }
  }

  console.log('   Launching bundled Chromium via puppeteer (local)…')
  const puppeteer = (await import('puppeteer')).default
  const opts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  }
  try {
    return await puppeteer.launch(opts)
  } catch (e) {
    console.warn('   Chromium not found — installing it once…')
    const { execSync } = await import('node:child_process')
    execSync('npx --yes puppeteer browsers install chrome', { stdio: 'inherit' })
    return await puppeteer.launch(opts)
  }
}

// Block analytics/pixels and any writes so the crawl leaves no trace in
// GA / Meta / the visitor_sessions table. Supabase GETs (page data) pass.
async function armPage(page, serverHost) {
  try { await page.setBypassServiceWorker(true) } catch { /* older puppeteer */ }
  // Flag prerender (small, reliable). The app fetches the company map from the
  // crawl server itself (/__prerender_companies.json) — no per-page Supabase call.
  await page.evaluateOnNewDocument(() => { window.__PRERENDER__ = true }).catch(() => {})
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    let host = ''
    try { host = new URL(req.url()).host } catch { return req.abort() }
    if (host === serverHost) return req.continue()                 // our assets/shell
    if (host.includes('supabase')) {
      return req.method() === 'GET' ? req.continue() : req.abort() // reads yes, writes no
    }
    return req.abort()                                             // GA, Meta pixel, fonts, geo-IP…
  })
  page.on('pageerror', () => {})
  page.setDefaultNavigationTimeout(NAV_TIMEOUT)
}

// Paths that render no data-driven JSON-LD (so we don't wait for one).
const STATIC_PATHS = new Set(['/', '/partner', '/claim-company', '/terms', '/privacy', '/refund'])

function pageKind(path) {
  if (path.startsWith('/services/')) return 'service'   // sets #jsonld-service
  if (STATIC_PATHS.has(path)) return 'static'
  return 'company'                                       // /:slug → sets #jsonld-business
}

async function snapshot(page, base, path) {
  const url = base + path
  const kind = pageKind(path)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT }).catch(() => {})
  // ServiceArea/PublicProfile apply their JSON-LD after mount; wait for the one
  // this page type emits. Bounded — if the data fetch is slow the page still has
  // its up-front canonical + title, so a timeout just means "no rich JSON-LD yet".
  if (kind === 'service') {
    await page.waitForFunction(() => !!document.getElementById('jsonld-service'), { timeout: 8000 }).catch(() => {})
  } else if (kind === 'company') {
    await page.waitForFunction(() => !!document.getElementById('jsonld-business'), { timeout: 6000 }).catch(() => {})
  }
  await page.waitForFunction(
    () => { const r = document.getElementById('root'); return r && r.children.length > 0 },
    { timeout: 6000 }
  ).catch(() => {})
  // Company pages render from injected data — no network settle needed. Service
  // pages get a short bounded wait to pick up their company list, then move on.
  // (Removing the per-page network wait is what keeps the crawl inside the build
  // budget on Vercel's slow container.)
  if (kind === 'service') await page.waitForNetworkIdle({ idleTime: 400, timeout: 2500 }).catch(() => {})
  await delay(150)
  // Meta Pixel's fbq injects <script src=connect.facebook.net…> nodes at runtime.
  // Baking those into the snapshot double-loads the pixel (a second PageView),
  // because the inline pixel init in <head> re-injects them on the client. Strip
  // the injected nodes; the static inline init re-adds exactly one on load.
  await page.evaluate(() => {
    document.querySelectorAll('script[src*="connect.facebook.net"]').forEach((s) => s.remove())
  }).catch(() => {})
  let complete = true
  if (kind === 'service') complete = await page.evaluate(() => !!document.getElementById('jsonld-service'))
  else if (kind === 'company') complete = await page.evaluate(() => !!document.getElementById('jsonld-business'))
  const html = await page.content()
  return { html, complete }
}

async function writePage(path, html) {
  const outPath = path === '/'
    ? join(DIST, 'index.html')
    : join(DIST, path, 'index.html')
  await mkdirP(dirname(outPath))
  await fs.writeFile(outPath, html)
}
async function mkdirP(dir) { await fs.mkdir(dir, { recursive: true }) }

async function main() {
  let routes
  try {
    routes = readRoutes()
  } catch (e) {
    return bail('could not read dist/sitemap.xml.', e)
  }
  if (!routes.length) return bail('no routes found in sitemap.')

  // One bulk fetch of all company SEO data — served to pages over localhost so
  // the crawl makes zero per-page DB calls (see startServer / PublicProfile).
  try {
    COMPANY_MAP = await fetchCompanyMap()
    console.log(`   Loaded SEO data for ${Object.keys(COMPANY_MAP).length} companies.`)
  } catch (e) {
    console.warn(`   ! company data prefetch failed (${e.message}) — company pages fall back to per-page fetch.`)
  }

  try {
    SERVICE_SEEDS = await fetchServiceSeeds(routes)
    const n = Object.keys(SERVICE_SEEDS).length
    console.log(n ? `   Service seeds: ${n} routes.` : '   ! no service seeds — service pages prerender as before.')
  } catch (e) {
    console.warn(`   ! service seeds failed (${e.message}) — service pages prerender as before.`)
  }

  try {
    HOME_SEED = await fetchHomeSeed()
    if (HOME_SEED) {
      const s = HOME_SEED.stats
      console.log(`   Home seed: ${s.companies} companies, ${s.verified} verified, ${s.reviews} reviews, ${HOME_SEED.areaList.length} areas.`)
    } else {
      console.warn('   ! home seed unavailable — homepage prerenders as before (shell only).')
    }
  } catch (e) {
    console.warn(`   ! home seed failed (${e.message}) — homepage prerenders as before.`)
  }

  const server = await startServer()
  const port = server.address().port
  const base = `http://127.0.0.1:${port}`
  const serverHost = `127.0.0.1:${port}`

  let browser
  try {
    browser = await launchBrowser()
  } catch (e) {
    server.close()
    return bail('could not launch Chromium.', e)
  }

  console.log(`\n🔎 Prerendering ${routes.length} routes (concurrency ${CONCURRENCY})…`)
  const t0 = Date.now()
  const results = { ok: 0, partial: 0, failed: 0 }
  const buffer = []
  const queue = routes.slice()

  async function worker() {
    const page = await browser.newPage()
    await armPage(page, serverHost)
    while (queue.length && Date.now() - t0 < MAX_CRAWL_MS) {
      const path = queue.shift()
      try {
        const { html, complete } = await snapshot(page, base, path)
        buffer.push({ path, html })
        if (complete) results.ok++
        else { results.partial++; console.warn(`   ~ partial (no JSON-LD): ${path}`) }
      } catch (e) {
        results.failed++
        console.warn(`   ✗ failed: ${path} — ${e.message}`)
      }
    }
    await page.close().catch(() => {})
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (queue.length) {
    console.warn(`   ⏱  crawl budget (${Math.round(MAX_CRAWL_MS / 60000)}min) hit — ${queue.length} routes skipped (they fall back to the SPA).`)
  }
  await browser.close().catch(() => {})
  server.close()

  // write only after crawling, so the server always served the original shell
  for (const { path, html } of buffer) {
    try { await writePage(path, html) }
    catch (e) { console.warn(`   ✗ write failed: ${path} — ${e.message}`) }
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n\x1b[32m✔ Prerendered ${buffer.length}/${routes.length} routes in ${secs}s\x1b[0m` +
    `  (full: ${results.ok}, partial: ${results.partial}, failed: ${results.failed})`)
  if (results.failed > routes.length / 2) {
    console.warn('   Most routes failed — check the build environment (Chromium / network).')
  }

  // Ship a stats file so the build's actual behaviour is readable from the live
  // site (/__prerender_stats.json) — the only window into what happened on Vercel.
  try {
    await fs.writeFile(join(DIST, '__prerender_stats.json'), JSON.stringify({
      routes: routes.length, prerendered: buffer.length,
      full: results.ok, partial: results.partial, failed: results.failed,
      skipped: queue.length, budgetHit: queue.length > 0, seconds: Number(secs),
      companies: Object.keys(COMPANY_MAP).length,
      cpus: CPU_COUNT, memGB: Math.round(totalmem() / 1e9), concurrency: CONCURRENCY,
    }, null, 2))
  } catch (e) { /* non-fatal */ }
}

main().catch((e) => bail('unexpected error.', e))
