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
  set('og:url', url, true); set('og:type', 'website', true)
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
  link.href = url
}

function setJsonLD(service, area, companies) {
  const old = document.getElementById('jsonld-service'); if (old) old.remove()
  const s = document.createElement('script')
  s.id = 'jsonld-service'; s.type = 'application/ld+json'
  s.text = JSON.stringify({
    '@context':'https://schema.org','@type':'Service',
    serviceType: service, areaServed: { '@type':'Place', name: (area||'Dubai')+', Dubai' },
    provider: { '@type':'Organization', name:'TrustDubai', url:'https://www.trustdubai.ae' },
    description: `Find verified ${service} companies in ${area||'Dubai'}. Compare reviews and get free quotes.`,
  })
  document.head.appendChild(s)
}

export default function ServiceArea() {
  const { serviceArea } = useParams()
  const { service, area } = resolveSlug(serviceArea)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [customer, setCustomer]   = useState(null)
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('td_theme') === 'dark' } catch { return false } })

  useEffect(() => {
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

      const where = area ? `${area}, Dubai` : 'Dubai'
      const title = `${service} in ${where} — Top Verified Companies | TrustDubai`
      const desc  = `Find the best ${service.toLowerCase()} companies in ${where}. Compare verified reviews, ratings, and get up to 3 free quotes from trusted professionals.`
      const url   = `https://www.trustdubai.ae/services/${serviceArea}`
      setSEO({ title, description: desc, url })
      setJsonLD(service, area, rows)
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
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
          <button onClick={()=>window.location.href='/'} style={{ padding:'10px 24px', background:'#0099cc', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Go to TrustDubai</button>
        </div>
      </div>
    )
  }

  const where = area || 'Dubai'
  const FAQS = [
    { q:`How do I find the best ${service.toLowerCase()} company in ${where}?`,
      a:`Browse verified ${service.toLowerCase()} companies in ${where} on TrustDubai. Compare real customer reviews, ratings, and request up to 3 free quotes to choose the right professional.` },
    { q:`Are these ${service.toLowerCase()} companies verified?`,
      a:`Yes. TrustDubai verifies businesses through trade licence, Emirates ID, and document checks so you deal with trusted, legitimate companies in ${where}.` },
    { q:`How much does ${service.toLowerCase()} cost in ${where}?`,
      a:`Pricing depends on your project scope and finish. The easiest way is to request free quotes from multiple verified companies and compare — no obligation.` },
  ]

  return (
    <div style={{ minHeight:'100vh', background:bg, fontFamily:"'Manrope',sans-serif", color:t1 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap');`}</style>

      {/* Top bar */}
      <div style={{ background:card, borderBottom:`1px solid ${line}`, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <button onClick={()=>window.location.href='/'} style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:17, color:t1 }}>
          Trust<span style={{ color:'#0099cc' }}>Dubai</span>
        </button>
        <button onClick={()=>setDark(d=>{ const n=!d; try{localStorage.setItem('td_theme',n?'dark':'light')}catch(e){} return n })}
          style={{ width:34, height:34, borderRadius:9, border:`1px solid ${line}`, background:soft, color:t2, cursor:'pointer', fontSize:15 }}>{dark?'☀️':'🌙'}</button>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 16px 60px' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize:12, color:t3, marginBottom:14 }}>
          <span onClick={()=>window.location.href='/'} style={{ cursor:'pointer', color:'#0099cc' }}>Home</span> › {service} {area ? '› '+area : ''}
        </div>

        {/* Hero */}
        <div style={{ background:card, border:`1px solid ${line}`, borderRadius:16, padding:'24px 22px', marginBottom:16 }}>
          <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:'clamp(22px,4vw,32px)', fontWeight:800, color:t1, lineHeight:1.15, marginBottom:8 }}>
            {service} in {where}
          </h1>
          <p style={{ fontSize:15, color:t2, lineHeight:1.6, maxWidth:680 }}>
            Find top-rated, verified {service.toLowerCase()} companies in {where}. Compare real customer reviews and get up to 3 free quotes from trusted professionals — fast.
          </p>
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
          <button onClick={()=> customer ? (window.location.href='/') : signInWithGoogle()}
            style={{ padding:'11px 22px', background:'#fff', color:'#0077a3', border:'none', borderRadius:10, fontSize:14, fontWeight:800, cursor:'pointer' }}>
            ✨ Get Free Quotes
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:50 }}>
            <div style={{ width:34, height:34, border:'3px solid #0099cc', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : companies.length > 0 ? (
          <>
            <h2 style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:700, color:t1, marginBottom:12 }}>
              Top {service} companies in {where}
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
            <button onClick={()=> customer ? (window.location.href='/') : signInWithGoogle()}
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
