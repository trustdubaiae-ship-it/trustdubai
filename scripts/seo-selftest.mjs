// Offline checks for the SEO automation. No network, no credentials — runs in
// CI before the weekly job so a bad change to the generator or the audit parser
// is caught here rather than after it has rewritten 175 page titles.
//
//   node scripts/seo-selftest.mjs
import assert from 'node:assert/strict'
import { titleCase, isRelevant, validate, buildCandidate, qualifies } from './gen-seo-overrides.mjs'
import { parsePage, checkPage } from './seo-audit.mjs'

let passed = 0
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ✔ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1 }
}

console.log('\ngen-seo-overrides')

test('titleCase keeps small words down and short acronyms up', () => {
  assert.equal(titleCase('interior design in al barsha'), 'Interior Design in Al Barsha')
  assert.equal(titleCase('AC repair dubai'), 'AC Repair Dubai')
})

test('isRelevant accepts a query about the page subject', () => {
  assert.equal(isRelevant('interior design al barsha', 'Interior Design', 'Al Barsha'), true)
  assert.equal(isRelevant('interior designers near me', 'Interior Design', 'Al Barsha'), true)
})

test('isRelevant rejects a query that merely landed on the page', () => {
  assert.equal(isRelevant('villa for rent al barsha', 'Interior Design', null), false)
  assert.equal(isRelevant('cheap hotels', 'Interior Design', 'Al Barsha'), false)
})

test('validate rejects copy that would embarrass us', () => {
  const base = { service: 'Interior Design', area: 'Al Barsha' }
  assert.match(validate({ ...base, title: 'Interior Design Al Barsha | Quvera', description: 'x' }), /description too short/)
  assert.match(validate({ ...base, title: 'Cheap Hotels Deals | Quvera', description: 'a'.repeat(120) }), /does not name the page subject/)
  assert.match(validate({ ...base, title: 'Interior Design Al Barsha', description: 'a'.repeat(120) }), /does not carry the brand/)
  assert.match(validate({ ...base, title: 'INTERIOR DESIGN AL BARSHA DUBAI UAE | QUVERA', description: 'a'.repeat(120) }), /shouting/)
  assert.match(validate({ ...base, title: 'Interior Design at www.example.com | Quvera', description: 'a'.repeat(120) }), /URL, email or phone/)
})

test('validate accepts a well-formed candidate', () => {
  assert.equal(validate({
    service: 'Interior Design', area: 'Al Barsha',
    title: 'Interior Design Al Barsha | Verified Companies – Quvera',
    description: 'Compare verified interior design companies in Al Barsha on Quvera. Real reviews, trust scores and up to 3 free quotes — no obligation.',
  }), null)
})

test('buildCandidate builds a title from the top relevant query', () => {
  const c = buildCandidate({
    service: 'Interior Design', area: 'Al Barsha',
    queries: [
      { query: 'villa for rent al barsha', impressions: 900, position: 30, ctr: 0 },  // irrelevant, must be ignored
      { query: 'interior design companies al barsha', impressions: 400, position: 27, ctr: 0.01 },
      { query: 'fit out companies al barsha', impressions: 60, position: 31, ctr: 0 },
    ],
  })
  assert.ok(!c.skip, `unexpected skip: ${c.skip}`)
  assert.match(c.title, /Interior Design Companies Al Barsha/)
  assert.ok(c.title.includes('Quvera'), 'title carries the brand')
  assert.ok(c.title.length <= 65, `title is ${c.title.length} chars`)
  assert.ok(c.description.length <= 158, `description is ${c.description.length} chars`)
  assert.equal(c.from.query, 'interior design companies al barsha')
})

test('buildCandidate skips a page whose only queries are irrelevant', () => {
  const c = buildCandidate({
    service: 'Interior Design', area: null,
    queries: [{ query: 'jobs in dubai', impressions: 500, position: 40, ctr: 0 }],
  })
  assert.ok(c.skip, 'must skip')
})

test('buildCandidate skips a query below the impression floor', () => {
  const c = buildCandidate({
    service: 'Flooring', area: 'Jumeirah',
    queries: [{ query: 'flooring jumeirah', impressions: 3, position: 20, ctr: 0 }],
  })
  assert.ok(c.skip, 'must skip')
})

test('a very long query falls back to a shorter title shape', () => {
  const c = buildCandidate({
    service: 'Carpentry & Joinery', area: 'Downtown Dubai',
    queries: [{ query: 'carpentry and joinery companies in downtown dubai for custom furniture', impressions: 200, position: 30, ctr: 0 }],
  })
  // Either it fits one of the templates, or it is skipped — never over-length.
  if (!c.skip) assert.ok(c.title.length <= 65, `title is ${c.title.length} chars: ${c.title}`)
})

test('qualifies gates on impressions, CTR and position', () => {
  assert.equal(qualifies({ impressions: 5, ctr: 0, position: 30 }), false, 'too few impressions')
  assert.equal(qualifies({ impressions: 500, ctr: 0.001, position: 3 }), true, 'impressions with no clicks')
  assert.equal(qualifies({ impressions: 500, ctr: 0.4, position: 1.2 }), false, 'already winning')
  assert.equal(qualifies({ impressions: 500, ctr: 0.1, position: 22 }), true, 'in the position band')
})

console.log('\nseo-audit')

const GOOD = `<!doctype html><html><head>
<title>Interior Design Companies in Al Barsha, Dubai | Quvera</title>
<meta name="description" content="Compare 12 verified interior design companies in Al Barsha, Dubai. Real reviews, trust scores and up to 3 free quotes from trusted professionals.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://www.quvera.ae/services/interior-design-al-barsha">
<meta property="og:image" content="https://www.quvera.ae/og-card.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Service"},{"@type":"FAQPage"}]}</script>
</head><body><h1>Interior Design in Al Barsha</h1><p>${'content '.repeat(200)}</p></body></html>`

test('parsePage reads the head it is given', () => {
  const p = parsePage(GOOD)
  assert.equal(p.canonical, 'https://www.quvera.ae/services/interior-design-al-barsha')
  assert.equal(p.robots, 'index, follow')
  assert.equal(p.h1Count, 1)
  assert.equal(p.jsonldValid, true)
  assert.deepEqual(p.jsonldTypes, ['Service', 'FAQPage'])
  assert.ok(p.textLength > 600)
})

test('a healthy page produces no findings', () => {
  const f = checkPage({ path: '/services/interior-design-al-barsha', status: 200, page: parsePage(GOOD), kind: 'service' })
  assert.deepEqual(f, [], 'findings: ' + JSON.stringify(f))
})

test('an over-length title is flagged, not silently accepted', () => {
  const html = GOOD.replace('<title>', '<title>Top Verified ').replace('| Quvera', '— Top Verified Companies | Quvera')
  const f = checkPage({ path: '/services/interior-design-al-barsha', status: 200, page: parsePage(html), kind: 'service' })
  assert.ok(f.some((x) => x.rule === 'title-too-long'), 'findings: ' + JSON.stringify(f))
})

test('the /partner regression is caught: canonical pointing at the homepage', () => {
  const html = GOOD.replace('https://www.quvera.ae/services/interior-design-al-barsha', 'https://www.quvera.ae/')
  const f = checkPage({ path: '/partner', status: 200, page: parsePage(html), kind: 'static' })
  assert.ok(f.some((x) => x.rule === 'canonical-mismatch' && x.severity === 'error'), 'findings: ' + JSON.stringify(f))
})

test('a missing canonical is an error', () => {
  const html = GOOD.replace(/<link rel="canonical"[^>]*>/, '')
  const f = checkPage({ path: '/partner', status: 200, page: parsePage(html), kind: 'static' })
  assert.ok(f.some((x) => x.rule === 'canonical-missing' && x.severity === 'error'))
})

test('a noindex page inside the sitemap is an error', () => {
  const html = GOOD.replace('index, follow', 'noindex, follow')
  const f = checkPage({ path: '/services/interior-design-al-barsha', status: 200, page: parsePage(html), kind: 'service' })
  assert.ok(f.some((x) => x.rule === 'noindex-in-sitemap' && x.severity === 'error'))
})

test('broken structured data is an error', () => {
  const html = GOOD.replace('{"@context":"https://schema.org","@graph":[{"@type":"Service"},{"@type":"FAQPage"}]}', '{oops')
  const f = checkPage({ path: '/services/x', status: 200, page: parsePage(html), kind: 'service' })
  assert.ok(f.some((x) => x.rule === 'jsonld-invalid' && x.severity === 'error'))
})

test('the square-icon social card is flagged', () => {
  const html = GOOD.replace('og-card.png', 'icon-512.png')
  const f = checkPage({ path: '/', status: 200, page: parsePage(html), kind: 'static' })
  assert.ok(f.some((x) => x.rule === 'og-image-square'))
})

test('a non-200 short-circuits to one finding', () => {
  const f = checkPage({ path: '/gone', status: 500, page: {}, kind: 'company' })
  assert.deepEqual(f.map((x) => x.rule), ['http-error'])
})

console.log(`\n${process.exitCode ? '✗ failures above' : `✔ ${passed} checks passed`}\n`)
