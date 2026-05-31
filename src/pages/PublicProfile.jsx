import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'

/* ============================================================
   PLAN FEATURE MATRIX (Free 10% → Silver 25% → Gold 60% → Platinum 100%)
   Design is the SAME premium neon for every plan; only FEATURES gate.
   Edit here to re-balance unlocks.
   ============================================================ */
const FEATURES = {
  description:      { free: false, silver: true,  gold: true,  platinum: true  },
  socialLinks:      { free: false, silver: true,  gold: true,  platinum: true  },
  portfolio:        { free: false, silver: true,  gold: true,  platinum: true  },
  portfolioLimit:   { free: 0,     silver: 3,     gold: 999,   platinum: 999   },
  trustGauges:      { free: false, silver: false, gold: true,  platinum: true  },
  aiSummary:        { free: false, silver: false, gold: true,  platinum: true  },
  businessInsights: { free: false, silver: false, gold: true,  platinum: true  },
  relatedBusiness:  { free: true,  silver: true,  gold: true,  platinum: true  },
  teamSection:      { free: false, silver: true,  gold: true,  platinum: true  },
  achievements:     { free: false, silver: false, gold: true,  platinum: true  },
  faqSection:       { free: false, silver: false, gold: true,  platinum: true  },
  aiReviewAnalysis: { free: false, silver: false, gold: true,  platinum: true  },
}
const can = (f, plan) => !!(FEATURES[f] && FEATURES[f][plan])
const featureVal = (f, plan) => (FEATURES[f] ? (FEATURES[f][plan] ?? FEATURES[f].free) : 0)

/* Plan accent (neon glow color) */
const PLAN_ACCENT = {
  free:     { c: '#03C1F5', glow: 'rgba(3,193,245,0.45)',  label: null,           ribbon: null },
  silver:   { c: '#94a3b8', glow: 'rgba(148,163,184,0.40)', label: '🥈 Silver',   ribbon: 'SILVER VERIFIED' },
  gold:     { c: '#f0b429', glow: 'rgba(240,180,41,0.45)',  label: '🥇 Gold',     ribbon: '🏆 GOLD VERIFIED BUSINESS' },
  platinum: { c: '#a78bfa', glow: 'rgba(167,139,250,0.5)',  label: '💎 Platinum', ribbon: '✦ PLATINUM VERIFIED BUSINESS ✦' },
}

/* Dark + Light palettes — design same, just theme swap */
function makeTheme(dark, accentC, glow) {
  if (dark) return {
    dark: true, accent: accentC, glow,
    bg: '#070b16',
    bgGrad: `radial-gradient(1100px 560px at 8% -6%, ${glow}, transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(124,58,237,0.14), transparent 55%), #070b16`,
    panel: 'rgba(255,255,255,0.035)',
    panelSolid: '#0e1424',
    panel2: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.09)',
    borderGlow: `${accentC}55`,
    text: '#eaf1fb', text2: '#9fb1c9', text3: '#64758c',
    text3b: '#64758c',
    input: '#0c1322',
    chip: 'rgba(255,255,255,0.06)',
  }
  return {
    dark: false, accent: accentC, glow,
    bg: '#eef2f8',
    bgGrad: `radial-gradient(1000px 520px at 8% -6%, ${glow.replace(/0\.\d+/, '0.18')}, transparent 60%), radial-gradient(820px 560px at 100% 0%, rgba(124,58,237,0.08), transparent 55%), #eef2f8`,
    panel: '#ffffff',
    panelSolid: '#ffffff',
    panel2: '#f5f8fc',
    border: '#e3e9f2',
    borderGlow: `${accentC}66`,
    text: '#0d1726', text2: '#54657c', text3: '#8a9bb0',
    text3b: '#8a9bb0',
    input: '#f5f8fc',
    chip: '#f0f4fa',
  }
}

const SUPABASE_URL = 'https://ribdorraxxhfbfkjhpie.supabase.co'

function setSEO({ title, description, image, url }) {
  document.title = title
  const setMeta = (name, content, prop = false) => {
    const attr = prop ? 'property' : 'name'
    let el = document.querySelector('meta[' + attr + '="' + name + '"]')
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
    el.setAttribute('content', content)
  }
  setMeta('description', description)
  setMeta('og:title', title, true); setMeta('og:description', description, true)
  setMeta('og:url', url, true); setMeta('og:type', 'business.business', true)
  setMeta('og:image', image, true); setMeta('og:site_name', 'TrustDubai', true)
  setMeta('twitter:card', 'summary'); setMeta('twitter:title', title); setMeta('twitter:description', description)
  const old = document.getElementById('jsonld-business'); if (old) old.remove()
}

function setJsonLD(company, reviews) {
  const script = document.createElement('script')
  script.id = 'jsonld-business'; script.type = 'application/ld+json'
  script.text = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'LocalBusiness', 'name': company.name,
    'description': company.description || '', 'url': 'https://trustdubai.ae/' + company.slug,
    'telephone': company.phone || '',
    'address': { '@type': 'PostalAddress', 'addressLocality': company.location || 'Dubai', 'addressCountry': 'AE' },
    'aggregateRating': reviews.length > 0 ? { '@type': 'AggregateRating', 'ratingValue': (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1), 'reviewCount': reviews.length, 'bestRating': 5, 'worstRating': 1 } : undefined,
  })
  document.head.appendChild(script)
}

function analyzeReview(review) {
  const text = (review.review_text || '').toLowerCase()
  const rating = review.rating || 3
  const pos = ['excellent','great','amazing','good','best','perfect','wonderful','fantastic','outstanding','professional','recommended','happy','satisfied','love','awesome','superb','brilliant','helpful','fast','quality','clean','honest','reliable','trusted','efficient']
  const neg = ['bad','poor','terrible','worst','horrible','awful','disappointing','slow','expensive','rude','unprofessional','late','damage','broken','wrong','issue','problem','complaint','refund','waste','dirty','fake','fraud','cheat','scam']
  const posCount = pos.filter(w => text.includes(w)).length
  const negCount = neg.filter(w => text.includes(w)).length
  const lengthScore = Math.min(text.length / 200, 1) * 40
  const ratingScore = rating === 5 || rating === 1 ? 20 : rating === 4 || rating === 2 ? 35 : 45
  const wordScore = Math.min((posCount + negCount) * 5, 15)
  const authenticity = Math.round(lengthScore + ratingScore + wordScore)
  const bias = rating === 5 && negCount === 0 ? 'High' : rating === 1 && posCount === 0 ? 'High' : rating === 4 || rating === 2 ? 'Medium' : 'Low'
  const tone = posCount > negCount ? 'Positive' : negCount > posCount ? 'Negative' : rating >= 4 ? 'Positive' : rating <= 2 ? 'Negative' : 'Neutral'
  const trust = authenticity >= 70 ? 'High' : authenticity >= 45 ? 'Medium' : 'Low'
  return { authenticity, bias, tone, trust }
}

function calcCredibility(company, reviews) {
  let s = 0
  if (company.is_verified) s += 25
  if ((company.avg_rating || 0) >= 4) s += 20; else if ((company.avg_rating || 0) >= 3) s += 10
  if (reviews.length >= 10) s += 20; else if (reviews.length >= 5) s += 15; else if (reviews.length >= 1) s += 8
  if (company.logo_url) s += 10
  if (company.description) s += 10
  if (company.phone) s += 5
  if (company.instagram || company.facebook || company.linkedin) s += 10
  return Math.min(s, 100)
}

function calcSubScores(company, reviews) {
  const avg = parseFloat(company.avg_rating) || 0
  const satisfaction = avg > 0 ? Math.round((avg / 5) * 100) : 0
  const volFactor = Math.min(reviews.length / 20, 1)
  const serviceQuality = Math.round((avg / 5) * 80 + volFactor * 20)
  const verification = company.is_verified ? 100 : 30
  const community = Math.round((avg / 5) * 50 + (company.is_verified ? 30 : 0) + volFactor * 20)
  return { satisfaction, serviceQuality, verification, community }
}

function buildAISummary(reviews) {
  if (reviews.length === 0) return null
  const allText = reviews.map(r => (r.review_text || '').toLowerCase()).join(' ')
  const themes = [
    { words: ['quality','professional','excellent','great','best'], love: 'Quality of work & professionalism' },
    { words: ['fast','quick','on time','timely','prompt'],          love: 'Timely delivery & quick response' },
    { words: ['service','helpful','friendly','polite','support'],    love: 'Friendly & helpful service' },
    { words: ['price','value','affordable','reasonable','worth'],    love: 'Fair pricing & value for money' },
  ]
  const loves = themes.filter(t => t.words.some(w => allText.includes(w))).map(t => t.love)
  const concerns = []
  if (allText.match(/slow|late|delay|wait/)) concerns.push('Response time on busy days')
  if (allText.match(/expensive|costly|pricey/)) concerns.push('Pricing for some services')
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const trend = avg >= 4.5 ? 'Strong positive reputation' : avg >= 3.5 ? 'Steadily improving reputation' : 'Building reputation'
  return { loves: loves.length ? loves : ['Verified business on TrustDubai'], concerns: concerns.length ? concerns : ['No major concerns reported'], trend }
}

function buildSocialLinks(c) {
  const l = []
  if (c.instagram) l.push({ icon: '📸', label: 'Instagram', url: c.instagram.startsWith('http') ? c.instagram : 'https://instagram.com/' + c.instagram.replace('@', '') })
  if (c.facebook)  l.push({ icon: '👍', label: 'Facebook',  url: c.facebook.startsWith('http') ? c.facebook : 'https://facebook.com/' + c.facebook })
  if (c.linkedin)  l.push({ icon: '💼', label: 'LinkedIn',  url: c.linkedin.startsWith('http') ? c.linkedin : 'https://linkedin.com/company/' + c.linkedin })
  if (c.website)   l.push({ icon: '🌐', label: 'Website',   url: c.website.startsWith('http') ? c.website : 'https://' + c.website })
  return l
}

/* ---------- UI atoms ---------- */
function Panel({ TH, children, style, glowBorder }) {
  return (
    <div style={{
      background: TH.panel,
      border: `1px solid ${glowBorder ? TH.borderGlow : TH.border}`,
      borderRadius: 18, padding: 20, marginBottom: 18,
      backdropFilter: TH.dark ? 'blur(8px)' : 'none',
      boxShadow: TH.dark ? (glowBorder ? `0 0 26px ${TH.glow}, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.03)') : '0 2px 14px rgba(15,30,60,0.05)',
      ...style,
    }}>{children}</div>
  )
}

function SecTitle({ TH, icon, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: TH.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.01em', textTransform: 'uppercase' }}>
        {icon && <span style={{ filter: TH.dark ? `drop-shadow(0 0 6px ${TH.glow})` : 'none' }}>{icon}</span>}{children}
      </h2>
      {right}
    </div>
  )
}

function UpgradeLock({ TH, title, sub }) {
  return (
    <div style={{ background: TH.panel2, border: `1px dashed ${TH.border}`, borderRadius: 14, padding: '26px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>🔒</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: TH.accent, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: TH.text2, lineHeight: 1.5 }}>{sub}</div>
    </div>
  )
}

function RingGauge({ score, label, color, TH, big }) {
  const size = big ? 132 : 78
  const sw = big ? 9 : 6
  const r = (size - sw) / 2 - 1
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const cx = size / 2
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ filter: TH.dark ? `drop-shadow(0 0 8px ${color}88)` : 'none' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={TH.dark ? 'rgba(255,255,255,0.07)' : '#eef2f7'} strokeWidth={sw} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`} strokeDashoffset={c * 0.25} transform={`rotate(-90 ${cx} ${cx})`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: big ? 34 : 17, fontWeight: 800, color }}>{score}</span>
          {big && <span style={{ fontSize: 9, color: TH.text2, letterSpacing: '0.12em' }}>/ 100</span>}
        </div>
      </div>
      {label && <div style={{ fontSize: 10, color: TH.text2, marginTop: 4, fontWeight: 600 }}>{label}</div>}
    </div>
  )
}

export default function PublicProfile() {
  const { slug } = useParams()
  const [dark, setDark] = useState(true)  // default dark neon
  const [company, setCompany] = useState(null)
  const [reviews, setReviews] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [related, setRelated] = useState([])
  const [leadForm, setLeadForm] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [customer, setCustomer] = useState(undefined)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
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

  useEffect(() => {
    fetchCompany(); checkCustomer(); fetchAiSetting()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) { setCustomer(await upsertCustomer(session.user)); setShowLoginPrompt(false) }
      else if (event === 'SIGNED_OUT') setCustomer(null)
    })
    return () => subscription.unsubscribe()
  }, [slug])

  async function checkCustomer() { setCustomer((await getCustomer()) || null) }
  async function fetchAiSetting() {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'feature.ai_analysis').maybeSingle()
    setAiAnalysisOn(data?.value?.enabled === true)
  }
  async function trackProfileView(id) {
    try { await supabase.rpc('increment_profile_views', { p_company_id: id }); await supabase.from('profile_views_log').insert({ company_id: id, visited_at: new Date().toISOString(), user_agent: navigator.userAgent }) } catch (e) {}
  }

  async function fetchCompany() {
    setLoading(true)
    const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).eq('status', 'approved').single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCompany(data)
    const [reviewRes, formRes, portfolioRes] = await Promise.all([
      supabase.from('reviews').select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id').eq('company_id', data.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(20),
      supabase.from('lead_forms').select('*').eq('company_id', data.id).eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('portfolio_items').select('id, image_url, title, description, created_at').eq('company_id', data.id).order('created_at', { ascending: false }),
    ])
    const reviewData = reviewRes.data || []
    setReviews(reviewData); setPortfolio(portfolioRes.data || [])
    if (formRes.data) {
      setLeadForm(formRes.data)
      const { data: qData } = await supabase.from('lead_form_questions').select('*').eq('form_id', formRes.data.id).order('order_num')
      setQuestions(qData || [])
    }
    if (data.category) {
      const { data: rel } = await supabase.from('companies').select('id, name, category, avg_rating, plan, slug, logo_url, is_verified').eq('status', 'approved').eq('category', data.category).neq('id', data.id).order('avg_rating', { ascending: false }).limit(4)
      setRelated(rel || [])
    }
    const avgRating = reviewData.length > 0 ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1) : null
    const seoTitle = data.name + ' — ' + (data.category || 'Business') + ' Dubai | TrustDubai'
    const seoDesc = (data.description ? data.description.slice(0, 140) : data.name + ' is a verified ' + (data.category || 'business') + ' in Dubai.') + (avgRating ? ' Rated ' + avgRating + '/5.' : '') + ' Contact on TrustDubai.'
    setSEO({ title: seoTitle, description: seoDesc, image: 'https://trustdubai.ae/og-image.png', url: 'https://trustdubai.ae/' + slug })
    setJsonLD(data, reviewData); trackProfileView(data.id); setLoading(false)
  }

  async function refreshReviews() {
    const { data } = await supabase.from('reviews').select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id').eq('company_id', company.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(20)
    if (data) setReviews(data)
  }
  function requireLogin(forWhat) { if (customer === undefined) return false; if (customer !== null) return true; setLoginFor(forWhat); setShowLoginPrompt(true); return false }

  async function sendLeadEmail(name, phone, email) {
    try {
      const companyEmail = company.email || company.business_email || company.owner_email
      if (!companyEmail) return
      await fetch(`${SUPABASE_URL}/functions/v1/send-lead-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_name: company.name, company_email: companyEmail, company_whatsapp: company.whatsapp || '', lead_name: name, lead_phone: phone, lead_email: email, answers, slug }) })
    } catch (e) {}
  }
  async function submitLead(e) {
    e.preventDefault()
    if (!requireLogin('lead')) return
    setSubmitting(true)
    const name = customer?.full_name || answers['Your name'] || ''
    const phone = answers['Your phone number'] || answers['phone'] || ''
    const email = customer?.email || answers['Email'] || ''
    await supabase.from('lead_submissions').insert({ form_id: leadForm.id, company_id: company.id, customer_id: customer?.id || null, name, phone, email, answers, source_url: window.location.href })
    await supabase.rpc('increment_leads', { p_company_id: company.id })
    await sendLeadEmail(name, phone, email)
    if (company.whatsapp) {
      const msg = ['🏢 *New Lead from TrustDubai*', '', '👤 Name: ' + (name || 'Not provided'), '📞 Phone: ' + (phone || 'Not provided'), '✉️ Email: ' + (email || 'Not provided'), '', '📋 *Answers:*', ...Object.entries(answers).map(([q, a]) => '• ' + q + ': ' + a), '', '🔗 Via: trustdubai.ae/' + slug, '⏰ ' + new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' }) + ' Dubai'].join('\n')
      window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank')
    }
    setSubmitting(false); setSubmitted(true)
  }
  async function submitReview(e) {
    e.preventDefault()
    if (!requireLogin('review')) return
    if (!reviewText.trim()) return
    setSubmittingReview(true)
    await supabase.from('reviews').insert({ company_id: company.id, reviewer_name: customer.full_name || customer.email, reviewer_email: customer.email, customer_id: customer.id, rating: reviewRating, review_text: reviewText, is_approved: true })
    setSubmittingReview(false); setReviewSubmitted(true); setShowReviewForm(false); await refreshReviews()
  }
  async function deleteReview(id) { if (!confirm('Delete your review?')) return; await supabase.from('reviews').delete().eq('id', id); await refreshReviews() }
  async function saveEditReview(id) { if (!editingText.trim()) return; await supabase.from('reviews').update({ rating: editingRating, review_text: editingText }).eq('id', id); setEditingReviewId(null); await refreshReviews() }

  /* fonts + keyframes (global) */
  const GlobalStyle = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
      @keyframes tdspin { to { transform: rotate(360deg) } }
      @keyframes tdfade { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform:none } }
      .td-anim { animation: tdfade .5s ease both }
      .td-root *::-webkit-scrollbar { height:6px; width:6px }
      .td-root *::-webkit-scrollbar-thumb { background: rgba(120,140,170,0.4); border-radius:9px }
    `}</style>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070b16' }}>
      <GlobalStyle />
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 38, height: 38, border: '3px solid #03C1F5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'tdspin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14, color: '#9fb1c9', fontFamily: "'Manrope',sans-serif" }}>Loading...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#070b16' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#eaf1fb', fontFamily: "'Sora',sans-serif" }}>Company not found</h2>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: '#03C1F5', color: '#031018', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Go to TrustDubai</button>
      </div>
    </div>
  )

  const plan = company.plan || 'free'
  const PA = PLAN_ACCENT[plan] || PLAN_ACCENT.free
  const TH = makeTheme(dark, PA.c, PA.glow)
  const initials = company.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const companyCategories = Array.isArray(company.categories) && company.categories.length > 0 ? company.categories : company.category ? [company.category] : []
  const credScore = calcCredibility(company, reviews)
  const credColor = credScore >= 75 ? '#22c55e' : credScore >= 50 ? '#f0b429' : PA.c
  const credLabel = credScore >= 75 ? 'High Trust' : credScore >= 50 ? 'Medium Trust' : 'Building Trust'
  const socialLinks = buildSocialLinks(company)
  const sub = calcSubScores(company, reviews)
  const aiSummary = buildAISummary(reviews)
  const portLimit = featureVal('portfolioLimit', plan)
  const shownPortfolio = portfolio.slice(0, portLimit)
  const F = "'Manrope',sans-serif"

  const chip = (txt, key) => (
    <span key={key} style={{ background: TH.chip, color: TH.text2, fontSize: 12, padding: '3px 11px', borderRadius: 99, border: `1px solid ${TH.border}` }}>{txt}</span>
  )

  return (
    <div className="td-root" style={{ background: TH.bgGrad, minHeight: '100vh', fontFamily: F, color: TH.text }}>
      <GlobalStyle />

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: `1px solid ${TH.border}`, position: 'sticky', top: 0, zIndex: 100, background: TH.dark ? 'rgba(7,11,22,0.82)' : 'rgba(238,242,248,0.9)', backdropFilter: 'blur(10px)' }}>
        <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill={PA.c} opacity="0.18" />
            <path d="M16 4L26 8L26 17C26 22.5 21.5 27 16 28C10.5 27 6 22.5 6 17L6 8Z" fill={PA.c} opacity="0.4" />
            <polyline points="11.5,16 14.5,19.5 20.5,13" fill="none" stroke={PA.c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, color: TH.text }}>Trust<span style={{ color: PA.c }}>Dubai</span></span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* light/dark toggle */}
          <button onClick={() => setDark(d => !d)} title="Toggle theme"
            style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${TH.border}`, background: TH.panel2, color: TH.text2, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dark ? '☀️' : '🌙'}
          </button>
          {customer === undefined ? (
            <div style={{ width: 60, height: 30, background: TH.panel2, borderRadius: 20 }} />
          ) : customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: PA.c + '33', color: PA.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{(customer.full_name || customer.email)[0].toUpperCase()}</div>
              <span style={{ fontSize: 12, color: TH.text2 }}>{customer.full_name || customer.email.split('@')[0]}</span>
              <button onClick={() => { signOut(); setCustomer(null) }} style={{ fontSize: 11, color: TH.text3, background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => signInWithGoogle()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: TH.dark ? TH.panel2 : '#fff', color: TH.dark ? TH.text : '#374151', border: `1px solid ${TH.border}`, borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Plan ribbon */}
      {PA.ribbon && (
        <div style={{ textAlign: 'center', padding: '9px 24px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', color: PA.c, background: TH.dark ? `linear-gradient(90deg, transparent, ${PA.c}22, transparent)` : `${PA.c}14`, borderBottom: `1px solid ${TH.border}`, textShadow: TH.dark ? `0 0 14px ${PA.glow}` : 'none' }}>
          {PA.ribbon}
        </div>
      )}

      {/* HERO */}
      <div className="td-anim" style={{ maxWidth: 980, margin: '0 auto', padding: '28px 22px 0' }}>
        <Panel TH={TH} glowBorder style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
          {TH.dark && <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, background: `radial-gradient(circle, ${PA.glow}, transparent 70%)`, pointerEvents: 'none' }} />}
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
            {/* logo */}
            <div style={{ width: 88, height: 88, borderRadius: 20, flexShrink: 0, background: PA.c + '1f', color: PA.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, border: `2px solid ${PA.c}66`, boxShadow: TH.dark ? `0 0 24px ${PA.glow}` : 'none', overflow: 'hidden' }}>
              {company.logo_url ? <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            {/* name + cats */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: TH.text, margin: 0, letterSpacing: '-0.02em' }}>{company.name}</h1>
                {company.is_verified && <span style={{ background: 'rgba(34,197,94,0.16)', color: '#22c55e', fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 99, border: '1px solid rgba(34,197,94,0.35)' }}>✓ Verified</span>}
                {PA.label && <span style={{ background: PA.c + '22', color: PA.c, fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 99, border: `1px solid ${PA.c}55` }}>{PA.label}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {companyCategories.map(c => chip(c, c))}
                {company.location && chip('📍 ' + company.location, 'loc')}
              </div>
              {company.description && can('description', plan) && <p style={{ fontSize: 13.5, color: TH.text2, lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>{company.description}</p>}
            </div>
            {/* big trust ring */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <RingGauge score={credScore} label={null} color={credColor} TH={TH} big />
              <div style={{ fontSize: 11, fontWeight: 700, color: credColor, marginTop: 2 }}>{credLabel}</div>
            </div>
          </div>

          {/* stat strip */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            {[
              { v: company.avg_rating || '0.0', l: 'Avg Rating', s: '★' },
              { v: company.total_reviews || reviews.length, l: 'Reviews' },
              { v: company.is_verified ? 'Yes' : 'No', l: 'Verified' },
              { v: company.profile_views || 0, l: 'Profile Views' },
            ].map(s => (
              <div key={s.l} style={{ flex: '1 1 100px', background: TH.panel2, border: `1px solid ${TH.border}`, borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: PA.c }}>{s.v}{s.s || ''}</div>
                <div style={{ fontSize: 10, color: TH.text2, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {company.whatsapp && (
              <button onClick={() => window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, ''), '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#25D366', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>💬 WhatsApp</button>
            )}
            {can('socialLinks', plan) && socialLinks.map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: TH.panel2, color: TH.text, borderRadius: 12, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: `1px solid ${TH.border}` }}>{s.icon} {s.label}</a>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '4px 22px 0' }}>

        {/* TRUST OVERVIEW (Gold+) */}
        {can('trustGauges', plan) && (
          <Panel TH={TH} className="td-anim">
            <SecTitle TH={TH} icon="🛡️">Trust Overview</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))', gap: 14, justifyItems: 'center' }}>
              <RingGauge score={credScore} label="Trust Score" color={credColor} TH={TH} />
              <RingGauge score={sub.satisfaction} label="Satisfaction" color="#22c55e" TH={TH} />
              <RingGauge score={sub.serviceQuality} label="Service" color="#3b82f6" TH={TH} />
              <RingGauge score={sub.verification} label="Verification" color={company.is_verified ? '#22c55e' : '#f0b429'} TH={TH} />
              <RingGauge score={sub.community} label="Community" color="#a78bfa" TH={TH} />
            </div>
          </Panel>
        )}

        {/* AI BUSINESS SUMMARY (Gold+) */}
        {can('aiSummary', plan) && aiSummary && (
          <Panel TH={TH}>
            <SecTitle TH={TH} icon="🤖">AI Business Summary</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>What Customers Love</div>
                {aiSummary.loves.map((l, i) => <div key={i} style={{ fontSize: 12.5, color: TH.text2, marginBottom: 5, lineHeight: 1.5 }}>✓ {l}</div>)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f0b429', marginBottom: 8 }}>Areas to Watch</div>
                {aiSummary.concerns.map((c, i) => <div key={i} style={{ fontSize: 12.5, color: TH.text2, marginBottom: 5, lineHeight: 1.5 }}>• {c}</div>)}
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: TH.panel2, borderRadius: 10, fontSize: 12.5, color: TH.text2 }}>
              <span style={{ fontWeight: 700, color: TH.text }}>Reputation:</span> {aiSummary.trend}
            </div>
          </Panel>
        )}

        {/* BUSINESS INSIGHTS (Gold+) */}
        {can('businessInsights', plan) && (
          <Panel TH={TH}>
            <SecTitle TH={TH} icon="📊">Business Insights</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { l: 'Profile Views', v: company.profile_views || 0, i: '👁️' },
                { l: 'Total Reviews', v: company.total_reviews || reviews.length, i: '⭐' },
                { l: 'Avg Rating', v: (company.avg_rating || '0.0') + '★', i: '📈' },
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center', padding: '16px 8px', background: TH.panel2, borderRadius: 12, border: `1px solid ${TH.border}` }}>
                  <div style={{ fontSize: 18, marginBottom: 5 }}>{m.i}</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: TH.text }}>{m.v}</div>
                  <div style={{ fontSize: 10, color: TH.text2, marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* LEAD FORM */}
        {leadForm && (
          <Panel TH={TH} glowBorder>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: TH.text }}>Request Submitted!</h3>
                <p style={{ fontSize: 14, color: TH.text2 }}>{company.name} will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={submitLead}>
                <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 4, color: TH.text }}>{leadForm.title}</h3>
                <p style={{ fontSize: 13, color: TH.text2, marginBottom: 18 }}>Fill this form — {company.name} will respond shortly</p>
                {customer && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#22c55e' }}>✓ Logged in as <strong>{customer.full_name || customer.email}</strong></div>}
                {questions.map(q => {
                  const inputStyle = { width: '100%', padding: '11px 13px', border: `1px solid ${TH.border}`, borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.input, color: TH.text, outline: 'none' }
                  return (
                    <div key={q.id} style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: TH.text, display: 'block', marginBottom: 6 }}>{q.question}{q.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</label>
                      {q.type === 'text' && <input required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question]: e.target.value }))} placeholder="Your answer..." style={inputStyle} />}
                      {q.type === 'select' && <select required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question]: e.target.value }))} style={inputStyle}><option value="">Select an option</option>{(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}</select>}
                      {q.type === 'radio' && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{(q.options || []).map((o, i) => <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: TH.text2, cursor: 'pointer' }}><input type="radio" name={q.id} value={o} required={q.required} onChange={() => setAnswers(p => ({ ...p, [q.question]: o }))} />{o}</label>)}</div>}
                    </div>
                  )
                })}
                <button type="submit" disabled={submitting} style={{ width: '100%', padding: '13px', background: submitting ? '#64758c' : PA.c, color: TH.dark ? '#04121c' : '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: TH.dark ? `0 0 20px ${PA.glow}` : 'none' }}>{submitting ? 'Submitting...' : customer ? 'Submit — Get Quote' : 'Sign in to Submit'}</button>
              </form>
            )}
          </Panel>
        )}

        {/* PORTFOLIO */}
        {!can('portfolio', plan) ? (
          <Panel TH={TH}><SecTitle TH={TH} icon="🖼️">Portfolio</SecTitle><UpgradeLock TH={TH} title="Portfolio is a premium feature" sub="This business is on the Free plan. Upgrade to Silver or higher to showcase project photos." /></Panel>
        ) : portfolio.length > 0 ? (
          <Panel TH={TH}>
            <SecTitle TH={TH} icon="🖼️" right={portfolio.length > portLimit ? <span style={{ fontSize: 11, color: TH.text2 }}>Showing {portLimit} of {portfolio.length}</span> : null}>Portfolio</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {shownPortfolio.map(item => (
                <div key={item.id} onClick={() => setLightboxImg(item)} style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: `1px solid ${TH.border}`, aspectRatio: '1', background: TH.panel2, position: 'relative', transition: 'transform .2s, box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = TH.dark ? `0 8px 24px ${PA.glow}` : '0 8px 20px rgba(0,0,0,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <img src={item.image_url} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
                  {item.title && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '18px 8px 7px', color: '#fff', fontSize: 11, fontWeight: 600 }}>{item.title}</div>}
                </div>
              ))}
            </div>
            {portfolio.length > portLimit && plan === 'silver' && <div style={{ marginTop: 10, fontSize: 11, color: TH.text2, textAlign: 'center' }}>Upgrade to Gold to showcase all {portfolio.length} projects</div>}
          </Panel>
        ) : null}

        {/* VERIFIED TEAM placeholder (Silver+) */}
        {can('teamSection', plan) && (
          <Panel TH={TH}><SecTitle TH={TH} icon="👷">Verified Team</SecTitle>
            <div style={{ textAlign: 'center', padding: '20px 0', color: TH.text2, fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>Team verification coming soon — ID-verified professionals will appear here.</div>
          </Panel>
        )}

        {/* ACHIEVEMENTS placeholder (Gold+) */}
        {can('achievements', plan) && (
          <Panel TH={TH}><SecTitle TH={TH} icon="🏅">Achievements &amp; Badges</SecTitle>
            <div style={{ textAlign: 'center', padding: '20px 0', color: TH.text2, fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>Awards &amp; certifications will appear here soon.</div>
          </Panel>
        )}

        {/* REVIEWS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 4 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: TH.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.01em' }}>⭐ Customer Reviews</h2>
          {!reviewSubmitted && (
            <button onClick={() => { if (requireLogin('review')) setShowReviewForm(true) }} style={{ padding: '8px 16px', background: customer ? PA.c : TH.panel2, color: customer ? (TH.dark ? '#04121c' : '#fff') : TH.text2, border: customer ? 'none' : `1px solid ${TH.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{customer ? '+ Write a Review' : '🔐 Sign in to Review'}</button>
          )}
        </div>

        {showReviewForm && customer && (
          <Panel TH={TH}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 14, color: TH.text }}>Write a Review</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TH.text, marginBottom: 8 }}>Your Rating</div>
              <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setReviewRating(s)} type="button" style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', color: s <= reviewRating ? '#f0b429' : (TH.dark ? '#33415a' : '#d1d5db') }}>★</button>)}</div>
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." style={{ width: '100%', padding: '11px 13px', border: `1px solid ${TH.border}`, borderRadius: 10, fontSize: 14, minHeight: 100, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', resize: 'vertical', background: TH.input, color: TH.text, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitReview} disabled={submittingReview || !reviewText.trim()} style={{ flex: 1, padding: '11px', background: (submittingReview || !reviewText.trim()) ? '#64758c' : PA.c, color: TH.dark ? '#04121c' : '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
              <button onClick={() => setShowReviewForm(false)} style={{ flex: 1, padding: '11px', background: TH.panel2, color: TH.text2, border: `1px solid ${TH.border}`, borderRadius: 12, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </Panel>
        )}

        {reviewSubmitted && (
          <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>Review submitted successfully!</div>
          </div>
        )}

        {reviews.length === 0 ? (
          <Panel TH={TH} style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <p style={{ fontSize: 14, color: TH.text2 }}>No reviews yet. Be the first to review!</p>
          </Panel>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {reviews.map(r => {
              const a = analyzeReview(r)
              const mine = customer && r.customer_id === customer.id
              const editing = editingReviewId === r.id
              return (
                <Panel TH={TH} key={r.id} glowBorder={mine} style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: mine ? PA.c + '33' : TH.panel2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: mine ? PA.c : TH.text2 }}>{(r.reviewer_name || 'A')[0].toUpperCase()}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: TH.text }}>{r.reviewer_name || 'Anonymous'}</div>
                          {mine && <span style={{ fontSize: 10, background: PA.c + '22', color: PA.c, padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>Your Review</span>}
                        </div>
                        <div style={{ fontSize: 11, color: TH.text2 }}>{new Date(r.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric', day: 'numeric' })}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#f0b429', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      {mine && !editing && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setEditingReviewId(r.id); setEditingText(r.review_text); setEditingRating(r.rating) }} style={{ padding: '3px 10px', background: 'transparent', border: `1px solid ${TH.border}`, borderRadius: 6, fontSize: 11, color: TH.text2, cursor: 'pointer' }}>✏️ Edit</button>
                          <button onClick={() => deleteReview(r.id)} style={{ padding: '3px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 6, fontSize: 11, color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editing ? (
                    <div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditingRating(s)} type="button" style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: s <= editingRating ? '#f0b429' : (TH.dark ? '#33415a' : '#d1d5db') }}>★</button>)}</div>
                      <textarea value={editingText} onChange={e => setEditingText(e.target.value)} style={{ width: '100%', padding: '11px 13px', border: `1px solid ${TH.border}`, borderRadius: 10, fontSize: 14, minHeight: 80, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box', resize: 'vertical', background: TH.input, color: TH.text }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEditReview(r.id)} style={{ flex: 1, padding: '9px', background: PA.c, color: TH.dark ? '#04121c' : '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Changes</button>
                        <button onClick={() => setEditingReviewId(null)} style={{ flex: 1, padding: '9px', background: TH.panel2, color: TH.text2, border: `1px solid ${TH.border}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {r.review_text && <p style={{ fontSize: 14, color: TH.text2, lineHeight: 1.6, margin: '0 0 10px 0' }}>{r.review_text}</p>}
                      {aiAnalysisOn && can('aiReviewAnalysis', plan) && r.review_text && r.review_text.length > 5 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 10px', background: TH.panel2, borderRadius: 8, border: `1px solid ${TH.border}`, marginBottom: r.owner_reply ? 10 : 0 }}>
                          <div style={{ fontSize: 10, color: TH.text2, width: '100%', marginBottom: 3, fontWeight: 700, letterSpacing: '0.06em' }}>🤖 AI ANALYSIS</div>
                          {[
                            { label: 'Authenticity', value: a.authenticity + '%', color: a.authenticity >= 70 ? '#22c55e' : a.authenticity >= 45 ? '#f0b429' : '#ef4444' },
                            { label: 'Bias', value: a.bias, color: a.bias === 'Low' ? '#22c55e' : a.bias === 'Medium' ? '#f0b429' : '#ef4444' },
                            { label: 'Tone', value: a.tone, color: a.tone === 'Positive' ? '#22c55e' : a.tone === 'Negative' ? '#ef4444' : TH.text2 },
                            { label: 'Trust', value: a.trust, color: a.trust === 'High' ? '#22c55e' : a.trust === 'Medium' ? '#f0b429' : '#ef4444' },
                          ].map(it => (
                            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: TH.panel, padding: '3px 8px', borderRadius: 99, border: `1px solid ${TH.border}` }}>
                              <span style={{ fontSize: 10, color: TH.text2 }}>{it.label}:</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: it.color }}>{it.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.owner_reply && (
                        <div style={{ background: PA.c + '14', border: `1px solid ${PA.c}44`, borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: PA.c, marginBottom: 6 }}>💬 Owner Reply{(r.owner_reply_at || r.replied_at) && <span style={{ fontWeight: 400, color: TH.text2 }}> · {new Date(r.owner_reply_at || r.replied_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}</div>
                          <p style={{ fontSize: 13, color: TH.text2, margin: 0, lineHeight: 1.6 }}>{r.owner_reply}</p>
                        </div>
                      )}
                    </>
                  )}
                </Panel>
              )
            })}
          </div>
        )}

        {/* FAQ placeholder (Gold+) */}
        {can('faqSection', plan) && (
          <Panel TH={TH}><SecTitle TH={TH} icon="❓">Frequently Asked Questions</SecTitle>
            <div style={{ textAlign: 'center', padding: '20px 0', color: TH.text2, fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>FAQs will appear here soon — business can add them from the portal.</div>
          </Panel>
        )}

        {/* RELATED BUSINESSES */}
        {can('relatedBusiness', plan) && related.length > 0 && (
          <Panel TH={TH}>
            <SecTitle TH={TH} icon="🔗">Related Businesses</SecTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {related.map(rc => {
                const ri = rc.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                return (
                  <div key={rc.id} onClick={() => { if (rc.slug) window.location.href = '/' + rc.slug }} style={{ cursor: 'pointer', background: TH.panel2, border: `1px solid ${TH.border}`, borderRadius: 12, padding: 12, transition: 'border-color .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = PA.c }} onMouseLeave={e => { e.currentTarget.style.borderColor = TH.border }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: PA.c + '22', color: PA.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>{rc.logo_url ? <img src={rc.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ri}</div>
                      <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: TH.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.name}</div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f0b429' }}>{rc.avg_rating || '—'}★</span>
                      {rc.is_verified && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>✓ Verified</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
            <img src={lightboxImg.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain' }} />
            {lightboxImg.title && <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 14, fontFamily: "'Sora',sans-serif" }}>{lightboxImg.title}</div>}
            {lightboxImg.description && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>{lightboxImg.description}</div>}
            <button onClick={() => setLightboxImg(null)} style={{ marginTop: 16, padding: '8px 24px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
          </div>
        </div>
      )}

      {/* Login modal */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: TH.panelSolid, border: `1px solid ${TH.border}`, borderRadius: 20, padding: 32, width: 380, maxWidth: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: TH.text }}>{loginFor === 'review' ? 'Sign in to Write a Review' : 'Sign in to Submit Inquiry'}</h3>
            <p style={{ fontSize: 14, color: TH.text2, marginBottom: 24, lineHeight: 1.6 }}>{loginFor === 'review' ? 'Sign in with Google to leave a genuine review.' : 'Sign in to submit your inquiry.'}</p>
            <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', background: TH.dark ? TH.panel2 : '#fff', border: `2px solid ${TH.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, color: TH.text }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button onClick={() => setShowLoginPrompt(false)} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: TH.text2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '32px 24px', color: TH.text2, fontSize: 12 }}>
        <button onClick={() => window.location.href = '/'} style={{ color: PA.c, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>TrustDubai</button>
        {' — Building trust in Dubai\'s business community'}
      </div>
    </div>
  )
}
