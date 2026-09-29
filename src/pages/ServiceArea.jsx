import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, getCustomer } from '../customerAuth'
import { slugify, resolveSlug, selectCompanies, displayRating, SERVICE_DB_LABELS } from '../serviceAreas'
// Regenerated every build by scripts/gen-eligibility.mjs — the same file the
// sitemap and the prerender read, so what we link to, what we let Google index
// and what we submit can never disagree.
import ELIGIBILITY from '../generated/eligibility.json'
import { SOCIAL_CARD } from '../pageSeo'
import { SERVICE_OVERRIDES } from '../seoOverrides'
import GENERATED_OVERRIDES from '../generated/seoOverrides.json'

// Common ways people actually search for each service (from Search Console data).
// Woven naturally into copy so pages also rank for these phrasings.
const SYNONYMS = {
  'Carpentry & Joinery': 'joinery companies, carpenters and bespoke woodwork specialists',
  'Kitchen Renovation': 'kitchen companies and kitchen fit-out contractors',
  'Bathroom Renovation': 'bathroom companies and bathroom fit-out specialists',
  'Landscaping': 'landscape companies, garden design and outdoor specialists',
  'Fit-Out': 'fit-out contractors and interior fit-out companies',
  'AC Service': 'AC repair, AC maintenance and air-conditioning companies',
  'Swimming Pool': 'swimming pool builders, pool construction and maintenance companies',
  'False Ceiling & Partition': 'gypsum, false ceiling and partition companies',
  'Smart Home & Automation': 'smart home and home automation companies',
  'Curtains & Blinds': 'curtains, blinds and window-treatment companies',
}

// Title/meta overrides, in precedence order: hand-written first, then the set
// scripts/gen-seo-overrides.mjs regenerates weekly from Search Console query
// data. A page with neither falls back to the template in applySEO().
function overrideFor(slug) {
  return SERVICE_OVERRIDES[slug] || GENERATED_OVERRIDES.overrides?.[slug] || null
}

// Single source of truth for FAQs (used by both the page and FAQPage schema)
function buildFaqs(service, where) {
  const s = service.toLowerCase()
  return [
    { q:`How do I find the best ${s} company in ${where}?`,
      a:`Browse verified ${s} companies in ${where} on Quvera. Compare real customer reviews, ratings and trust scores, then request up to 3 free quotes to choose the right professional.` },
    { q:`Are these ${s} companies in ${where} verified?`,
      a:`Yes. Quvera verifies every business through trade licence, Emirates ID and document checks, so you only deal with trusted, legitimate ${s} companies in ${where}.` },
    { q:`How much does ${s} cost in ${where}?`,
      a:`Pricing depends on your project size, materials and finish. The easiest way is to request free quotes from multiple verified ${s} companies in ${where} and compare them side by side — with no obligation.` },
    { q:`How quickly can I get quotes for ${s} in ${where}?`,
      a:`Most customers are matched with trusted ${s} companies in ${where} within minutes. Share a few project details and verified companies will reach out with their quotes.` },
  ]
}

function setSEO({ title, description, url, indexable }) {
  document.title = title
  const set = (n, c, p=false) => {
    const a = p ? 'property' : 'name'
    let el = document.querySelector(`meta[${a}="${n}"]`)
    if (!el) { el = document.createElement('meta'); el.setAttribute(a, n); document.head.appendChild(el) }
    el.setAttribute('content', c)
  }
  set('description', description)
  // A combination with no companies is a real page but not one worth indexing.
  // "follow" so the links out of it still pass through. Always written, both
  // ways, so a client-side navigation cannot leave a stale noindex behind.
  set('robots', indexable ? 'index, follow' : 'noindex, follow')
  set('og:title', title, true); set('og:description', description, true)
  set('og:url', url, true); set('og:type', 'website', true); set('og:site_name', 'Quvera', true)
  // Written explicitly: without it the page inherits index.html's image, and a
  // service page shared on WhatsApp rendered the square app icon.
  set('og:image', SOCIAL_CARD, true)
  set('twitter:card', 'summary_large_image'); set('twitter:title', title); set('twitter:description', description)
  set('twitter:image', SOCIAL_CARD)
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
  link.href = url
}

function setJsonLD(service, area, companies, faqs) {
  const old = document.getElementById('jsonld-service'); if (old) old.remove()
  const where = area || 'Dubai'
  const url = `https://www.quvera.ae/services/${slugify(service)}${area ? '-' + slugify(area) : ''}`

  const graph = [
    {
      '@type':'Service',
      '@id': url + '#service',
      name: `${service} in ${where}`,
      serviceType: service,
      areaServed: { '@type':'Place', name: `${where}, Dubai, UAE` },
      provider: { '@type':'Organization', name:'Quvera', url:'https://www.quvera.ae' },
      description: `Find verified ${service.toLowerCase()} companies in ${where}. Compare reviews, ratings and trust scores, and get up to 3 free quotes.`,
    },
    {
      '@type':'BreadcrumbList',
      itemListElement: [
        { '@type':'ListItem', position:1, name:'Home', item:'https://www.quvera.ae' },
        { '@type':'ListItem', position:2, name:service, item:`https://www.quvera.ae/services/${slugify(service)}` },
        ...(area ? [{ '@type':'ListItem', position:3, name:area, item:url }] : []),
      ],
    },
    {
      '@type':'FAQPage',
      mainEntity: (faqs || []).map(f => ({
        '@type':'Question', name: f.q,
        acceptedAnswer: { '@type':'Answer', text: f.a },
      })),
    },
  ]

  // ItemList of the verified companies shown (helps Google understand the listing)
  if (companies && companies.length) {
    graph.push({
      '@type':'ItemList',
      name: `${service} companies in ${where}`,
      numberOfItems: companies.length,
      itemListElement: companies.slice(0, 20).map((c, i) => ({
        '@type':'ListItem', position: i + 1,
        url: c.slug ? `https://www.quvera.ae/${c.slug}` : undefined,
        name: c.name,
      })),
    })
  }

  const s = document.createElement('script')
  s.id = 'jsonld-service'; s.type = 'application/ld+json'
  s.text = JSON.stringify({ '@context':'https://schema.org', '@graph': graph })
  document.head.appendChild(s)
}

// Company list for this route, baked into the prerendered HTML by
// scripts/prerender.mjs. Same reasoning as the homepage seed: React's
// createRoot() clears #root on mount, so without this the page goes content →
// blank → content while Supabase answers, which is what CLS measures.
//
// It also closes a real SEO gap. applySEO([]) runs on mount, so #jsonld-service
// exists immediately and the crawler's wait for it was satisfied before any data
// arrived — these pages were prerendering with no companies in them at all.
const SEED = (() => {
  try {
    const el = typeof document !== 'undefined' && document.getElementById('__service_seed__')
    return el ? JSON.parse(el.textContent) : null
  } catch { return null }
})()

export default function ServiceArea() {
  const { serviceArea } = useParams()
  const { service, area } = resolveSlug(serviceArea)
  // Seed only applies to the route it was generated for — a client-side
  // navigation to a different service page must not reuse the previous page's list.
  const seeded = SEED && SEED.slug === serviceArea ? SEED.companies : null

  // Eligibility as decided at build time. An area page is eligible when the
  // combination has companies; a broad service page when the service has any.
  // Ineligible pages still render — they just carry noindex and are not linked.
  const isEligible = area
    ? Object.prototype.hasOwnProperty.call(ELIGIBILITY.combos, serviceArea)
    : ELIGIBILITY.services.includes(service)
  // Sibling links, uncapped: every area that has this service, and every service
  // that has companies in this area. Previously both grids were sliced to the
  // first 12 entries, so 18 areas and 8 services were never linked from anywhere.
  const otherAreas    = (ELIGIBILITY.byService[service] || []).filter(a => a !== area)
  const otherServices = area ? (ELIGIBILITY.byArea[area] || []).filter(s => s !== service) : []
  const [companies, setCompanies] = useState(seeded || [])
  // Spinner only when we actually expect a list: a seeded route already has one,
  // and an ineligible route is known at build time to have none, so it should go
  // straight to its empty state instead of racing a fetch that returns nothing.
  // (If a supplier appeared since the build, the fetch still fills the list in.)
  const [loading, setLoading]     = useState(!seeded && isEligible)
  const [customer, setCustomer]   = useState(null)
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('td_theme') === 'dark' } catch { return false } })

  // Apply SEO (title/meta/canonical + JSON-LD). Everything here is derived from
  // the slug, so it works with or without company data. Called immediately on
  // mount — so the page ALWAYS has correct SEO even if the DB is slow/down or
  // rate-limited — and again after the fetch to enrich the JSON-LD with the
  // company ItemList and the live count in the description.
  function applySEO(rows) {
    if (!service) return
    // Six of the areas already carry the city ('Downtown Dubai', 'Dubai Marina',
    // 'Dubai Hills Estate'...), and "Downtown Dubai, Dubai" both reads badly and
    // costs seven characters the title needs for its count and year.
    const where = area ? (/dubai/i.test(area) ? area : `${area}, Dubai`) : 'Dubai'
    const cnt = rows.length
    const ov = overrideFor(serviceArea)
    // Title shape follows what actually holds page 1 for these queries. Checking
    // the live SERP for "fit out companies in dubai", "renovation companies
    // dubai" and "joinery companies dubai", every single result is an editorial
    // listicle — "Top 10 Fit Out Companies in Dubai 2026", "Top 13 Home
    // Renovation Companies", "12 Best Renovation Companies". Not one is a bare
    // listing page, which is exactly what "X Companies in Y — Top Verified" read
    // as. So lead with the count and the year.
    //
    // The count is NEVER a claim we cannot back: it is banded down from the
    // number of companies this page actually renders, so a page showing 6 says
    // "Top 5" and a page showing 2 says nothing at all.
    // 'AC Service'.toLowerCase() would read as "ac service companies" in prose.
    const serviceProse = service.toLowerCase().replace(/\bac\b/g, 'AC')
    const band = cnt >= 10 ? 10 : cnt >= 5 ? 5 : cnt >= 3 ? 3 : 0
    const lead = band ? `Top ${band} ` : ''
    // Year is a freshness signal Google rewards here, and it is only honest
    // while the site is rebuilt regularly — the prerendered HTML is what a
    // crawler reads, so it carries whatever year the last deploy stamped. The
    // weekly deploy hook in .github/workflows/seo-weekly.yml is what keeps it
    // current, and seo-audit.mjs fails a `stale-year-in-title` finding if a live
    // title is ever caught carrying last year's.
    const year = new Date().getFullYear()
    // Shed the least useful part first rather than letting Google truncate the
    // tail mid-word — the same ladder PublicProfile uses for its titles. Search
    // results already show the old 69-character form losing its "| Quvera".
    const titles = [
      `${lead}${service} Companies in ${where} (${year}) | Quvera`,
      `${lead}${service} Companies in ${where} | Quvera`,
      // Drops the word "Companies" before it drops the count: the SERP evidence
      // says the count is the part doing the work, and "Companies" is implied.
      `${lead}${service} in ${where} | Quvera`,
      `${service} Companies in ${where} (${year}) | Quvera`,
      `${service} Companies in ${where} | Quvera`,
      `${service} in ${where} | Quvera`,
      area ? `${service} in ${area} | Quvera` : `${service} Dubai | Quvera`,
    ]
    const title = ov
      ? ov.title
      : titles.find((t) => t.length <= 65) || titles.reduce((a, b) => (a.length <= b.length ? a : b))
    // The synonym clause used to be appended unconditionally, which ran 109 live
    // descriptions past 160 characters — one to 223. Google cuts the snippet at
    // roughly 160, and a meta description is not a ranking signal, so everything
    // past the cut is spent for nothing. Take the longest form that still fits.
    const syn = SYNONYMS[service] ? ` Also covering ${SYNONYMS[service]}.` : ''
    const base = cnt > 0
      ? `Compare ${cnt} verified ${serviceProse} companies in ${where}. Real reviews, trust scores & up to 3 free quotes from trusted professionals.`
      : `Find verified ${serviceProse} companies in ${where}. Compare reviews, ratings and get up to 3 free quotes from trusted professionals.`
    const shortBase = cnt > 0
      ? `Compare ${cnt} verified ${serviceProse} companies in ${where}. Real reviews, trust scores and up to 3 free quotes.`
      : `Find verified ${serviceProse} companies in ${where}. Compare reviews, ratings and get up to 3 free quotes.`
    const descs = [shortBase + syn, base, shortBase]
    const desc = ov ? ov.description : (descs.find((d) => d.length <= 158) || base.slice(0, 158))
    const url   = `https://www.quvera.ae/services/${serviceArea}`
    setSEO({ title, description: desc, url, indexable: isEligible })
    setJsonLD(service, area, rows, buildFaqs(service, where))
  }

  useEffect(() => {
    // SEO up-front — never blocked on the fetch. Seed it with the prerendered
    // list so the JSON-LD carries its ItemList (and the live count in the
    // description) even when the snapshot is taken before the fetch returns.
    applySEO(seeded || [])
    getCustomer().then(c => { if (c && !c.blocked) setCustomer(c) })
    if (service) load()
    else setLoading(false)
  }, [serviceArea])

  async function load() {
    // Only show the spinner when there is nothing to show. With a seed the page
    // already has the right list painted, so blanking it for the refetch threw
    // away the prerendered markup — the crawl's bounded network wait then
    // expired and 89 of 147 populated pages snapshotted as a spinner instead of
    // their company list. Seeded routes now keep their list and refresh under it.
    if (!seeded && isEligible) setLoading(true)
    try {
      // Ask for every DB spelling that maps to this service, not just the page's
      // own name. companies.category holds the post-rename labels ('HVAC & AC'),
      // so filtering on `category.eq.AC Service` matched zero rows and then
      // overwrote the correct prerendered list with an empty one.
      const labels = SERVICE_DB_LABELS[service] || [service]
      const orFilter = labels
        .map(l => `category.eq.${l},categories.cs.{"${l}"}`)
        .join(',')
      let q = supabase.from('companies')
        .select('id,name,slug,category,categories,area,location,avg_rating,total_reviews,google_rating,google_reviews_count,plan,is_verified,logo_url')
        .eq('status','approved')
        .or(orFilter)
      const { data } = await q
      // Same filter/sort prerender.mjs runs in Node, so the seeded list and the
      // fetched one agree and swapping in fresh data doesn't reshuffle the page.
      const rows = selectCompanies(data, service, area)
      setCompanies(rows)
      applySEO(rows)             // enrich JSON-LD with company ItemList + live count
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  // Send user to Home with quote modal auto-open (service + area pre-filled)
  function startQuote() {
    const params = new URLSearchParams()
    params.set('quote', '1')
    if (service) params.set('service', service)
    if (area)    params.set('area', area)
    if (!customer) {
      try { sessionStorage.setItem('td_quote_intent', params.toString()) } catch(e){}
      signInWithGoogle()
      return
    }
    window.location.href = '/?' + params.toString()
  }

  // theme tokens
  const t1 = dark?'#eef3fb':'#16233a', t2 = dark?'#9aa7bd':'#56657c', t3 = dark?'#5d6b7e':'#94a3b8'
  const bg = dark?'#070b15':'#f4f7fb', card = dark?'#0f1626':'#ffffff', line = dark?'rgba(255,255,255,0.08)':'#e4e9f0'
  const soft = dark?'rgba(255,255,255,0.04)':'#f4f7fb'

  if (!service) {
    return (
      <div style={{ minHeight:'100vh', background:bg, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:46 }}>🔍</div>
          <h1 style={{ fontFamily:"'Sora',sans-serif", color:t1, margin:'12px 0', fontSize:20 }}>Page not found</h1>
          <p style={{ color:t2, fontSize:14, marginBottom:18 }}>This service page doesn't exist.</p>
          <button onClick={()=>window.location.href='/'} style={{ padding:'10px 24px', background:'#0099cc', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Go to Quvera</button>
        </div>
      </div>
    )
  }

  const where = area || 'Dubai'
  const FAQS = buildFaqs(service, where)

  return (
    <div style={{ minHeight:'100vh', background:bg, fontFamily:"'Manrope',sans-serif", color:t1 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap');`}</style>

      {/* Top bar */}
      <div style={{ background:card, borderBottom:`1px solid ${line}`, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <button onClick={()=>window.location.href='/'} style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:17, color:t1 }}>
          Quv<span style={{ color:'#0099cc' }}>era</span>
        </button>
        <button onClick={()=>setDark(d=>{ const n=!d; try{localStorage.setItem('td_theme',n?'dark':'light')}catch(e){} return n })}
          style={{ width:34, height:34, borderRadius:9, border:`1px solid ${line}`, background:soft, color:t2, cursor:'pointer', fontSize:15 }}>{dark?'☀️':'🌙'}</button>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 16px 60px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize:12, color:t3, marginBottom:14 }}>
          <span onClick={()=>window.location.href='/'} style={{ cursor:'pointer', color:'#0099cc' }}>Home</span>
          {' › '}
          <a href={`/services/${slugify(service)}`} style={{ color:'#0099cc', textDecoration:'none' }}>{service}</a>
          {area ? ' › '+area : ''}
        </div>

        {/* Hero */}
        <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'24px 22px', marginBottom:16 }}>
          <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(22px,4vw,32px)', fontWeight:800, color:t1, lineHeight:1.15, marginBottom:8 }}>
            {service} Companies in {where}
          </h1>
          <p style={{ fontSize:15, color:t2, lineHeight:1.6, maxWidth:700 }}>
            Find top-rated, verified {service.toLowerCase()} companies in {where}. Compare real customer reviews, ratings and trust scores, then get up to 3 free quotes from trusted professionals — fast.
          </p>
          <p style={{ fontSize:14, color:t2, lineHeight:1.6, maxWidth:700, marginTop:10 }}>
            Every {service.toLowerCase()} company on Quvera is checked through trade licence, Emirates ID and document verification, so you deal only with legitimate, trustworthy businesses in {where}. Browse profiles, read genuine reviews, and request quotes from several companies in one go — with no obligation.
          </p>
          {SYNONYMS[service] && (
            <p style={{ fontSize:13, color:t3, lineHeight:1.6, maxWidth:700, marginTop:8 }}>
              Looking for {SYNONYMS[service]} in {where}? Quvera lists trusted, verified options so you can compare and choose with confidence.
            </p>
          )}
          <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap' }}>
            <div><div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#0099cc' }}>{companies.length}</div><div style={{ fontSize:11, color:t3 }}>Companies</div></div>
            <div><div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#0099cc' }}>{companies.filter(c=>c.is_verified).length}</div><div style={{ fontSize:11, color:t3 }}>Verified</div></div>
            <div><div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#0099cc' }}>Free</div><div style={{ fontSize:11, color:t3 }}>Quotes</div></div>
          </div>
        </div>

        {/* Lead CTA */}
        <div style={{ background:'linear-gradient(135deg,#0099cc,#0077a3)', borderRadius:16, padding:'20px 22px', marginBottom:20, color:'#fff' }}>
          <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, marginBottom:5 }}>Get 3 free quotes for {service.toLowerCase()}</div>
          <div style={{ fontSize:13, opacity:0.9, marginBottom:14 }}>Tell us about your project in {where} — we'll match you with trusted companies.</div>
          <button onClick={startQuote}
            style={{ padding:'11px 22px', background:'#fff', color:'#0077a3', border:'none', borderRadius:10, fontSize:14, fontWeight:800, cursor:'pointer' }}>
            ✨ Get Free Quotes
          </button>
        </div>

        {/* Why verified (content depth + trust keywords) */}
        <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'18px 20px', marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700, color:t1, marginBottom:10 }}>Why choose a verified {service.toLowerCase()} company in {where}?</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
            {[
              ['🛡️','Trade-licence verified','Every company is checked against its UAE trade licence and documents before listing.'],
              ['⭐','Real, genuine reviews','See honest ratings and reviews from real customers — not paid placements.'],
              ['💬','Up to 3 free quotes','Compare quotes from multiple trusted companies and pick the best fit for your budget.'],
            ].map(([ic,h,d])=>(
              <div key={h} style={{ background:soft, border:`1px solid ${line}`, borderRadius:12, padding:14 }}>
                <div style={{ fontSize:22 }}>{ic}</div>
                <div style={{ fontSize:13.5, fontWeight:700, color:t1, margin:'6px 0 4px' }}>{h}</div>
                <div style={{ fontSize:12, color:t2, lineHeight:1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:50 }}>
            <div style={{ width:34, height:34, border:'3px solid #0099cc', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : companies.length > 0 ? (
          <>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, color:t1, marginBottom:12 }}>
              Top {service.toLowerCase()} companies in {where}
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12, marginBottom:28 }}>
              {companies.map(c => {
                // A real <a href> rather than a click handler: this is the only
                // path by which a crawler reaches the 1,089 company pages. As
                // divs they were invisible in the link graph, so every profile
                // was sitemap-discovered but received no internal links at all.
                // Slug-less rows stay unclickable, exactly as goCompany was.
                const Tag = c.slug ? 'a' : 'div'
                return (
                <Tag key={c.id} {...(c.slug ? { href:'/'+c.slug } : {})}
                  style={{ background:card, border:`1px solid ${line}`, borderRadius:13, padding:15, cursor:c.slug?'pointer':'default', display:'block', textDecoration:'none', color:'inherit' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:'#e0f9ff', color:'#0077aa', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>
                      {(c.name||'?').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}{c.is_verified && <span style={{ color:'#1e9e63', fontSize:12 }}> ✓</span>}</div>
                      <div style={{ fontSize:11, color:t3 }}>{c.area||c.location||'Dubai'}</div>
                    </div>
                  </div>
                  {(() => {
                    // Most listings have no on-site review yet but do carry an
                    // imported Google rating, so the card showed "— New / 0
                    // reviews" for nearly every company on a page titled "Top
                    // …". Show the real rating, labelled with its source.
                    const r = displayRating(c)
                    if (!r) return (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:12, color:t3 }}>No rating yet</span>
                      </div>
                    )
                    return (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, color:'#f5a623', fontWeight:700 }}>{'★'.repeat(Math.round(r.value))} <span style={{ color:t2 }}>{r.value.toFixed(1)}</span></span>
                        <span style={{ fontSize:11, color:t3 }}>{r.count} {r.source === 'google' ? 'Google reviews' : 'reviews'}</span>
                      </div>
                    )
                  })()}
                </Tag>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ background:card, border:`1px dashed ${line}`, borderRadius:16, padding:'36px 22px', textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:40 }}>🏗️</div>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, color:t1, margin:'10px 0 6px' }}>
              Be the first {service.toLowerCase()} company in {where}
            </h2>
            <p style={{ fontSize:14, color:t2, lineHeight:1.6, maxWidth:520, margin:'0 auto 18px' }}>
              No verified {service.toLowerCase()} companies are listed in {where} yet. Looking for this service? Get free quotes from trusted companies across Dubai.
            </p>
            <button onClick={startQuote}
              style={{ padding:'11px 24px', background:'#0099cc', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
              ✨ Get Free Quotes
            </button>
          </div>
        )}

        {/* Nearby areas (internal linking for SEO) — eligible combinations only */}
        {otherAreas.length > 0 && (
        <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'18px 20px', marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700, color:t1, marginBottom:12 }}>{service} in other areas</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {otherAreas.map(a=>(
              <a key={a} href={`/services/${slugify(service)}-${slugify(a)}`}
                style={{ fontSize:12, padding:'5px 12px', borderRadius:99, background:soft, border:`1px solid ${line}`, color:t2, textDecoration:'none', fontWeight:600 }}>
                {service} in {a}
              </a>
            ))}
          </div>
        </div>
        )}

        {/* Other services in same area (internal linking) — eligible only */}
        {area && otherServices.length > 0 && (
          <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'18px 20px', marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700, color:t1, marginBottom:12 }}>Other services in {area}</h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {otherServices.map(s=>(
                <a key={s} href={`/services/${slugify(s)}-${slugify(area)}`}
                  style={{ fontSize:12, padding:'5px 12px', borderRadius:99, background:soft, border:`1px solid ${line}`, color:t2, textDecoration:'none', fontWeight:600 }}>
                  {s}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* FAQ (SEO rich) */}
        <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'18px 20px' }}>
          <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:700, color:t1, marginBottom:12 }}>Frequently asked questions</h2>
          {FAQS.map((f,i)=>(
            <div key={i} style={{ borderBottom: i<FAQS.length-1?`1px solid ${line}`:'none', padding:'11px 0' }}>
              <div style={{ fontSize:14, fontWeight:700, color:t1, marginBottom:5 }}>{f.q}</div>
              <div style={{ fontSize:13, color:t2, lineHeight:1.6 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
