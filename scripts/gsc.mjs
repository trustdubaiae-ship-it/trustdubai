// Google Search Console (Search Analytics) client.
//
// The SEO_OVERRIDES tables in ServiceArea.jsx and PublicProfile.jsx were written
// by hand from Search Console numbers pasted into comments ("447 impressions,
// avg position 27.2, 1.8% CTR"). That works, and it is also the reason only four
// pages have ever been tuned. This module is that same data, read on a schedule,
// so gen-seo-overrides.mjs and seo-audit.mjs can act on all 1,271 URLs.
//
// No dependencies: a service-account JWT is signed with node:crypto and
// exchanged for an access token. Everything is read-only (webmasters.readonly).
//
// Setup (once):
//   1. Google Cloud console -> enable the Search Console API, create a service
//      account, download its JSON key.
//   2. Search Console -> Settings -> Users and permissions -> add the service
//      account's client_email as a Full or Restricted user.
//   3. Put the whole key JSON (raw or base64) in the GSC_SERVICE_ACCOUNT_JSON
//      secret. GSC_SITE_URL defaults to the sc-domain form below.
//
// Absent credentials are not an error anywhere in this pipeline: every consumer
// degrades to "no query data this run" and says so.
import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const API = 'https://searchconsole.googleapis.com/webmasters/v3'

// A domain property covers www, non-www and http/https in one place. Override
// with GSC_SITE_URL if the property is a URL-prefix one ('https://www.quvera.ae/').
export const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:quvera.ae'

// Offline/CI-test path: a JSON file standing in for the API. Shape is either a
// bare array of rows or { rows: [...] }, matching one searchAnalytics response.
const FIXTURE = process.env.GSC_FIXTURE || ''

function readKey() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON || ''
  if (!raw.trim()) return null
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  const key = JSON.parse(text)
  if (!key.client_email || !key.private_key) throw new Error('service account JSON has no client_email/private_key')
  return key
}

export function gscAvailable() {
  if (FIXTURE) return true
  try { return !!readKey() } catch { return false }
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function accessToken() {
  const key = readKey()
  if (!key) throw new Error('GSC_SERVICE_ACCOUNT_JSON is not set')
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
  }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const jwt = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`token exchange failed: HTTP ${res.status} ${body.error_description || body.error || ''}`)
  return body.access_token
}

let cachedToken = null

// One searchAnalytics query, paged to completion. `dimensions` is e.g.
// ['page'] or ['page','query']; the API caps a page at 25,000 rows.
export async function searchAnalytics({ startDate, endDate, dimensions = ['page'], rowLimit = 25000, type = 'web', filters = [] }) {
  if (FIXTURE) {
    const parsed = JSON.parse(readFileSync(FIXTURE, 'utf8'))
    return Array.isArray(parsed) ? parsed : (parsed.rows || [])
  }
  if (!cachedToken) cachedToken = await accessToken()
  const out = []
  for (let startRow = 0; ; startRow += rowLimit) {
    const res = await fetch(`${API}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cachedToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        startDate, endDate, dimensions, rowLimit, startRow, type,
        ...(filters.length ? { dimensionFilterGroups: [{ filters }] } : {}),
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`searchAnalytics ${startDate}..${endDate} [${dimensions}] failed: HTTP ${res.status} ${text.slice(0, 300)}`)
    }
    const rows = (await res.json()).rows || []
    out.push(...rows)
    if (rows.length < rowLimit) break
  }
  return out
}

// Search Console data lags ~2-3 days, so every window ends `lagDays` back —
// otherwise the most recent days read as a traffic collapse that isn't real.
export function searchWindow({ days = 28, endingDaysAgo = 3 } = {}) {
  const day = 86400000
  const end = new Date(Date.now() - endingDaysAgo * day)
  const start = new Date(end.getTime() - (days - 1) * day)
  const iso = (d) => d.toISOString().slice(0, 10)
  return { startDate: iso(start), endDate: iso(end), days }
}

// The path part of a GSC page URL ('https://www.quvera.ae/services/x' -> '/services/x').
export function pathOf(pageUrl) {
  try { return new URL(pageUrl).pathname.replace(/\/+$/, '') || '/' } catch { return null }
}

// Rows for one dimension set, folded into { path -> { clicks, impressions, ctr,
// position, queries: [...] } }. Averages are impression-weighted, which is what
// Search Console itself reports.
export function byPage(rows) {
  const pages = {}
  for (const r of rows) {
    const [pageUrl, query] = r.keys || []
    const path = pathOf(pageUrl)
    if (!path) continue
    const p = (pages[path] ||= { path, clicks: 0, impressions: 0, positionSum: 0, queries: [] })
    p.clicks += r.clicks || 0
    p.impressions += r.impressions || 0
    p.positionSum += (r.position || 0) * (r.impressions || 0)
    if (query) p.queries.push({ query, clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position || 0, ctr: r.ctr || 0 })
  }
  for (const p of Object.values(pages)) {
    p.ctr = p.impressions ? p.clicks / p.impressions : 0
    p.position = p.impressions ? p.positionSum / p.impressions : 0
    delete p.positionSum
    p.queries.sort((a, b) => b.impressions - a.impressions)
  }
  return pages
}
