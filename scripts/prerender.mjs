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

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '..', 'dist')
// Higher concurrency does NOT help here — the machine saturates and per-page
// Supabase latency (not local waits) is the wall-clock floor. Above ~5, pages
// miss the JSON-LD wait and come out partial. Keep it at 5 (verified 623/623).
const CONCURRENCY = 5
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
        const shell = await fs.readFile(join(DIST, 'index.html'))
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
    return await puppeteerCore.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    })
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
    }, null, 2))
  } catch (e) { /* non-fatal */ }
}

main().catch((e) => bail('unexpected error.', e))
