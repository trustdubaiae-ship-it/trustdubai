// trustdubai/src/pages/PublicProfile.jsx
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer, updateCustomerProfile } from '../customerAuth'

/* ===================== PLAN FEATURE MATRIX ===================== */
const FEATURES = {
  description:      { free: true,  silver: true,  gold: true,  platinum: true  },
  socialLinks:      { free: false, silver: true,  gold: true,  platinum: true  },
  portfolio:        { free: false, silver: true,  gold: true,  platinum: true  },
  portfolioLimit:   { free: 3,     silver: 10,    gold: 30,    platinum: 999   },
  trustGauges:      { free: false, silver: false, gold: true,  platinum: true  },
  aiSummary:        { free: false, silver: false, gold: true,  platinum: true  },
  sentiment:        { free: false, silver: false, gold: true,  platinum: true  },
  businessInsights: { free: false, silver: false, gold: true,  platinum: true  },
  badges:           { free: false, silver: true,  gold: true,  platinum: true  },
  faq:              { free: false, silver: false, gold: true,  platinum: true  },
  relatedBusiness:  { free: true,  silver: true,  gold: true,  platinum: true  },
  aiReviewAnalysis: { free: false, silver: false, gold: true,  platinum: true  },
}
const can = (f, plan) => !!(FEATURES[f] && FEATURES[f][plan])
const limitOf = (f, plan) => (FEATURES[f] ? (FEATURES[f][plan] ?? 0) : 0)

const SUPABASE_URL = 'https://ribdorraxxhfbfkjhpie.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYmRvcnJheHhoZmJma2pocGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTkzNDUsImV4cCI6MjA5NTM3NTM0NX0.w5EMvd47CtWTc-8NgTlsM44EYmbGSQHc79wgjXTQlHE'

// Dubai areas for the lead-profile "Area" field
const DUBAI_AREAS = ['Downtown Dubai', 'Business Bay', 'Dubai Marina', 'JLT', 'JBR', 'Palm Jumeirah', 'Jumeirah', 'Umm Suqeim', 'Al Barsha', 'Dubai Hills', 'Arabian Ranches', 'Emirates Hills', 'The Springs', 'The Meadows', 'JVC', 'JVT', 'Dubai Silicon Oasis', 'International City', 'Discovery Gardens', 'Al Furjan', 'Mirdif', 'Deira', 'Bur Dubai', 'Al Quoz', 'Dubai Investment Park', 'Motor City', 'Sports City', 'Town Square', 'Damac Hills', 'Tilal Al Ghaf', 'Other']

function makeTheme(dark) {
  if (dark) return {
    dark: true,
    bg: 'radial-gradient(1200px 600px at 6% -8%, rgba(59,143,212,0.18), transparent 58%), radial-gradient(1000px 640px at 102% 2%, rgba(167,139,250,0.16), transparent 55%), radial-gradient(800px 500px at 50% 110%, rgba(34,197,94,0.06), transparent 60%), #070b15',
    card: 'rgba(17,24,40,0.72)', cardSolid: '#0f1626', line: 'rgba(255,255,255,0.08)', soft: 'rgba(255,255,255,0.03)',
    t1: '#eef3fb', t2: '#9aa7bd', t3: '#5d6b7e',
    accent: '#4f9fe0', gold: '#e0b53e', green: '#2ee08a', blue: '#5b9bff', amber: '#e0a83e', violet: '#b69bff', red: '#ff5c6c',
    grad: 'linear-gradient(135deg,#4f9fe0,#b69bff)', gradGold: 'linear-gradient(135deg,#e0b53e,#f0d278)',
    glow: '0 8px 32px rgba(59,143,212,0.18)', glowGold: '0 8px 28px rgba(224,181,62,0.22)',
    shadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 40px rgba(0,0,0,0.35)',
    blur: 'blur(14px)',
  }
  return {
    dark: false,
    bg: 'radial-gradient(1100px 520px at 8% -6%, rgba(29,111,184,0.10), transparent 60%), radial-gradient(900px 560px at 100% 0%, rgba(139,92,246,0.08), transparent 55%), #e7ecf3',
    card: 'rgba(255,255,255,0.86)', cardSolid: '#ffffff', line: '#e4e9f0', soft: '#f4f7fb',
    t1: '#16233a', t2: '#56657c', t3: '#94a3b8',
    accent: '#1d6fb8', gold: '#c9a227', green: '#1e9e63', blue: '#2563eb', amber: '#d4940a', violet: '#8b5cf6', red: '#dc3545',
    grad: 'linear-gradient(135deg,#1d6fb8,#8b5cf6)', gradGold: 'linear-gradient(135deg,#c9a227,#e7c860)',
    glow: '0 10px 30px rgba(29,111,184,0.14)', glowGold: '0 10px 26px rgba(201,162,39,0.2)',
    shadow: '0 1px 2px rgba(20,40,80,0.05), 0 10px 34px rgba(20,40,80,0.08)',
    blur: 'blur(12px)',
  }
}

// Hand-written title/meta for company pages where Search Console shows real
// demand the DB-derived template below doesn't serve well. Keyed by URL slug;
// every other company page keeps the generic name/category template.
const SEO_OVERRIDES = {
  // Two queries land here: "osta services" (73 impr, pos 7, 12.3% CTR) and the
  // Arabic "خدمات آسطا | osta services – ac repair & maintenance" (37 impr, pos
  // 9.7). The Arabic one ranks because the DB-derived title carried the Arabic
  // company name, so the override keeps it — dropping it would cost that query.
  'osta-services-ac-repair-maintenance': {
    title: 'Osta Services خدمات آسطا | AC Repair & Maintenance Dubai – Quvera',
    description: 'Book trusted Osta AC repair and maintenance services in Dubai. Verified technicians, transparent pricing, same-day service across Dubai. Get a free quote today.',
  },
}

function setSEO({ title, description, image, url }) {
  // Applied here rather than at each call site so every path that sets SEO for
  // this page (fallback, cached and fetched) picks the override up.
  const ov = SEO_OVERRIDES[(url || '').split('/').pop()]
  if (ov) { title = ov.title; description = ov.description }
  document.title = title
  const setMeta = (n, c, p = false) => { const a = p ? 'property' : 'name'; let el = document.querySelector(`meta[${a}="${n}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute(a, n); document.head.appendChild(el) } el.setAttribute('content', c) }
  setMeta('description', description); setMeta('og:title', title, true); setMeta('og:description', description, true); setMeta('og:url', url, true); setMeta('og:type', 'business.business', true); setMeta('og:image', image, true); setMeta('og:site_name', 'Quvera', true)
  // Canonical — without this the page inherits index.html's homepage canonical,
  // which tells Google every company page is a duplicate of the homepage.
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
  link.href = url
  const old = document.getElementById('jsonld-business'); if (old) old.remove()
}
// Diagnostic: records which prerender path produced the snapshot, readable from
// the live HTML (<meta name="x-prerender-path">) to debug the build remotely.
function setPrerenderPath(v) {
  try {
    let el = document.querySelector('meta[name="x-prerender-path"]')
    if (!el) { el = document.createElement('meta'); el.setAttribute('name', 'x-prerender-path'); document.head.appendChild(el) }
    el.setAttribute('content', v)
  } catch (e) {}
}
function setJsonLD(company, reviews) {
  // Prefer the company row's stored aggregates (available even when the full
  // reviews list isn't fetched, e.g. during prerender); fall back to the list.
  const hasAgg = company.avg_rating != null && company.total_reviews > 0
  const ratingValue = hasAgg ? Number(company.avg_rating).toFixed(1) : (reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null)
  const reviewCount = hasAgg ? company.total_reviews : reviews.length
  const s = document.createElement('script'); s.id = 'jsonld-business'; s.type = 'application/ld+json'
  s.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: company.name, description: company.description || '', url: 'https://www.quvera.ae/' + company.slug, telephone: company.phone || '', address: { '@type': 'PostalAddress', addressLocality: company.location || 'Dubai', addressCountry: 'AE' }, aggregateRating: ratingValue ? { '@type': 'AggregateRating', ratingValue, reviewCount, bestRating: 5, worstRating: 1 } : undefined })
  document.head.appendChild(s)
}
function analyzeReview(r) {
  const text = (r.review_text || '').toLowerCase(); const rating = r.rating || 3
  const pos = ['excellent','great','amazing','good','best','perfect','wonderful','fantastic','outstanding','professional','recommended','happy','satisfied','love','awesome','superb','brilliant','helpful','fast','quality','clean','honest','reliable','trusted','efficient']
  const neg = ['bad','poor','terrible','worst','horrible','awful','disappointing','slow','expensive','rude','unprofessional','late','damage','broken','wrong','issue','problem','complaint','refund','waste','dirty','fake','fraud','cheat','scam']
  const pc = pos.filter(w => text.includes(w)).length, nc = neg.filter(w => text.includes(w)).length
  const authenticity = Math.round(Math.min(text.length / 200, 1) * 40 + (rating === 5 || rating === 1 ? 20 : rating === 4 || rating === 2 ? 35 : 45) + Math.min((pc + nc) * 5, 15))
  return { authenticity, label: authenticity >= 70 ? 'Excellent' : authenticity >= 45 ? 'Good' : 'Fair', ok: authenticity >= 45 }
}
function calcCredibility(c, reviews) {
  let s = 0
  if (c.is_verified) s += 25
  if ((c.avg_rating || 0) >= 4) s += 20; else if ((c.avg_rating || 0) >= 3) s += 10
  if (reviews.length >= 10) s += 20; else if (reviews.length >= 5) s += 15; else if (reviews.length >= 1) s += 8
  if (c.logo_url) s += 10; if (c.description) s += 10; if (c.phone) s += 5
  if (c.instagram || c.facebook || c.linkedin) s += 10
  return Math.min(s, 100)
}
function calcSubScores(c, reviews) {
  const avg = parseFloat(c.avg_rating) || 0
  const vol = Math.min(reviews.length / 20, 1)
  return {
    reputation: Math.round((avg / 5) * 60 + (c.is_verified ? 25 : 0) + vol * 15),
    satisfaction: avg > 0 ? Math.round((avg / 5) * 100) : 0,
    service: Math.round((avg / 5) * 80 + vol * 20),
    community: Math.round((avg / 5) * 50 + (c.is_verified ? 30 : 0) + vol * 20),
  }
}
function buildAISummary(reviews) {
  if (reviews.length === 0) return { loves: [], concerns: [] }
  const t = reviews.map(r => (r.review_text || '').toLowerCase()).join(' ')
  const themes = [['quality','Quality'],['professional','Professionalism'],['service','Service'],['helpful','Helpfulness'],['clean','Cleanliness'],['fast','Speed'],['friendly','Friendliness'],['ambience','Ambience'],['recommend','Recommended']]
  const loves = themes.filter(([w]) => t.includes(w)).map(([, l]) => l).slice(0, 5)
  const concerns = []
  if (t.match(/slow|late|delay|wait/)) concerns.push('Waiting Time')
  if (t.match(/expensive|costly|pricey|price/)) concerns.push('Pricing')
  if (t.match(/parking/)) concerns.push('Parking')
  return { loves, concerns }
}
function buildSocialLinks(c) {
  const l = []
  if (c.instagram) l.push({ icon: '📸', label: 'Instagram', url: c.instagram.startsWith('http') ? c.instagram : 'https://instagram.com/' + c.instagram.replace('@', '') })
  if (c.facebook) l.push({ icon: '👍', label: 'Facebook', url: c.facebook.startsWith('http') ? c.facebook : 'https://facebook.com/' + c.facebook })
  if (c.linkedin) l.push({ icon: '💼', label: 'LinkedIn', url: c.linkedin.startsWith('http') ? c.linkedin : 'https://linkedin.com/company/' + c.linkedin })
  if (c.website) l.push({ icon: '🌐', label: 'Website', url: c.website.startsWith('http') ? c.website : 'https://' + c.website })
  return l
}

/* ---- animated counter ---- */
function Counter({ to, dur = 1100, suffix = '', decimals = 0 }) {
  const [v, setV] = useState(0)
  const ref = useRef()
  useEffect(() => {
    let start
    const target = parseFloat(to) || 0
    const step = (t) => { if (!start) start = t; const p = Math.min((t - start) / dur, 1); const e = 1 - Math.pow(1 - p, 3); setV(target * e); if (p < 1) ref.current = requestAnimationFrame(step) }
    ref.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(ref.current)
  }, [to, dur])
  return <>{decimals ? v.toFixed(decimals) : Math.round(v)}{suffix}</>
}

/* ---- atoms ---- */
function Card({ TH, children, style, id, glass = true }) {
  return <div id={id} className="td-card" style={{ background: glass ? TH.card : TH.cardSolid, backdropFilter: glass ? TH.blur : 'none', WebkitBackdropFilter: glass ? TH.blur : 'none', border: `1px solid ${TH.line}`, borderRadius: 16, padding: 16, boxShadow: TH.shadow, marginBottom: 14, ...style }}>{children}</div>
}
function H2({ TH, children, right }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}><h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 800, color: TH.t1, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</h2>{right}</div>
}
function MiniGauge({ TH, label, score, color }) {
  const isText = typeof score === 'string'
  const r = 22, c = 2 * Math.PI * r
  const [fill, setFill] = useState(0)
  useEffect(() => { const t = setTimeout(() => setFill((isText ? 0.5 : score / 100) * c), 120); return () => clearTimeout(t) }, [score])
  return (
    <div className="td-gauge" style={{ background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
      <div className="td-gauge-label" style={{ fontSize: 10, fontWeight: 700, color: TH.t1, marginBottom: 8, lineHeight: 1.2 }}>{label}</div>
      <div style={{ position: 'relative', display: 'inline-grid', placeItems: 'center' }}>
        <svg className="td-gauge-svg" width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r={r} fill="none" stroke={TH.line} strokeWidth="5" /><circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${fill} ${c}`} strokeDashoffset={c * 0.25} transform="rotate(-90 30 30)" style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }} /></svg>
        <div className="td-gauge-num" style={{ position: 'absolute', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: isText ? 9.5 : 12, color }}>{isText ? score : <Counter to={score} suffix="%" />}</div>
      </div>
    </div>
  )
}

/* ===== 3 SHIELD RINGS (Trust · Team · Verified) — flicker-free ===== */
function ShieldRing({ TH, value, suffix = '', fillPct, ringColor, gradId, gradTo, caption, sub, onClick }) {
  const r = 46, c = 2 * Math.PI * r
  const target = Math.max(0, Math.min(1, fillPct)) * c
  const [fill, setFill] = useState(0)
  useEffect(() => { const t = setTimeout(() => setFill(target), 250); return () => clearTimeout(t) }, [target])
  return (
    <div onClick={onClick} className="td-shieldring" style={{ textAlign: 'center', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ position: 'relative', display: 'inline-grid', placeItems: 'center' }}>
        <svg width="116" height="116" viewBox="0 0 116 116" className="td-shieldring-svg" style={{ overflow: 'visible' }}>
          {gradTo && <defs><linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={ringColor} /><stop offset="100%" stopColor={gradTo} /></linearGradient></defs>}
          <circle cx="58" cy="58" r={r} fill="none" stroke={ringColor + '26'} strokeWidth="8" />
          <circle cx="58" cy="58" r={r} fill="none" stroke={gradTo ? `url(#${gradId})` : ringColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${fill} ${c}`} strokeDashoffset={c * 0.25} transform="rotate(-90 58 58)" style={{ transition: 'stroke-dasharray 1.3s cubic-bezier(.34,1.2,.5,1)' }} />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: 18, lineHeight: 1 }}>🛡️</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 19, color: TH.t1, lineHeight: 1.05, marginTop: 1 }}><Counter to={value} suffix={suffix} /></div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: ringColor, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{caption}</div>
      <div style={{ fontSize: 8.5, color: TH.t3, fontWeight: 600, marginTop: 1 }}>{sub}</div>
    </div>
  )
}

export default function PublicProfile() {
  const { slug } = useParams()
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('td_theme') === 'dark' } catch { return false } })
  const [company, setCompany] = useState(null)
  const [reviews, setReviews] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [related, setRelated] = useState([])
  const [badges, setBadges] = useState([])
  const [faqs, setFaqs] = useState([])
  const [team, setTeam] = useState([])
  const [docMeta, setDocMeta] = useState([])
  const [companyDocs, setCompanyDocs] = useState({})
  const [leadForm, setLeadForm] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [customer, setCustomer] = useState(undefined)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [pfPhone, setPfPhone] = useState('')   // lead profile: phone
  const [pfArea, setPfArea] = useState('')     // lead profile: area
  const [loginFor, setLoginFor] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [editingRating, setEditingRating] = useState(5)
  const [aiAnalysisOn, setAiAnalysisOn] = useState(false)
  const [googleOn, setGoogleOn] = useState(false)
  const [reviewTab, setReviewTab] = useState('latest')
  const [openFaq, setOpenFaq] = useState(0)
  const [helpful, setHelpful] = useState({})
  const [showAllGallery, setShowAllGallery] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [social, setSocial] = useState(null)
  const [portLikes, setPortLikes] = useState({})
  const [likedSet, setLikedSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem('td_liked') || '[]')) } catch { return new Set() } })
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showDocsModal, setShowDocsModal] = useState(false)
  const [activeMember, setActiveMember] = useState(null)
  const [memberRating, setMemberRating] = useState(0)
  const [memberComment, setMemberComment] = useState('')
  const [submittingMemberRating, setSubmittingMemberRating] = useState(false)

  useEffect(() => {
    fetchCompany()
    // Skip the non-SEO fetches during prerender — they add ~3 queries per page
    // (globals + customer/auth) that would overload the DB across ~1000 pages.
    if (typeof window === 'undefined' || !window.__PRERENDER__) { checkCustomer(); fetchAiSetting(); fetchSocial() }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (e, s) => {
      if (e === 'SIGNED_IN' && s?.user) { setCustomer(await upsertCustomer(s.user)); setShowLoginPrompt(false) }
      else if (e === 'SIGNED_OUT') setCustomer(null)
    })
    return () => subscription.unsubscribe()
  }, [slug])

  // Persist dark/light theme across refresh
  useEffect(() => {
    try { localStorage.setItem('td_theme', dark ? 'dark' : 'light') } catch (e) {}
  }, [dark])

  // Prefill the lead-profile fields from the signed-in customer
  useEffect(() => {
    if (customer && typeof customer === 'object') {
      setPfPhone(customer.phone || '')
      setPfArea(customer.area || '')
    }
  }, [customer])

  async function checkCustomer() { setCustomer((await getCustomer()) || null) }
  async function fetchAiSetting() { const { data } = await supabase.from('app_settings').select('value').eq('key', 'feature.ai_analysis').maybeSingle(); setAiAnalysisOn(data?.value?.enabled === true); const { data: g } = await supabase.from('app_settings').select('value').eq('key', 'feature.google_reviews').maybeSingle(); setGoogleOn(g?.value?.enabled === true) }
  async function fetchSocial() { const { data } = await supabase.from('app_settings').select('value').eq('key', 'trustdubai.social').maybeSingle(); setSocial(data?.value || null) }
  function trackProfileView(id) {
    // fully fire-and-forget — never blocks page render
    // 1) bump aggregate counter
    try { supabase.rpc('increment_profile_views', { p_company_id: id }) } catch (e) {}
    // 2) get visitor IP from ipify (fast, reliable), then log via Edge Function.
    //    The Edge Function resolves COUNTRY from this IP server-side (not blocked).
    ;(async () => {
      let ip = null
      try {
        const ctrl = new AbortController()
        const tmo = setTimeout(() => ctrl.abort(), 2000)
        const r = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal })
        clearTimeout(tmo)
        if (r.ok) { const j = await r.json(); ip = j.ip || null }
      } catch (e) {}
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/log-profile-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ company_id: id, ip }),
        })
      } catch (e) {
        // last-resort minimal insert
        try {
          await supabase.from('profile_views_log').insert({
            company_id: id,
            visited_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
            visitor_ip: ip,
          })
        } catch (e2) {}
      }
    })()
  }

  async function fetchCompany() {
    setLoading(true)
    // Base SEO up-front from the slug, so the page always has the correct canonical
    // (not the homepage) and a sensible title even if the data fetch is slow or
    // unavailable. Enriched with the real name/rating once the company loads.
    const fallbackName = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    setSEO({ title: `${fallbackName} — Dubai | Quvera`, description: `${fallbackName} — a verified business in Dubai on Quvera. See reviews, ratings, services and contact details.`, image: 'https://www.quvera.ae/og-image.png', url: 'https://www.quvera.ae/' + slug })
    // Prerender: read this company's SEO data from the map the crawler serves
    // over localhost (one bulk fetch for ALL pages) — zero per-page DB calls, so
    // the crawl can never overload Supabase and every company page gets full SEO.
    if (typeof window !== 'undefined' && window.__PRERENDER__) {
      let c = null, fetched = false
      try { c = await (await fetch('/__prerender_company/' + encodeURIComponent(slug) + '.json')).json(); fetched = true } catch (e) { fetched = false }
      setPrerenderPath(c ? 'inject' : (fetched ? 'no-slug' : 'no-map'))
      if (c) {
        setCompany(c)
        const avg = (c.avg_rating != null && c.total_reviews > 0) ? Number(c.avg_rating).toFixed(1) : null
        setSEO({ title: c.name + ' — ' + (c.category || 'Business') + ' Dubai | Quvera', description: (c.description ? c.description.slice(0, 140) : c.name + ' is a verified ' + (c.category || 'business') + ' in Dubai.') + (avg ? ' Rated ' + avg + '/5.' : ''), image: 'https://www.quvera.ae/og-image.png', url: 'https://www.quvera.ae/' + slug })
        setJsonLD(c, [])
        setLoading(false)
        return
      }
      // no map/slug → fall through to a single-row fetch below
    }

    const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).eq('status', 'approved').single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCompany(data)
    // Prerender fallback (no map hit): the company row already carries
    // avg_rating/total_reviews, so no extra fetch is needed for full SEO.
    if (typeof window !== 'undefined' && window.__PRERENDER__) {
      setPrerenderPath('fetch-fallback')
      const avg = (data.avg_rating != null && data.total_reviews > 0) ? Number(data.avg_rating).toFixed(1) : null
      setSEO({ title: data.name + ' — ' + (data.category || 'Business') + ' Dubai | Quvera', description: (data.description ? data.description.slice(0, 140) : data.name + ' is a verified ' + (data.category || 'business') + ' in Dubai.') + (avg ? ' Rated ' + avg + '/5.' : ''), image: 'https://www.quvera.ae/og-image.png', url: 'https://www.quvera.ae/' + slug })
      setJsonLD(data, [])
      setLoading(false)
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const [reviewRes, formRes, portfolioRes, badgeRes, faqRes, teamRes, docMetaRes, compDocRes] = await Promise.all([
      supabase.from('reviews').select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id, helpful_count').eq('company_id', data.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(60),
      supabase.from('lead_forms').select('*').eq('company_id', data.id).eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('portfolio_items').select('id, image_url, title, description, likes_count, created_at').eq('company_id', data.id).order('created_at', { ascending: false }),
      supabase.from('company_badges').select('*').eq('company_id', data.id).eq('is_active', true).order('display_order'),
      supabase.from('company_faqs').select('*').eq('company_id', data.id).eq('is_active', true).order('display_order'),
      supabase.from('team_members').select('*').eq('company_id', data.id).eq('is_verified', true).eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('verification_documents').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      supabase.from('company_documents').select('*').eq('company_id', data.id),
    ])
    setReviews(reviewRes.data || []); setPortfolio(portfolioRes.data || [])
    setBadges(badgeRes.data || []); setFaqs(faqRes.data || [])
    const validTeam = (teamRes.data || []).filter(m => !m.eid_expiry || m.eid_expiry >= today)
    setTeam(validTeam)
    setDocMeta(docMetaRes.data || [])
    const dm = {}; (compDocRes.data || []).forEach(d => { dm[d.doc_key] = d }); setCompanyDocs(dm)
    const hl = {}; (reviewRes.data || []).forEach(r => { hl[r.id] = r.helpful_count || 0 }); setHelpful(hl)
    const pl = {}; (portfolioRes.data || []).forEach(p => { pl[p.id] = p.likes_count || 0 }); setPortLikes(pl)
    if (formRes.data) { setLeadForm(formRes.data); const { data: q } = await supabase.from('lead_form_questions').select('*').eq('form_id', formRes.data.id).order('order_num'); setQuestions(q || []) }
    if (data.category) { const { data: rel } = await supabase.from('companies').select('id, name, category, avg_rating, total_reviews, plan, slug, logo_url, is_verified').eq('status', 'approved').eq('category', data.category).neq('id', data.id).order('avg_rating', { ascending: false }).limit(6); setRelated(rel || []) }
    const reviewData = reviewRes.data || []
    const avgRating = reviewData.length > 0 ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1) : null
    setSEO({ title: data.name + ' — ' + (data.category || 'Business') + ' Dubai | Quvera', description: (data.description ? data.description.slice(0, 140) : data.name + ' is a verified ' + (data.category || 'business') + ' in Dubai.') + (avgRating ? ' Rated ' + avgRating + '/5.' : ''), image: 'https://www.quvera.ae/og-image.png', url: 'https://www.quvera.ae/' + slug })
    setJsonLD(data, reviewData); trackProfileView(data.id); setLoading(false)
  }
  async function refreshTeam() {
    if (!company) return
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('team_members').select('*').eq('company_id', company.id).eq('is_verified', true).eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: true })
    const valid = (data || []).filter(m => !m.eid_expiry || m.eid_expiry >= today)
    setTeam(valid)
    if (activeMember) { const updated = valid.find(m => m.id === activeMember.id); if (updated) setActiveMember(updated) }
  }
  async function refreshReviews() { const { data } = await supabase.from('reviews').select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id, helpful_count').eq('company_id', company.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(60); if (data) { setReviews(data); const hl = {}; data.forEach(r => { hl[r.id] = r.helpful_count || 0 }); setHelpful(hl) } }
  function requireLogin(f) { if (customer === undefined) return false; if (customer !== null) return true; setLoginFor(f); setShowLoginPrompt(true); return false }
  async function markHelpful(id) { const next = (helpful[id] || 0) + 1; setHelpful(h => ({ ...h, [id]: next })); try { await supabase.rpc('increment_review_helpful', { p_review_id: id }) } catch (e) { try { await supabase.from('reviews').update({ helpful_count: next }).eq('id', id) } catch (e2) {} } }
  async function likePortfolio(id) {
    if (likedSet.has(id)) return
    const next = (portLikes[id] || 0) + 1
    setPortLikes(p => ({ ...p, [id]: next }))
    const ns = new Set(likedSet); ns.add(id); setLikedSet(ns)
    try { localStorage.setItem('td_liked', JSON.stringify([...ns])) } catch (e) {}
    try { await supabase.rpc('increment_portfolio_likes', { p_item_id: id }) } catch (e) { try { await supabase.from('portfolio_items').update({ likes_count: next }).eq('id', id) } catch (e2) {} }
  }
  function openMember(m) {
    setActiveMember(m); setMemberComment(''); setMemberRating(0)
  }
  async function submitMemberRating() {
    if (!requireLogin('member')) return
    if (!memberRating) return
    setSubmittingMemberRating(true)
    const { error } = await supabase.from('team_ratings').upsert({
      member_id: activeMember.id, customer_id: customer.id, rating: memberRating, comment: memberComment.trim() || null,
    }, { onConflict: 'member_id,customer_id' })
    setSubmittingMemberRating(false)
    if (!error) { setMemberComment(''); setMemberRating(0); await refreshTeam() }
  }
  async function sendLeadEmail(name, phone, email, ans) { try { const ce = company.email || company.business_email || company.owner_email; if (!ce) return; await fetch(`${SUPABASE_URL}/functions/v1/send-lead-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_name: company.name, company_email: ce, company_whatsapp: company.whatsapp || '', lead_name: name, lead_phone: phone, lead_email: email, answers: ans, slug }) }) } catch (e) {} }
  async function submitLead(e) {
    e.preventDefault(); if (!requireLogin('lead')) return
    // Lead gate: profile must be complete (phone + area mandatory).
    const phone = (customer?.phone || pfPhone || '').trim()
    const area = (customer?.area || pfArea || '').trim()
    if (!phone || !area) return // the required fields enforce this in the UI
    setSubmitting(true)
    // If the profile was incomplete, save phone + area to the customer first.
    let cust = customer
    if (!cust?.phone || !cust?.area) {
      const updated = await updateCustomerProfile(cust.id, { phone, area })
      if (updated) { cust = updated; setCustomer(updated) }
    }
    const name = cust?.full_name || ''; const email = cust?.email || ''
    const fullAnswers = { ...answers, Location: area }
    const { data: leadRow } = await supabase.from('lead_submissions').insert({ form_id: leadForm.id, company_id: company.id, customer_id: cust?.id || null, name, phone, email, answers: fullAnswers, source_url: window.location.href }).select('id').single()
    await supabase.rpc('increment_leads', { p_company_id: company.id }); await sendLeadEmail(name, phone, email, fullAnswers)
    // Confirmation email to the customer (fire-and-forget)
    if (leadRow?.id && email) {
      try {
        fetch(`${SUPABASE_URL}/functions/v1/send-lead-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ lead_id: leadRow.id }),
        })
      } catch (e) {}
    }
    if (company.whatsapp) { const msg = ['🏢 *New Lead from Quvera*', '', '👤 Name: ' + (name || 'Not provided'), '📞 Phone: ' + (phone || 'Not provided'), '✉️ Email: ' + (email || 'Not provided'), '📍 Area: ' + (area || 'Not provided'), '', '📋 *Answers:*', ...Object.entries(fullAnswers).map(([q, a]) => '• ' + q + ': ' + a), '', '🔗 Via: quvera.ae/' + slug].join('\n'); window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank') }
    setSubmitting(false); setSubmitted(true)
  }
  async function submitReview(e) { e.preventDefault(); if (!requireLogin('review')) return; if (!reviewText.trim()) return; setSubmittingReview(true); await supabase.from('reviews').insert({ company_id: company.id, reviewer_name: customer.full_name || customer.email, reviewer_email: customer.email, customer_id: customer.id, rating: reviewRating, review_text: reviewText, is_approved: true }); setSubmittingReview(false); setReviewSubmitted(true); setShowReviewForm(false); setReviewText(''); await refreshReviews() }
  async function deleteReview(id) { if (!confirm('Delete your review?')) return; await supabase.from('reviews').delete().eq('id', id); await refreshReviews() }
  async function saveEditReview(id) { if (!editingText.trim()) return; await supabase.from('reviews').update({ rating: editingRating, review_text: editingText }).eq('id', id); setEditingReviewId(null); await refreshReviews() }

  const Fonts = () => <style>{`
    @keyframes tdspin{to{transform:rotate(360deg)}}
    @keyframes tdfade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes tdshine{0%{background-position:-120% 0}60%,100%{background-position:220% 0}}
    @keyframes tdfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes tdpop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}
    .td-card{animation:tdfade .55s cubic-bezier(.2,.7,.2,1) both}
    .td-shine{position:relative;overflow:hidden}
    .td-shine::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.5) 50%,transparent 70%);background-size:200% 100%;animation:tdshine 3.5s ease-in-out infinite}
    .td-likebtn:active{transform:scale(.8)}
    .td-port{transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s}
    .td-port:hover{transform:translateY(-4px)}
    .td-port:hover .td-port-ov{opacity:1}
    .td-heart-pop{animation:tdpop .4s ease both}
    .td-shieldring{transition:transform .3s}
    .td-shieldring:hover{transform:translateY(-3px)}
    .td-tmcard{transition:transform .25s,border-color .25s}
    .td-tmcard:hover{transform:translateY(-3px)}
    .td-navtab:hover{color:#1d6fb8 !important}
  `}</style>

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070b15' }}><Fonts /><div style={{ textAlign: 'center' }}><div style={{ width: 40, height: 40, border: '3px solid #4f9fe0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'tdspin .8s linear infinite', margin: '0 auto 14px' }} /><div style={{ fontSize: 14, color: '#9aa7bd', fontFamily: 'Manrope,sans-serif' }}>Loading profile…</div></div></div>
  if (notFound) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e7ecf3' }}><Fonts /><div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 52 }}>🔍</div><h2 style={{ fontFamily: 'Sora,sans-serif', color: '#16233a', margin: '12px 0' }}>Company not found</h2><button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: '#1d6fb8', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Go to Quvera</button></div></div>

  // Prerender fast-body: on the crawler (window.__PRERENDER__) render a light,
  // SEO-only body instead of the full profile, so the heavy component tree never
  // renders on Vercel's 2-core build box (that render was the crawl's bottleneck).
  // Real users have no flag → they get the full page below. The head already has
  // the title/canonical/OG + LocalBusiness JSON-LD, so SEO is complete.
  if (typeof window !== 'undefined' && window.__PRERENDER__) {
    const where = company.location || 'Dubai'
    const hasRating = company.avg_rating != null && company.total_reviews > 0
    return (
      <div style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: "'Manrope',sans-serif", color: '#16233a' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '22px 16px' }}>
          <a href="/" style={{ color: '#0099cc', textDecoration: 'none', fontWeight: 800, fontFamily: "'Sora',sans-serif", fontSize: 17 }}>Quvera</a>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(22px,4vw,30px)', fontWeight: 800, margin: '14px 0 6px', lineHeight: 1.2 }}>{company.name}</h1>
          <div style={{ color: '#56657c', fontSize: 15, marginBottom: 12 }}>{company.category || 'Verified business'} in {where}, Dubai</div>
          <p style={{ color: '#56657c', fontSize: 15, lineHeight: 1.65 }}>{company.description || `${company.name} is a verified ${(company.category || 'business').toLowerCase()} in ${where}, Dubai on Quvera. See reviews, ratings, services and contact details, and request a free quote.`}</p>
          {hasRating && <div style={{ marginTop: 10, fontWeight: 700 }}>★ {Number(company.avg_rating).toFixed(1)} · {company.total_reviews} reviews</div>}
        </div>
      </div>
    )
  }

  const plan = company.plan || 'free'
  const isPremium = plan === 'gold' || plan === 'platinum'
  const isPlatinum = plan === 'platinum'
  const TH = makeTheme(dark)
  const F = "'Manrope',sans-serif"
  const cats = Array.isArray(company.categories) && company.categories.length ? company.categories : company.category ? [company.category] : []
  const cred = calcCredibility(company, reviews)
  const sub = calcSubScores(company, reviews)
  const ai = buildAISummary(reviews)
  const socialLinks = buildSocialLinks(company)
  const respRate = 99
  const community = cred >= 75 ? 'Excellent' : cred >= 50 ? 'Good' : 'Building'
  const isListed = !!(company.is_imported || company.verification_level === 'listed')
  const gRating = Number(company.google_rating) || 0
  const gReviews = Number(company.google_reviews_count) || 0
  const showClaim = !!(company.is_imported && !company.claimed)
  const goClaim = () => { window.location.href = '/claim-company?slug=' + encodeURIComponent(company.slug || '') }
  const heroStats = (isListed && reviews.length === 0)
    ? [['Google Rating', gRating, '★', TH.gold, true], ['Google Reviews', gReviews, '', TH.t1]]
    : [['Rating', (company.avg_rating || '0.0'), '★', TH.gold, true], ['Reviews', company.total_reviews || reviews.length, '', TH.t1], ['Response', respRate, '%', TH.green]]

  const sortedReviews = [...reviews].sort((a, b) => reviewTab === 'highest' ? b.rating - a.rating : 0)
  const tabReviews = reviewTab === 'verified' ? sortedReviews.filter(r => r.customer_id) : sortedReviews
  const reviewSlots = (showAllReviews || reviewTab === 'all') ? tabReviews : tabReviews.slice(0, 6)
  const fixedReviewSlots = Math.max(2, reviewSlots.length)
  const portLimit = limitOf('portfolioLimit', plan)
  const shownPortfolio = portfolio.slice(0, Math.min(portLimit, portfolio.length))
  const verifiedCount = team.length

  /* ---- doc verification (3rd shield) ---- */
  const today = new Date().toISOString().slice(0, 10)
  function docVerified(doc) {
    if (doc.source === 'company_column') {
      if (doc.source_field === 'owner_eid_status') {
        // Owner EID: must be verified AND not expired (if expiry is set)
        if (company.owner_eid_status !== 'verified') return false
        if (company.owner_eid_expiry && company.owner_eid_expiry < today) return false
        return true
      }
      if (doc.source_field === 'phone_verified_at') return !!company.phone_verified_at
      if (doc.source_field === 'email_auto') return !!company.owner_email
      if (doc.source_field === 'trade_license_status') return company.trade_license_status === 'verified'
      return false
    }
    const cd = companyDocs[doc.doc_key]
    if (!cd || cd.status !== 'verified') return false
    if (cd.doc_expiry && cd.doc_expiry < today) return false
    return true
  }
  const docTotal = docMeta.length || 8
  const docVerifiedCount = docMeta.filter(docVerified).length
  const docPercent = docTotal > 0 ? Math.round((docVerifiedCount / docTotal) * 100) : 0
  const tier = cred >= 80 ? { l: 'Elite' } : cred >= 60 ? { l: 'Trusted' } : cred >= 40 ? { l: 'Verified' } : { l: 'Building' }

  const chip = (t, k) => <span key={k} style={{ fontSize: 10.5, padding: '4px 11px', borderRadius: 7, background: TH.soft, border: `1px solid ${TH.line}`, color: TH.t2, fontWeight: 600 }}>{t}</span>
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  /* ---- Get-a-Quote lead form — rendered inside a MODAL (opened via the
     "Get a Quote" button). Written as a plain function (NOT a <Component/>) so
     inputs/selects keep their focus & selection across re-renders. ---- */
  function renderQuoteForm() {
    if (submitted) {
      return (
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <h3 style={{ fontFamily: "'Sora',sans-serif", marginTop: 8, fontSize: 16, color: TH.t1 }}>Request Submitted!</h3>
          <p style={{ fontSize: 12, color: TH.t2, marginTop: 4 }}>{company.name} will contact you shortly.</p>
          <button onClick={() => setShowQuote(false)} style={{ marginTop: 14, padding: '9px 22px', background: TH.grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      )
    }
    return (
      <form onSubmit={submitLead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingRight: 30 }}>
          <span style={{ fontSize: 18 }}>📩</span>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, color: TH.t1 }}>{leadForm?.title || 'Get a Quote'}</span>
        </div>
        {customer && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '7px 11px', marginBottom: 12, fontSize: 11.5, color: TH.green }}>✓ Submitting as {customer.full_name || customer.email}</div>}
        {customer && (!customer.phone || !customer.area) && (() => {
          const inp = { width: '100%', padding: '10px 12px', border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.soft, color: TH.t1, outline: 'none' }
          return (
            <div style={{ border: `1px solid ${TH.accent}40`, background: TH.accent + '0d', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: TH.accent, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Your contact details</div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: TH.t1 }}>Phone / WhatsApp<span style={{ color: TH.red }}> *</span></label>
                <input required type="tel" value={pfPhone} onChange={e => setPfPhone(e.target.value)} placeholder="+971 50 000 0000" style={inp} />
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: TH.t1 }}>Area / Location<span style={{ color: TH.red }}> *</span></label>
                <select required value={pfArea} onChange={e => setPfArea(e.target.value)} style={inp}><option value="">Select your area</option>{DUBAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}</select>
              </div>
              <div style={{ fontSize: 10.5, color: TH.t3, marginTop: 8, lineHeight: 1.5 }}>We share these with the company so they can send you a quote. Saved to your profile for next time.</div>
            </div>
          )
        })()}
        {questions.map(q => {
          const inp = { width: '100%', padding: '10px 12px', border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.soft, color: TH.t1, outline: 'none' }
          return (
            <div key={q.id} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5, color: TH.t1 }}>{q.question}{q.required && <span style={{ color: TH.red }}> *</span>}</label>
              {q.type === 'text' && <input required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question]: e.target.value }))} style={inp} />}
              {q.type === 'select' && <select required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question]: e.target.value }))} style={inp}><option value="">Select</option>{(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}</select>}
              {q.type === 'radio' && (q.options || []).map((o, i) => <label key={i} style={{ display: 'flex', gap: 7, fontSize: 12.5, color: TH.t2, marginBottom: 7, cursor: 'pointer' }}><input type="radio" name={'q_' + q.id} value={o} checked={answers[q.question] === o} required={q.required} onChange={() => setAnswers(p => ({ ...p, [q.question]: o }))} />{o}</label>)}
            </div>
          )
        })}
        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, background: submitting ? '#94a3b8' : TH.grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: TH.glow }}>{submitting ? '...' : customer ? 'Submit — Get Quote' : 'Sign in to Submit'}</button>
      </form>
    )
  }

  const PortCard = ({ p }) => {
    const liked = likedSet.has(p.id)
    return (
      <div className="td-port" style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', border: `1px solid ${TH.line}`, background: TH.soft, cursor: 'pointer' }}>
        <img src={p.image_url} alt={p.title || ''} onClick={() => setLightboxImg(p)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.opacity = 0.2 }} />
        <div className="td-port-ov" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.1) 45%,transparent 70%)', opacity: 0, transition: 'opacity .3s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 10 }} onClick={() => setLightboxImg(p)}>
          {p.title && <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Sora',sans-serif", marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>}
          {p.description && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</div>}
        </div>
        <button className={`td-likebtn ${liked ? 'td-heart-pop' : ''}`} onClick={(e) => { e.stopPropagation(); likePortfolio(p.id) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', border: 'none', borderRadius: 20, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'transform .15s' }}>
          <span style={{ fontSize: 13, filter: liked ? 'none' : 'grayscale(1) brightness(2)' }}>{liked ? '❤️' : '🤍'}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{portLikes[p.id] || 0}</span>
        </button>
      </div>
    )
  }

  const TeamCard = ({ m }) => (
    <div className="td-tmcard" onClick={() => openMember(m)} style={{ border: `1px solid ${TH.line}`, borderRadius: 12, padding: 12, textAlign: 'center', background: TH.soft, cursor: 'pointer' }}>
      <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto 8px' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: m.photo_url ? 'transparent' : TH.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>
          {m.photo_url ? <img src={m.photo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.name?.[0]?.toUpperCase() || '?')}
        </div>
        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: TH.green, border: `2px solid ${TH.cardSolid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#06281a', fontWeight: 800 }}>✓</span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: TH.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
      <div style={{ fontSize: 10.5, color: TH.t2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.role || '—'}</div>
      <div style={{ fontSize: 11, color: TH.gold, marginTop: 5 }}>
        {m.total_ratings > 0
          ? <>{'★'.repeat(Math.round(m.avg_rating))}{'☆'.repeat(5 - Math.round(m.avg_rating))} <span style={{ color: TH.t3 }}>({m.total_ratings})</span></>
          : <span style={{ color: TH.t3, fontSize: 10 }}>No ratings yet</span>}
      </div>
    </div>
  )

  const ReviewCard = ({ r }) => {
    if (!r) return <div style={{ border: `1px dashed ${TH.line}`, borderRadius: 12, minHeight: 200, background: TH.soft }} />
    const a = analyzeReview(r); const mine = customer && r.customer_id === customer.id; const ed = editingReviewId === r.id
    return (
      <div style={{ border: `1px solid ${mine ? TH.accent : TH.line}`, borderRadius: 12, padding: 13, background: TH.soft, display: 'flex', flexDirection: 'column', minHeight: 200, boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: TH.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{(r.reviewer_name || 'A')[0].toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reviewer_name || 'Anonymous'}{mine && <span style={{ fontSize: 8, color: TH.accent, marginLeft: 4 }}>(You)</span>}</div>
            <div style={{ color: TH.gold, fontSize: 10 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          </div>
          {mine && !ed && <span style={{ display: 'flex', gap: 4 }}><button onClick={() => { setEditingReviewId(r.id); setEditingText(r.review_text); setEditingRating(r.rating) }} style={{ fontSize: 10, background: 'none', border: 'none', color: TH.t3, cursor: 'pointer' }}>✏️</button><button onClick={() => deleteReview(r.id)} style={{ fontSize: 10, background: 'none', border: 'none', color: TH.red, cursor: 'pointer' }}>🗑️</button></span>}
          {!mine && <span style={{ color: TH.t3, fontSize: 13 }}>⋯</span>}
        </div>
        {ed ? (
          <div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditingRating(s)} type="button" style={{ fontSize: 17, background: 'none', border: 'none', cursor: 'pointer', color: s <= editingRating ? TH.gold : TH.line }}>★</button>)}</div>
            <textarea value={editingText} onChange={e => setEditingText(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${TH.line}`, borderRadius: 7, fontSize: 12, minHeight: 50, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.cardSolid, color: TH.t1, marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 5 }}><button onClick={() => saveEditReview(r.id)} style={{ flex: 1, padding: 6, background: TH.accent, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Save</button><button onClick={() => setEditingReviewId(null)} style={{ flex: 1, padding: 6, background: TH.cardSolid, color: TH.t2, border: `1px solid ${TH.line}`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancel</button></div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 11.5, color: TH.t2, lineHeight: 1.5, margin: '0 0 10px', flex: 1, overflowY: 'auto', minHeight: 0, overflowWrap: 'anywhere' }}>{r.review_text}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${TH.line}` }}>
              <button onClick={() => markHelpful(r.id)} style={{ fontSize: 10, color: TH.t3, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>👍 Helpful ({helpful[r.id] || 0})</button>
              {aiAnalysisOn && can('aiReviewAnalysis', plan) && r.review_text && r.review_text.length > 5 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: TH.t3 }}>⚡ AI Authenticity</div>
                  <div style={{ fontSize: 9.5, color: a.ok ? TH.green : TH.amber, fontWeight: 700 }}>{a.ok ? '✓ ' : ''}{a.label}</div>
                </div>
              )}
            </div>
            {r.owner_reply && <div style={{ background: TH.accent + '14', border: `1px solid ${TH.accent}44`, borderRadius: 7, padding: '7px 10px', marginTop: 8 }}><div style={{ fontSize: 9.5, fontWeight: 700, color: TH.accent, marginBottom: 3 }}>💬 Owner Reply</div><p style={{ fontSize: 10.5, color: TH.t2, margin: 0, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{r.owner_reply}</p></div>}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="td-root" style={{ background: TH.bg, minHeight: '100vh', fontFamily: F, color: TH.t1, fontSize: 13, overflowX: 'hidden' }}>
      <Fonts />

      {/* STICKY GLASS NAV */}
      <div style={{ background: TH.dark ? 'rgba(7,11,21,0.7)' : 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${TH.line}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, color: TH.t1 }}><span style={{ background: TH.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Quvera</span></button>
            <div className="td-navtabs" style={{ display: 'flex', gap: 18 }}>
              {[['overview', 'Overview'], ['portfolio', 'Work'], ['trust', 'Trust'], ['reviews', 'Reviews']].map(([k, l]) => <button key={k} onClick={() => scrollTo(k)} className="td-navtab" style={{ fontSize: 11, fontWeight: 700, background: 'none', border: 'none', color: TH.t2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</button>)}
              {verifiedCount > 0 && <button onClick={() => setShowTeamModal(true)} className="td-navtab" style={{ fontSize: 11, fontWeight: 700, background: 'none', border: 'none', color: TH.t2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team</button>}
              {docVerifiedCount > 0 && <button onClick={() => setShowDocsModal(true)} className="td-navtab" style={{ fontSize: 11, fontWeight: 700, background: 'none', border: 'none', color: TH.t2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Verification</button>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <button onClick={() => setDark(d => !d)} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${TH.line}`, background: TH.soft, color: TH.t2, cursor: 'pointer', fontSize: 14 }}>{dark ? '☀️' : '🌙'}</button>
            {customer === undefined ? <div style={{ width: 56, height: 30, background: TH.soft, borderRadius: 20 }} /> : customer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: TH.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{(customer.full_name || customer.email)[0].toUpperCase()}</div>
                <button onClick={() => { signOut(); setCustomer(null) }} style={{ fontSize: 11, color: TH.t3, background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
              </div>
            ) : (
              <button onClick={() => signInWithGoogle()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 20, padding: '6px 13px', fontSize: 12, fontWeight: 600, color: TH.t1, cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '18px 16px 50px' }} className="td-container">

        {/* HERO */}
        <Card TH={TH} id="overview" style={{ padding: 0, overflow: 'hidden', ...(isPremium ? { border: `1px solid ${TH.gold}66`, boxShadow: TH.glowGold } : {}) }}>
          {isPremium && <div className="td-shine" style={{ height: 4, background: TH.gradGold }} />}
          <div style={{ background: isPremium ? (TH.dark ? 'linear-gradient(120deg,rgba(224,181,62,0.16),rgba(167,139,250,0.10))' : 'linear-gradient(120deg,rgba(201,162,39,0.10),rgba(139,92,246,0.06))') : (TH.dark ? 'linear-gradient(120deg,rgba(79,159,224,0.16),rgba(167,139,250,0.12))' : 'linear-gradient(120deg,rgba(29,111,184,0.08),rgba(139,92,246,0.07))'), padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }} className="td-hero">
            <div className="td-hero-main" style={{ flex: 1, minWidth: 0 }}>
              <div className="td-bizname" style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, overflowWrap: 'anywhere' }}>{company.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '8px 0 14px' }}>
                {company.is_verified && <span className="td-shine" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'linear-gradient(135deg,#1e9e63,#22c55e)', padding: '4px 11px', borderRadius: 20 }}>✓ Verified Business</span>}
                {plan !== 'free' && <span className={isPremium ? 'td-shine' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: TH.gradGold, color: '#3a2c00', padding: '4px 11px', borderRadius: 20, boxShadow: isPremium ? TH.glowGold : 'none' }}>{isPlatinum ? '💎' : '★'} {isPremium ? 'Premium · ' : ''}{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>}
                {isListed && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: TH.soft, border: `1px solid ${TH.line}`, color: TH.t2, padding: '4px 11px', borderRadius: 20 }}>📍 Listed on Quvera</span>}
              </div>
              {gRating > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14, background: TH.soft, border: `1px solid ${TH.line}`, padding: '6px 12px', borderRadius: 20, maxWidth: '100%', flexWrap: 'wrap' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 800, color: TH.t1 }}>{gRating.toFixed(1)}</span>
                  <span style={{ color: TH.gold, fontSize: 12 }}>{'★'.repeat(Math.round(gRating))}</span>
                  <span style={{ fontSize: 11, color: TH.t3, fontWeight: 600 }}>· {gReviews} reviews on Google</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {heroStats.map(([k, v, st, col, dec]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9.5, color: TH.t3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: col, marginTop: 2 }}><Counter to={v} decimals={dec ? 1 : 0} />{st && <span style={{ color: TH.gold, fontSize: 17 }}> {st}</span>}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 14 }}>{cats.map(c => chip(c, c))}{company.location && chip('📍 ' + company.location, 'loc')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {company.whatsapp && <button onClick={() => window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent("Hi, I saw your profile on Quvera and I'm interested in your services."), '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 18px rgba(37,211,102,0.32)' }}>💬 WhatsApp</button>}
                {company.phone && <a href={'tel:' + company.phone.replace(/\s/g, '')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: TH.soft, color: TH.t1, border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>📞 Call</a>}
                {leadForm && <button onClick={() => setShowQuote(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: TH.grad, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: TH.glow }}>📩 Get a Quote</button>}
                <button onClick={() => { scrollTo('reviews'); if (requireLogin('review')) setShowReviewForm(true) }} style={{ padding: '8px 16px', background: TH.soft, color: TH.t1, border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>★ Write Review</button>
                {can('socialLinks', plan) && socialLinks.map(s => <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: TH.soft, color: TH.t1, borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: `1px solid ${TH.line}` }}>{s.icon} {s.label}</a>)}
              </div>
            </div>
            {/* 3 SHIELD RINGS */}
            <div className="td-hero-rings" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'nowrap', maxWidth: '100%' }}>
              <div style={{ animation: 'tdfloat 5s ease-in-out infinite' }}>
                <ShieldRing TH={TH} value={cred} fillPct={cred / 100} ringColor={TH.violet} gradId="grTrust" gradTo={TH.accent} caption="Trust" sub={tier.l} />
              </div>
              {verifiedCount > 0 && (
                <div style={{ animation: 'tdfloat 5s ease-in-out infinite 0.3s' }}>
                  <ShieldRing TH={TH} value={verifiedCount} fillPct={1} ringColor={TH.gold} gradId="grTeam" gradTo="#f0d278" caption="Team" sub="Verified" onClick={() => setShowTeamModal(true)} />
                </div>
              )}
              {docVerifiedCount > 0 && (
                <div style={{ animation: 'tdfloat 5s ease-in-out infinite 0.6s' }}>
                  <ShieldRing TH={TH} value={docPercent} suffix="%" fillPct={docPercent / 100} ringColor={TH.green} gradId="grVer" gradTo="#22c55e" caption="Verified" sub="Documents" onClick={() => setShowDocsModal(true)} />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* CLAIM BANNER — unclaimed imported listings */}
        {showClaim && (
          <Card TH={TH} style={{ padding: 0, overflow: 'hidden', border: `1px solid ${TH.accent}44` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '15px 18px', background: TH.dark ? 'linear-gradient(120deg,rgba(79,159,224,0.16),rgba(167,139,250,0.12))' : 'linear-gradient(120deg,rgba(29,111,184,0.08),rgba(139,92,246,0.07))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ fontSize: 24 }}>🏢</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: TH.t1 }}>Is this your business?</div>
                  <div style={{ fontSize: 11.5, color: TH.t2, marginTop: 2, lineHeight: 1.4 }}>Claim this free profile to add photos, reply to reviews, get verified &amp; receive customer leads.</div>
                </div>
              </div>
              <button onClick={goClaim} style={{ flexShrink: 0, padding: '10px 20px', background: TH.grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', boxShadow: TH.glow, whiteSpace: 'nowrap' }}>Claim This Profile →</button>
            </div>
          </Card>
        )}

        {/* 3-COLUMN */}
        <div className="td-cols" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.28fr) minmax(0,0.86fr)', gap: 14, alignItems: 'start' }}>

          {/* LEFT */}
          <div style={{ minWidth: 0 }}>
            {can('trustGauges', plan) && (
              <Card TH={TH} id="trust">
                <H2 TH={TH}>🛡️ Trust Overview</H2>
                <div className="td-t4" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  <MiniGauge TH={TH} label="Reputation" score={sub.reputation} color={TH.green} />
                  <MiniGauge TH={TH} label="Satisfaction" score={sub.satisfaction} color={TH.blue} />
                  <MiniGauge TH={TH} label="Service Quality" score={sub.service} color={TH.gold} />
                  <MiniGauge TH={TH} label="Community" score={sub.community} color={TH.violet} />
                </div>
              </Card>
            )}

            {can('aiSummary', plan) && (
              <Card TH={TH}>
                <H2 TH={TH}>🤖 AI Business Summary</H2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 9, color: TH.green }}>Customers Love</div>
                    {(ai.loves.length ? ai.loves : ['Building reputation']).map((l, i) => <div key={i} style={{ fontSize: 11, color: TH.t2, marginBottom: 7, display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}><span style={{ color: TH.green }}>✔</span>{l}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 9, color: TH.red }}>Concerns</div>
                    {(ai.concerns.length ? ai.concerns : ['None reported']).map((c, i) => <div key={i} style={{ fontSize: 11, color: TH.t2, marginBottom: 7, display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}><span style={{ color: TH.red }}>✖</span>{c}</div>)}
                  </div>
                </div>
              </Card>
            )}

            <Card TH={TH}>
              <H2 TH={TH}>📋 About</H2>
              <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 800, margin: '0 0 4px' }}>Story</h4>
              <p style={{ fontSize: 11.5, color: TH.t2, lineHeight: 1.6, margin: '0 0 10px', overflowWrap: 'anywhere' }}>{company.description || 'No description added yet.'}</p>
              <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 800, margin: '0 0 6px' }}>Services</h4>
              {cats.length ? cats.map(c => <div key={c} style={{ fontSize: 11.5, color: TH.t2, padding: '3px 0' }}>• {c}</div>) : <div style={{ fontSize: 11, color: TH.t3 }}>No services listed</div>}
            </Card>

            <Card TH={TH}>
              <H2 TH={TH}>📍 Location</H2>
              {(() => {
                const mq = encodeURIComponent((company.address || company.location || ((company.name || '') + ' Dubai')).replace(/\n/g, ', '))
                const dir = company.map_link || `https://www.google.com/maps/search/?api=1&query=${mq}`
                return (
                  <>
                    <div style={{ height: 170, borderRadius: 12, overflow: 'hidden', marginBottom: 10, border: '1px solid ' + TH.line }}>
                      <iframe title={'Map — ' + (company.name || 'location')} src={`https://maps.google.com/maps?q=${mq}&z=15&output=embed`} width="100%" height="170" style={{ border: 0, display: 'block' }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                    </div>
                    <div style={{ fontSize: 12, color: TH.t2, lineHeight: 1.7 }}>
                      <div><b style={{ color: TH.t1 }}>{company.name}</b><br /><span style={{ whiteSpace: 'pre-line' }}>{company.address || company.location || 'Dubai, UAE'}</span></div>
                      {company.phone && <div>📞 {company.phone}</div>}
                      <div>🕐 8 AM – 8 PM</div>
                    </div>
                    <a href={dir} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, padding: '10px', borderRadius: 10, background: TH.accent, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>🧭 Get Directions</a>
                  </>
                )
              })()}
            </Card>
          </div>

          {/* CENTER */}
          <div id="reviews" style={{ minWidth: 0 }}>
            {can('portfolio', plan) && (
              <Card TH={TH} id="portfolio">
                <H2 TH={TH} right={portfolio.length > 6 ? <button onClick={() => setShowAllGallery(true)} style={{ fontSize: 11, fontWeight: 700, color: TH.accent, background: 'none', border: 'none', cursor: 'pointer' }}>View All ({portfolio.length}) →</button> : null}>🖼️ Portfolio</H2>
                {shownPortfolio.length ? (
                  <div className="td-mgal" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
                    {shownPortfolio.slice(0, 6).map(p => <PortCard key={p.id} p={p} />)}
                  </div>
                ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 10 }}>🖼️ No work posted yet</div>}
              </Card>
            )}

            <Card TH={TH}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[['latest', 'Latest'], ['highest', 'Highest'], ['verified', 'Verified'], ['all', 'All']].map(([k, l]) => <span key={k} onClick={() => { setReviewTab(k); setShowAllReviews(false) }} style={{ fontSize: 11, padding: '5px 13px', borderRadius: 7, cursor: 'pointer', fontWeight: 700, background: reviewTab === k ? TH.t1 : TH.soft, color: reviewTab === k ? TH.cardSolid : TH.t2 }}>{l}</span>)}
                </div>
                {!reviewSubmitted && <button onClick={() => { if (requireLogin('review')) setShowReviewForm(true) }} style={{ fontSize: 11, padding: '6px 14px', background: customer ? TH.grad : TH.soft, color: customer ? '#fff' : TH.t2, border: customer ? 'none' : `1px solid ${TH.line}`, borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>{customer ? '+ Write a Review' : '🔐 Sign in to Review'}</button>}
              </div>
              {showReviewForm && customer && (
                <div style={{ border: `1px solid ${TH.line}`, borderRadius: 12, padding: 13, marginBottom: 12, background: TH.soft }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setReviewRating(s)} type="button" style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: s <= reviewRating ? TH.gold : TH.line }}>★</button>)}</div>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." style={{ width: '100%', padding: '10px 12px', border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 13, minHeight: 70, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', background: TH.cardSolid, color: TH.t1, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={submitReview} disabled={submittingReview || !reviewText.trim()} style={{ flex: 1, padding: 9, background: (submittingReview || !reviewText.trim()) ? '#94a3b8' : TH.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{submittingReview ? '...' : 'Submit Review'}</button>
                    <button onClick={() => setShowReviewForm(false)} style={{ flex: 1, padding: 9, background: TH.cardSolid, color: TH.t2, border: `1px solid ${TH.line}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
              {reviewSubmitted && <div style={{ marginBottom: 12, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: 11, textAlign: 'center', fontSize: 12, color: TH.green, fontWeight: 600 }}>✅ Review submitted successfully!</div>}
              <div className="td-revgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                {Array.from({ length: fixedReviewSlots }).map((_, i) => <ReviewCard key={reviewSlots[i]?.id || 'empty' + i} r={reviewSlots[i]} />)}
              </div>
              {reviewTab !== 'all' && tabReviews.length > 6 && !showAllReviews && (
                <div style={{ textAlign: 'center', marginTop: 12 }}><button onClick={() => setShowAllReviews(true)} style={{ padding: '7px 20px', background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 20, fontSize: 11, fontWeight: 700, color: TH.accent, cursor: 'pointer' }}>View all {tabReviews.length} reviews →</button></div>
              )}
            </Card>

            {googleOn && (
              <Card TH={TH}>
                <H2 TH={TH} right={<span style={{ fontSize: 9, fontWeight: 700, color: TH.t3, background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 8, padding: '3px 9px' }}>Coming soon</span>}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google Reviews
                  </span>
                </H2>
                <div style={{ textAlign: 'center', padding: '24px 16px', border: `1px dashed ${TH.line}`, borderRadius: 10, background: TH.soft }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>🔗</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TH.t1, marginBottom: 5 }}>Google Reviews coming soon</div>
                  <div style={{ fontSize: 11, color: TH.t3, lineHeight: 1.6 }}>Once connected, verified Google reviews will appear here alongside Quvera reviews.</div>
                </div>
              </Card>
            )}

            {can('sentiment', plan) && (
              <Card TH={TH}>
                <H2 TH={TH}>📈 Customer Sentiment</H2>
                {(() => {
                  const dist = [5,4,3,2,1].map(s => reviews.filter(r => r.rating === s).length)
                  const maxD = Math.max(...dist, 1)
                  const pos = reviews.filter(r => r.rating >= 4).length, neu = reviews.filter(r => r.rating === 3).length, neg = reviews.filter(r => r.rating <= 2).length
                  const tot = reviews.length || 1
                  return (
                    <div>
                      <div style={{ display: 'flex', gap: 22, marginBottom: 12, flexWrap: 'wrap' }}>
                        <div><div style={{ fontSize: 11, color: TH.green, fontWeight: 700 }}>● Positive</div><div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: TH.green }}><Counter to={Math.round(pos / tot * 100)} suffix="%" /></div></div>
                        <div><div style={{ fontSize: 11, color: TH.t2, fontWeight: 700 }}>● Neutral</div><div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800 }}><Counter to={Math.round(neu / tot * 100)} suffix="%" /></div></div>
                        <div><div style={{ fontSize: 11, color: TH.red, fontWeight: 700 }}>● Negative</div><div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: TH.red }}><Counter to={Math.round(neg / tot * 100)} suffix="%" /></div></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 130, borderBottom: `1px solid ${TH.line}`, padding: '0 6px' }}>
                        {[5,4,3,2,1].map((star, i) => (
                          <div key={star} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                            <div style={{ fontSize: 9, color: TH.t3 }}>{dist[i]}</div>
                            <div style={{ width: '55%', maxWidth: 24, height: `${Math.max(3, dist[i] / maxD * 100)}%`, background: star >= 4 ? TH.green : star === 3 ? TH.gold : TH.red, borderRadius: '5px 5px 0 0', transition: 'height 1s cubic-bezier(.3,1,.4,1)' }} />
                            <div style={{ fontSize: 9, color: TH.t3 }}>{star}★</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, fontSize: 9.5, color: TH.t2, flexWrap: 'wrap' }}><span>● Positive (4-5★)</span><span style={{ color: TH.gold }}>● Neutral (3★)</span><span style={{ color: TH.red }}>● Negative (1-2★)</span></div>
                    </div>
                  )
                })()}
              </Card>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ minWidth: 0 }}>
            {can('badges', plan) && badges.length > 0 && (
              <Card TH={TH}>
                <H2 TH={TH}>🏅 Achievements</H2>
                <div style={{ display: 'grid', gap: 9 }}>
                  {badges.map((b, i) => {
                    const bc = b.style === 'navy' ? TH.blue : b.style === 'red' ? TH.red : TH.gold
                    return (
                      <div key={i} className="td-shine" style={{ border: `1.5px solid ${bc}`, borderRadius: 12, padding: '15px', textAlign: 'center', background: TH.dark ? `${bc}1f` : (b.style === 'red' ? 'linear-gradient(180deg,#fdf3f4,#fff)' : b.style === 'navy' ? 'linear-gradient(180deg,#f3f7fc,#fff)' : 'linear-gradient(180deg,#fdfaf0,#fff)') }}>
                        <div style={{ fontSize: 28 }}>{b.icon || '🎖️'}</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: TH.dark ? TH.t1 : bc, marginTop: 4 }}>{b.title}</div>
                        {b.subtitle && <div style={{ fontSize: 9, color: TH.t2, marginTop: 3, fontStyle: 'italic' }}>{b.subtitle}</div>}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {can('businessInsights', plan) && (
              <Card TH={TH}>
                <H2 TH={TH}>📊 Business Insights</H2>
                {[
                  { k: 'Profile Views', v: company.profile_views || 0, c: TH.accent, suff: '' },
                  { k: 'Total Reviews', v: company.total_reviews || reviews.length, c: TH.blue, suff: '' },
                  { k: 'Avg Rating', v: company.avg_rating || 0, c: TH.green, suff: '★', dec: 1 },
                ].map((m, i) => (
                  <div key={m.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: i < 2 ? `1px solid ${TH.line}` : 'none' }}>
                    <span style={{ fontSize: 10.5, color: TH.t2, fontWeight: 600 }}>{m.k}</span>
                    <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: m.c }}><Counter to={m.v} decimals={m.dec || 0} suffix={m.suff} /></span>
                  </div>
                ))}
              </Card>
            )}

            {/* DOCUMENT VERIFICATION */}
            {docVerifiedCount > 0 && (
              <Card TH={TH}>
                <H2 TH={TH} right={<button onClick={() => setShowDocsModal(true)} style={{ fontSize: 11, fontWeight: 700, color: TH.green, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>}>🛡️ Verified Documents</H2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
                  <div style={{ flex: 1, height: 7, borderRadius: 99, background: TH.soft, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${docPercent}%`, borderRadius: 99, background: 'linear-gradient(90deg,#1e9e63,#22c55e)', transition: 'width 1s' }} />
                  </div>
                  <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: TH.green }}>{docPercent}%</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {docMeta.slice(0, 4).map(doc => {
                    const ok = docVerified(doc)
                    return (
                      <div key={doc.doc_key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                        <span style={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, background: ok ? TH.blue : TH.line, color: ok ? '#fff' : TH.t3 }}>✓</span>
                        <span style={{ color: ok ? TH.t1 : TH.t3, fontWeight: ok ? 600 : 400 }}>{doc.label}</span>
                      </div>
                    )
                  })}
                  {docMeta.length > 4 && <div style={{ fontSize: 10.5, color: TH.t3, marginTop: 2 }}>+ {docMeta.length - 4} more documents</div>}
                </div>
              </Card>
            )}

            {/* OUR TEAM */}
            {team.length > 0 && (
              <Card TH={TH}>
                <H2 TH={TH} right={team.length > 4 ? <button onClick={() => setShowTeamModal(true)} style={{ fontSize: 11, fontWeight: 700, color: TH.gold, background: 'none', border: 'none', cursor: 'pointer' }}>View all ({team.length}) →</button> : null}>🛡️ Our Team</H2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {team.slice(0, 4).map(m => <TeamCard key={m.id} m={m} />)}
                </div>
              </Card>
            )}

            {can('faq', plan) && faqs.length > 0 && (
              <Card TH={TH}>
                <H2 TH={TH}>❓ FAQ</H2>
                {faqs.map((f, i) => (
                  <div key={f.id} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{ borderBottom: i < faqs.length - 1 ? `1px solid ${TH.line}` : 'none', padding: '10px 2px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600 }}>{f.question}<span style={{ color: TH.t3 }}>{openFaq === i ? '▴' : '▾'}</span></div>
                    {openFaq === i && <div style={{ fontSize: 11, color: TH.t2, marginTop: 7, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{f.answer}</div>}
                  </div>
                ))}
              </Card>
            )}

            {can('relatedBusiness', plan) && related.length > 0 && (
              <Card TH={TH}>
                <H2 TH={TH}>🔗 Related Businesses</H2>
                <div style={{ display: 'grid', gap: 8 }}>
                  {related.slice(0, 5).map((rc, i) => (
                    <div key={i} onClick={() => { if (rc.slug) window.location.href = '/' + rc.slug }} style={{ border: `1px solid ${TH.line}`, borderRadius: 10, padding: 11, background: TH.soft, cursor: 'pointer' }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.name}</div>
                      <div style={{ color: TH.gold, fontSize: 12 }}>{'★'.repeat(Math.round(rc.avg_rating || 0))} <span style={{ fontWeight: 800, color: TH.t1 }}>{rc.avg_rating || '—'}</span></div>
                      <div style={{ fontSize: 9, color: TH.t3, marginTop: 3 }}>{rc.category || '—'}{rc.is_verified && ' · ✓ Verified'}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '20px 4px 0', borderTop: `1px solid ${TH.line}`, marginTop: 14 }}>
          <div><span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16 }}><span style={{ background: TH.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Quvera</span></span><div style={{ fontSize: 11, color: TH.t2, marginTop: 6 }}>Verify Business</div></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: TH.t3, marginBottom: 8, fontWeight: 600 }}>Follow Us</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[{ k: 'instagram', icon: '📸', base: 'https://instagram.com/' }, { k: 'facebook', icon: '👍', base: 'https://facebook.com/' }, { k: 'linkedin', icon: '💼', base: 'https://linkedin.com/company/' }, { k: 'twitter', icon: '🐦', base: 'https://twitter.com/' }, { k: 'youtube', icon: '▶️', base: 'https://youtube.com/' }].map(s => {
                const val = social?.[s.k]; const href = val ? (val.startsWith('http') ? val : s.base + val.replace('@', '')) : null
                return <a key={s.k} href={href || '#'} target={href ? '_blank' : undefined} rel="noopener noreferrer" onClick={e => { if (!href) e.preventDefault() }} style={{ width: 34, height: 34, borderRadius: '50%', background: TH.soft, border: `1px solid ${TH.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, textDecoration: 'none', opacity: href ? 1 : 0.35, cursor: href ? 'pointer' : 'default' }}>{s.icon}</a>
              })}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: TH.t2 }}>{company.email && <div>📧 {company.email}</div>}<div style={{ marginTop: 4 }}>© Copyright 2026</div></div>
        </div>
      </div>

      {/* full gallery modal */}
      {showAllGallery && (
        <div onClick={() => setShowAllGallery(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 280, overflowY: 'auto', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', fontFamily: "'Sora',sans-serif", fontSize: 18 }}>🖼️ {company.name} — Portfolio ({portfolio.length})</h3>
              <button onClick={() => setShowAllGallery(false)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
              {portfolio.map(p => <PortCard key={p.id} p={p} />)}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS modal — verification list */}
      {showDocsModal && (
        <div onClick={() => setShowDocsModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 320, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: TH.cardSolid, borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 24, position: 'relative' }}>
            <button onClick={() => setShowDocsModal(false)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: TH.soft, border: `1px solid ${TH.line}`, color: TH.t2, cursor: 'pointer', fontSize: 15 }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 30 }}>🛡️</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: TH.t1, marginTop: 4 }}>Document Verification</div>
              <div style={{ fontSize: 12, color: TH.t2, marginTop: 2 }}>{company.name}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, fontWeight: 800, color: TH.green, background: TH.green + '1f', padding: '5px 14px', borderRadius: 20 }}>{docVerifiedCount} of {docTotal} verified · {docPercent}%</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docMeta.map(doc => {
                const ok = docVerified(doc)
                return (
                  <div key={doc.doc_key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 11, border: `1px solid ${ok ? TH.blue + '40' : TH.line}`, background: ok ? TH.blue + '0d' : TH.soft }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: ok ? TH.blue : TH.line, color: ok ? '#fff' : TH.t3 }}>✓</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: ok ? 700 : 500, color: ok ? TH.t1 : TH.t3 }}>{doc.label}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: ok ? TH.blue : TH.t3 }}>{ok ? 'Verified' : 'Not verified'}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 16, padding: '11px 13px', borderRadius: 10, background: TH.soft, fontSize: 11, color: TH.t3, lineHeight: 1.5, textAlign: 'center' }}>
              Documents are verified by the Quvera team against official records.
            </div>
          </div>
        </div>
      )}

      {/* TEAM modal — all verified members */}
      {showTeamModal && (
        <div onClick={() => setShowTeamModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 280, overflowY: 'auto', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', fontFamily: "'Sora',sans-serif", fontSize: 18 }}>🛡️ {company.name} — Verified Team ({team.length})</h3>
              <button onClick={() => setShowTeamModal(false)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
              {team.map(m => <TeamCard key={m.id} m={m} />)}
            </div>
          </div>
        </div>
      )}

      {/* MEMBER detail + rating popup */}
      {activeMember && (
        <div onClick={() => setActiveMember(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 320, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: TH.cardSolid, borderRadius: 18, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', padding: 24, position: 'relative' }}>
            <button onClick={() => setActiveMember(null)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: TH.soft, border: `1px solid ${TH.line}`, color: TH.t2, cursor: 'pointer', fontSize: 15 }}>✕</button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 84, height: 84, margin: '0 auto 12px' }}>
                <div style={{ width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', background: activeMember.photo_url ? 'transparent' : TH.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 30 }}>
                  {activeMember.photo_url ? <img src={activeMember.photo_url} alt={activeMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (activeMember.name?.[0]?.toUpperCase() || '?')}
                </div>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: TH.green, border: `3px solid ${TH.cardSolid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#06281a', fontWeight: 800 }}>✓</span>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: TH.t1 }}>{activeMember.name}</div>
              <div style={{ fontSize: 12.5, color: TH.t2, marginTop: 2 }}>{activeMember.role || '—'}{activeMember.experience_years ? ` · ${activeMember.experience_years} yrs exp` : ''}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, fontWeight: 800, color: TH.green, background: TH.green + '1f', padding: '3px 10px', borderRadius: 20 }}>✓ EID Verified</div>

              <div style={{ marginTop: 12, fontSize: 15, color: TH.gold }}>
                {activeMember.total_ratings > 0
                  ? <>{'★'.repeat(Math.round(activeMember.avg_rating))}{'☆'.repeat(5 - Math.round(activeMember.avg_rating))} <span style={{ fontSize: 12, color: TH.t3 }}>{activeMember.avg_rating} ({activeMember.total_ratings} rating{activeMember.total_ratings !== 1 ? 's' : ''})</span></>
                  : <span style={{ fontSize: 12, color: TH.t3 }}>No ratings yet</span>}
              </div>

              {activeMember.bio && <p style={{ fontSize: 12, color: TH.t2, lineHeight: 1.6, marginTop: 12, textAlign: 'left', overflowWrap: 'anywhere' }}>{activeMember.bio}</p>}
            </div>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${TH.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: TH.t1, marginBottom: 8, textAlign: 'center' }}>Rate this team member</div>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 10 }}>
                {[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => { if (requireLogin('member')) setMemberRating(s) }} style={{ fontSize: 30, background: 'none', border: 'none', cursor: 'pointer', color: s <= memberRating ? TH.gold : TH.line, lineHeight: 1, padding: 0 }}>★</button>)}
              </div>
              <textarea value={memberComment} onChange={e => setMemberComment(e.target.value)} placeholder="Add a comment (optional)..." style={{ width: '100%', padding: '9px 12px', border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 12.5, minHeight: 50, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', background: TH.soft, color: TH.t1, marginBottom: 10 }} />
              <button onClick={submitMemberRating} disabled={!memberRating || submittingMemberRating} style={{ width: '100%', padding: 11, background: (!memberRating || submittingMemberRating) ? '#94a3b8' : TH.grad, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: (!memberRating || submittingMemberRating) ? 'not-allowed' : 'pointer' }}>
                {submittingMemberRating ? 'Submitting…' : customer ? 'Submit Rating' : '🔐 Sign in to Rate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* lightbox — Instagram post view */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} className="td-lightbox" style={{ maxWidth: 760, width: '100%', maxHeight: '90vh', background: TH.cardSolid, borderRadius: 16, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', position: 'relative' }}>
            <button onClick={() => setLightboxImg(null)} style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            <div className="td-lightbox-imgwrap" style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '90vh', overflow: 'hidden' }}>
              <img src={lightboxImg.image_url} alt="" style={{ width: '100%', height: 'auto', maxHeight: '90vh', objectFit: 'contain' }} />
            </div>
            <div className="td-lightbox-info" style={{ padding: 18, display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '90vh' }}>
              {lightboxImg.title && <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 800, color: TH.t1, marginBottom: 8, paddingRight: 34 }}>{lightboxImg.title}</div>}
              <p style={{ fontSize: 13, color: TH.t2, lineHeight: 1.6, flex: 1, margin: 0, overflowWrap: 'anywhere' }}>{lightboxImg.description || 'No description.'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${TH.line}` }}>
                <button onClick={() => likePortfolio(lightboxImg.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: likedSet.has(lightboxImg.id) ? TH.red + '22' : TH.soft, border: `1px solid ${TH.line}`, borderRadius: 20, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, color: TH.t1, fontSize: 13 }}>
                  <span style={{ fontSize: 15 }}>{likedSet.has(lightboxImg.id) ? '❤️' : '🤍'}</span> {portLikes[lightboxImg.id] || 0} Likes
                </button>
                <button onClick={() => setLightboxImg(null)} style={{ marginLeft: 'auto', padding: '8px 18px', background: TH.grad, color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GET A QUOTE modal — opens from the hero "Get a Quote" button */}
      {showQuote && leadForm && (
        <div onClick={() => setShowQuote(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 330, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: TH.cardSolid, border: `1px solid ${TH.line}`, borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 22, position: 'relative' }}>
            <button onClick={() => setShowQuote(false)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: TH.soft, border: `1px solid ${TH.line}`, color: TH.t2, cursor: 'pointer', fontSize: 15, zIndex: 2 }}>✕</button>
            {renderQuoteForm()}
          </div>
        </div>
      )}

      {/* login modal */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 340, padding: 16 }}>
          <div style={{ background: TH.cardSolid, border: `1px solid ${TH.line}`, borderRadius: 18, padding: 30, width: 360, maxWidth: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🔐</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, margin: '10px 0 6px', color: TH.t1 }}>{loginFor === 'review' ? 'Sign in to Review' : loginFor === 'member' ? 'Sign in to Rate' : 'Sign in to Submit'}</h3>
            <p style={{ fontSize: 13, color: TH.t2, marginBottom: 18 }}>Sign in with Google to continue.</p>
            <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, background: TH.cardSolid, border: `2px solid ${TH.line}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: TH.t1, marginBottom: 8 }}>
              <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button onClick={() => setShowLoginPrompt(false)} style={{ width: '100%', padding: 9, background: 'none', border: 'none', color: TH.t2, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <style>{`
        .td-root, .td-root *{ box-sizing: border-box; }
        .td-root img{ max-width: 100%; }
        @media (max-width: 1050px){
          .td-cols{ grid-template-columns: 1fr !important; }
          .td-hero{ flex-direction: column-reverse !important; align-items: stretch !important; }
          .td-hero-main{ width: 100%; }
          .td-quotebox{ max-width: 100% !important; }
        }
        @media (max-width: 768px){
          .td-container{ padding: 12px 10px 36px !important; }
          .td-navtabs{ display: none !important; }
          .td-card{ padding: 13px !important; }
          .td-bizname{ font-size: 23px !important; }
          .td-revgrid{ grid-template-columns: 1fr !important; }
          .td-mgal{ grid-template-columns: repeat(3,1fr) !important; }
          .td-t4{ grid-template-columns: repeat(2,1fr) !important; }
          .td-hero-rings{ width: 100%; justify-content: space-around !important; flex-wrap: wrap !important; gap: 12px !important; }
          .td-hero-rings .td-shieldring-svg{ width: 96px !important; height: 96px !important; }
          .td-lightbox{ grid-template-columns: 1fr !important; max-height: 92vh !important; }
          .td-lightbox-imgwrap{ max-height: 46vh !important; }
          .td-lightbox-imgwrap img{ max-height: 46vh !important; }
          .td-lightbox-info{ max-height: 46vh !important; }
        }
        @media (max-width: 480px){
          .td-mgal{ grid-template-columns: repeat(2,1fr) !important; }
          .td-hero-rings .td-shieldring-svg{ width: 90px !important; height: 90px !important; }
        }
      `}</style>
    </div>
  )
}
