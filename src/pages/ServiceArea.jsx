import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, getCustomer } from '../customerAuth'

/* 20 services + 30 areas — must match DB categories & company areas */
const SERVICES = [
  'Interior Design','Renovation','Fit-Out','Kitchen Renovation','Bathroom Renovation',
  'Carpentry & Joinery','Flooring','Painting','False Ceiling & Partition','AC Service',
  'Plumbing','Electrical','Cleaning','Landscaping','Swimming Pool',
  'Handyman','Pest Control','Smart Home & Automation','Curtains & Blinds','Waterproofing',
]
const AREAS = [
  'Downtown Dubai','Business Bay','Dubai Marina','Palm Jumeirah','Jumeirah Village Circle (JVC)',
  'Jumeirah Lake Towers (JLT)','Jumeirah','Dubai Hills Estate','Arabian Ranches','DAMAC Hills',
  'Emirates Hills','The Springs','The Meadows','The Greens','Dubai Silicon Oasis',
  'Mirdif','Al Barsha','Deira','Bur Dubai','Dubai Investment Park (DIP)',
  'Jumeirah Beach Residence (JBR)','DIFC','City Walk','Al Furjan','Discovery Gardens',
  'Motor City','Jumeirah Golf Estates','Dubailand','International City','Town Square',
]
const slugify = (s) => s.toLowerCase()
  .replace(/&/g,'and').replace(/[()]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')

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

// Resolve a URL slug (e.g. "interior-design-business-bay") back to {service, area}
function resolveSlug(slug) {
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

function setSEO({ title, description, url }) {
  document.title = title
  const set = (n, c, p=false) => {
    const a = p ? 'property' : 'name'
    let el = document.querySelector(`meta[${a}="${n}"]`)
    if (!el) { el = document.createElement('meta'); el.setAttribute(a, n); document.head.appendChild(el) }
    el.setAttribute('content', c)
  }
  set('description', description)
  set('og:title', title, true); set('og:description', description, true)
  set('og:url', url, true); set('og:type', 'website', true); set('og:site_name', 'Quvera', true)
  set('twitter:card', 'summary_large_image'); set('twitter:title', title); set('twitter:description', description)
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

export default function ServiceArea() {
  const { serviceArea } = useParams()
  const { service, area } = resolveSlug(serviceArea)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [customer, setCustomer]   = useState(null)
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('td_theme') === 'dark' } catch { return false } })

  // Apply SEO (title/meta/canonical + JSON-LD). Everything here is derived from
  // the slug, so it works with or without company data. Called immediately on
  // mount — so the page ALWAYS has correct SEO even if the DB is slow/down or
  // rate-limited — and again after the fetch to enrich the JSON-LD with the
  // company ItemList and the live count in the description.
  function applySEO(rows) {
    if (!service) return
    const where = area ? `${area}, Dubai` : 'Dubai'
    const cnt = rows.length
    const title = `${service} Companies in ${where} — Top Verified | Quvera`
    const syn = SYNONYMS[service] ? ` Also covering ${SYNONYMS[service]}.` : ''
    const desc  = (cnt > 0
      ? `Compare ${cnt} verified ${service.toLowerCase()} companies in ${where}. Real reviews, trust scores & up to 3 free quotes from trusted professionals.`
      : `Find verified ${service.toLowerCase()} companies in ${where}. Compare reviews, ratings and get up to 3 free quotes from trusted professionals.`) + syn
    const url   = `https://www.quvera.ae/services/${serviceArea}`
    setSEO({ title, description: desc, url })
    setJsonLD(service, area, rows, buildFaqs(service, where))
  }

  useEffect(() => {
    applySEO([])                 // SEO up-front — never blocked on the fetch
    getCustomer().then(c => { if (c && !c.blocked) setCustomer(c) })
    if (service) load()
    else setLoading(false)
  }, [serviceArea])

  async function load() {
    setLoading(true)
    try {
      let q = supabase.from('companies')
        .select('id,name,slug,category,categories,area,location,avg_rating,total_reviews,plan,is_verified,logo_url')
        .eq('status','approved')
        .or(`category.eq.${service},categories.cs.{"${service}"}`)
      const { data } = await q
      let rows = data || []
      if (area) {
        rows = rows.filter(c => (c.area||c.location||'').trim().toLowerCase() === area.toLowerCase())
      }
      rows.sort((a,b)=>(b.avg_rating||0)-(a.avg_rating||0))
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

  function goCompany(c) {
    if (c.slug) window.location.href = '/'+c.slug
  }

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
              {companies.map(c => (
                <div key={c.id} onClick={()=>goCompany(c)}
                  style={{ background:card, border:`1px solid ${line}`, borderRadius:13, padding:15, cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:'#e0f9ff', color:'#0077aa', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 }}>
                      {(c.name||'?').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}{c.is_verified && <span style={{ color:'#1e9e63', fontSize:12 }}> ✓</span>}</div>
                      <div style={{ fontSize:11, color:t3 }}>{c.area||c.location||'Dubai'}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, color:'#f5a623', fontWeight:700 }}>{'★'.repeat(Math.round(c.avg_rating||0))||'—'} <span style={{ color:t2 }}>{c.avg_rating||'New'}</span></span>
                    <span style={{ fontSize:11, color:t3 }}>{c.total_reviews||0} reviews</span>
                  </div>
                </div>
              ))}
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

        {/* Nearby areas (internal linking for SEO) */}
        <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'18px 20px', marginBottom:16 }}>
          <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700, color:t1, marginBottom:12 }}>{service} in other areas</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {AREAS.filter(a=>a!==area).slice(0,12).map(a=>(
              <a key={a} href={`/services/${slugify(service)}-${slugify(a)}`}
                style={{ fontSize:12, padding:'5px 12px', borderRadius:99, background:soft, border:`1px solid ${line}`, color:t2, textDecoration:'none', fontWeight:600 }}>
                {service} in {a}
              </a>
            ))}
          </div>
        </div>

        {/* Other services in same area (internal linking) */}
        {area && (
          <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'18px 20px', marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700, color:t1, marginBottom:12 }}>Other services in {area}</h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {SERVICES.filter(s=>s!==service).slice(0,12).map(s=>(
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
