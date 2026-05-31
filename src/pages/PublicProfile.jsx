import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'

/* ============================================================
   PLAN FEATURE MATRIX  (Free 10% → Silver 25% → Gold 60% → Platinum 100%)
   true = unlocked for that plan. Edit here to re-balance unlocks.
   ============================================================ */
const PLAN_RANK = { free: 0, silver: 1, gold: 2, platinum: 3 }

const FEATURES = {
  description:      { free: false, silver: true,  gold: true,  platinum: true  },
  socialLinks:      { free: false, silver: true,  gold: true,  platinum: true  },
  portfolio:        { free: false, silver: true,  gold: true,  platinum: true  }, // free => upgrade prompt
  portfolioLimit:   { free: 0,     silver: 3,     gold: 999,   platinum: 999   },
  portfolioVideo:   { free: false, silver: false, gold: false, platinum: true  },
  trustGauges:      { free: false, silver: false, gold: true,  platinum: true  },
  aiSummary:        { free: false, silver: false, gold: true,  platinum: true  },
  businessInsights: { free: false, silver: false, gold: true,  platinum: true  },
  relatedBusiness:  { free: true,  silver: true,  gold: true,  platinum: true  },
  teamSection:      { free: false, silver: true,  gold: true,  platinum: true  },
  achievements:     { free: false, silver: false, gold: true,  platinum: true  },
  faqSection:       { free: false, silver: false, gold: true,  platinum: true  },
  aiReviewAnalysis: { free: false, silver: false, gold: true,  platinum: true  }, // also gated by global toggle
}

function can(feature, plan) {
  const f = FEATURES[feature]
  if (!f) return false
  return !!f[plan]
}
function featureVal(feature, plan) {
  const f = FEATURES[feature]
  if (!f) return 0
  return f[plan] ?? f.free
}

const PLAN_THEMES = {
  free: {
    bg: '#f9fafb', headerBg: '#03C1F5', cardBg: '#fff', border: '#e5e7eb',
    accent: '#03C1F5', text: '#111827', textSub: '#6b7280', badge: null, heroBg: '#fff',
    sectionTitle: '#111827', upgradeBg: '#f0faff', upgradeBorder: '#b3d9f0', upgradeText: '#0077aa',
  },
  silver: {
    bg: '#f1f5f9', headerBg: '#1e293b', cardBg: '#fff', border: '#cbd5e1',
    accent: '#64748b', text: '#0f172a', textSub: '#475569',
    badge: { bg: '#f1f5f9', color: '#64748b', label: '🥈 Silver' }, heroBg: '#fff',
    sectionTitle: '#0f172a', upgradeBg: '#f8fafc', upgradeBorder: '#cbd5e1', upgradeText: '#475569',
  },
  gold: {
    bg: '#fffbf0', headerBg: '#92400e', cardBg: '#fff', border: '#fcd34d',
    accent: '#d97706', text: '#111827', textSub: '#78350f',
    badge: { bg: '#fffbf0', color: '#d97706', label: '🥇 Gold' }, heroBg: '#fffdf7',
    sectionTitle: '#111827', upgradeBg: '#fffbf0', upgradeBorder: '#fcd34d', upgradeText: '#92400e',
  },
  platinum: {
    bg: '#0a0a14', headerBg: '#0f0f1a', cardBg: '#15152a', border: '#2d2d4e',
    accent: '#8b5cf6', text: '#f1f5f9', textSub: '#a0aec0',
    badge: { bg: '#1a1a2e', color: '#a78bfa', label: '💎 Platinum' }, heroBg: '#12122244',
    sectionTitle: '#f1f5f9', upgradeBg: 'rgba(139,92,246,0.1)', upgradeBorder: 'rgba(139,92,246,0.3)', upgradeText: '#a78bfa',
  },
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
  setMeta('og:title', title, true)
  setMeta('og:description', description, true)
  setMeta('og:url', url, true)
  setMeta('og:type', 'business.business', true)
  setMeta('og:image', image, true)
  setMeta('og:site_name', 'TrustDubai', true)
  setMeta('twitter:card', 'summary')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)
  const old = document.getElementById('jsonld-business')
  if (old) old.remove()
}

function setJsonLD(company, reviews) {
  const script = document.createElement('script')
  script.id = 'jsonld-business'
  script.type = 'application/ld+json'
  script.text = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': company.name,
    'description': company.description || '',
    'url': 'https://trustdubai.ae/' + company.slug,
    'telephone': company.phone || '',
    'address': { '@type': 'PostalAddress', 'addressLocality': company.location || 'Dubai', 'addressCountry': 'AE' },
    'aggregateRating': reviews.length > 0 ? {
      '@type': 'AggregateRating',
      'ratingValue': (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
      'reviewCount': reviews.length, 'bestRating': 5, 'worstRating': 1
    } : undefined,
  })
  document.head.appendChild(script)
}

function analyzeReview(review) {
  const text = (review.review_text || '').toLowerCase()
  const rating = review.rating || 3
  const positiveWords = ['excellent', 'great', 'amazing', 'good', 'best', 'perfect', 'wonderful', 'fantastic', 'outstanding', 'professional', 'recommended', 'happy', 'satisfied', 'love', 'awesome', 'superb', 'brilliant', 'helpful', 'fast', 'quality', 'clean', 'honest', 'reliable', 'trusted', 'efficient']
  const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'horrible', 'awful', 'disappointing', 'slow', 'expensive', 'rude', 'unprofessional', 'late', 'damage', 'broken', 'wrong', 'issue', 'problem', 'complaint', 'refund', 'waste', 'dirty', 'fake', 'fraud', 'cheat', 'scam']
  const posCount = positiveWords.filter(w => text.includes(w)).length
  const negCount = negativeWords.filter(w => text.includes(w)).length
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
  let score = 0
  if (company.is_verified)                                        score += 25
  if ((company.avg_rating || 0) >= 4)                            score += 20
  else if ((company.avg_rating || 0) >= 3)                       score += 10
  if (reviews.length >= 10)                                      score += 20
  else if (reviews.length >= 5)                                  score += 15
  else if (reviews.length >= 1)                                  score += 8
  if (company.logo_url)                                          score += 10
  if (company.description)                                       score += 10
  if (company.phone)                                             score += 5
  if (company.instagram || company.facebook || company.linkedin) score += 10
  return Math.min(score, 100)
}

/* derived sub-scores for gauges (real data) */
function calcSubScores(company, reviews) {
  const avg = parseFloat(company.avg_rating) || 0
  const satisfaction = avg > 0 ? Math.round((avg / 5) * 100) : 0
  // service quality proxy: blend of rating + review volume
  const volFactor = Math.min(reviews.length / 20, 1)
  const serviceQuality = Math.round((avg / 5) * 80 + volFactor * 20)
  // verification level
  const verification = company.is_verified ? 100 : 30
  // community confidence: rating + verified + reviews
  const community = Math.round((avg / 5) * 50 + (company.is_verified ? 30 : 0) + volFactor * 20)
  return { satisfaction, serviceQuality, verification, community }
}

/* AI Business Summary from real reviews */
function buildAISummary(reviews) {
  if (reviews.length === 0) return null
  const allText = reviews.map(r => (r.review_text || '').toLowerCase()).join(' ')
  const themes = [
    { key: 'quality',         words: ['quality', 'professional', 'excellent', 'great work', 'best'],       love: 'Quality of work & professionalism' },
    { key: 'timeliness',      words: ['fast', 'quick', 'on time', 'timely', 'prompt'],                     love: 'Timely delivery & quick response' },
    { key: 'service',         words: ['service', 'helpful', 'friendly', 'polite', 'support'],               love: 'Friendly & helpful service' },
    { key: 'value',           words: ['price', 'value', 'affordable', 'reasonable', 'worth'],               love: 'Fair pricing & value for money' },
  ]
  const loves = themes.filter(t => t.words.some(w => allText.includes(w))).map(t => t.love)
  const concerns = []
  if (allText.match(/slow|late|delay|wait/)) concerns.push('Response time on busy days')
  if (allText.match(/expensive|costly|pricey/)) concerns.push('Pricing for some services')
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const recentTrend = avg >= 4.5 ? 'Strong positive reputation' : avg >= 3.5 ? 'Steadily improving reputation' : 'Building reputation'
  return {
    loves: loves.length ? loves : ['Verified business on TrustDubai'],
    concerns: concerns.length ? concerns : ['No major concerns reported'],
    trend: recentTrend,
  }
}

function buildSocialLinks(company) {
  const links = []
  if (company.instagram) links.push({ icon: '📸', label: 'Instagram', url: company.instagram.startsWith('http') ? company.instagram : 'https://instagram.com/' + company.instagram.replace('@', '') })
  if (company.facebook) links.push({ icon: '👍', label: 'Facebook', url: company.facebook.startsWith('http') ? company.facebook : 'https://facebook.com/' + company.facebook })
  if (company.linkedin) links.push({ icon: '💼', label: 'LinkedIn', url: company.linkedin.startsWith('http') ? company.linkedin : 'https://linkedin.com/company/' + company.linkedin })
  if (company.website) links.push({ icon: '🌐', label: 'Website', url: company.website.startsWith('http') ? company.website : 'https://' + company.website })
  return links
}

/* ---------- small UI helpers ---------- */
function SectionTitle({ T, icon, children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px 0' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: T.sectionTitle, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span>{icon}</span>}{children}
      </h2>
      {right}
    </div>
  )
}

function UpgradeLock({ T, title, sub }) {
  return (
    <div style={{ background: T.upgradeBg, border: '1px dashed ' + T.upgradeBorder, borderRadius: 14, padding: '24px 20px', textAlign: 'center', marginBottom: 24 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.upgradeText, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{sub}</div>
    </div>
  )
}

function Gauge({ score, label, color, isDark }) {
  const r = 30, c = 2 * Math.PI * r
  const filled = (score / 100) * c
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="74" height="74" viewBox="0 0 74 74">
        <circle cx="37" cy="37" r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : '#eef2f7'} strokeWidth="6" />
        <circle cx="37" cy="37" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`} strokeDashoffset={c * 0.25} transform="rotate(-90 37 37)" />
        <text x="37" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div style={{ fontSize: 10, color: isDark ? '#a0aec0' : '#64748b', marginTop: 2, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

export default function PublicProfile() {
  const { slug } = useParams()
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
    fetchCompany()
    checkCustomer()
    fetchAiSetting()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const cust = await upsertCustomer(session.user)
        setCustomer(cust)
        setShowLoginPrompt(false)
      } else if (event === 'SIGNED_OUT') {
        setCustomer(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [slug])

  async function checkCustomer() {
    const cust = await getCustomer()
    setCustomer(cust || null)
  }

  async function fetchAiSetting() {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'feature.ai_analysis').maybeSingle()
    setAiAnalysisOn(data?.value?.enabled === true)
  }

  async function trackProfileView(companyId) {
    try {
      await supabase.rpc('increment_profile_views', { p_company_id: companyId })
      await supabase.from('profile_views_log').insert({ company_id: companyId, visited_at: new Date().toISOString(), user_agent: navigator.userAgent })
    } catch (e) {}
  }

  async function fetchCompany() {
    setLoading(true)
    const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).eq('status', 'approved').single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCompany(data)

    const [reviewRes, formRes, portfolioRes] = await Promise.all([
      supabase.from('reviews')
        .select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id')
        .eq('company_id', data.id).eq('is_approved', true)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('lead_forms').select('*').eq('company_id', data.id).eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('portfolio_items').select('id, image_url, title, description, created_at').eq('company_id', data.id).order('created_at', { ascending: false }),
    ])

    const reviewData = reviewRes.data || []
    setReviews(reviewData)
    setPortfolio(portfolioRes.data || [])

    if (formRes.data) {
      setLeadForm(formRes.data)
      const { data: qData } = await supabase.from('lead_form_questions').select('*').eq('form_id', formRes.data.id).order('order_num')
      setQuestions(qData || [])
    }

    // Related businesses — same category, real
    if (data.category) {
      const { data: rel } = await supabase.from('companies')
        .select('id, name, category, avg_rating, plan, slug, logo_url, is_verified')
        .eq('status', 'approved').eq('category', data.category).neq('id', data.id)
        .order('avg_rating', { ascending: false }).limit(4)
      setRelated(rel || [])
    }

    const avgRating = reviewData.length > 0 ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1) : null
    const seoTitle = data.name + ' — ' + (data.category || 'Business') + ' Dubai | TrustDubai'
    const seoDesc = (data.description ? data.description.slice(0, 140) : data.name + ' is a verified ' + (data.category || 'business') + ' in Dubai.')
      + (avgRating ? ' Rated ' + avgRating + '/5.' : '') + ' Contact on TrustDubai.'
    setSEO({ title: seoTitle, description: seoDesc, image: 'https://trustdubai.ae/og-image.png', url: 'https://trustdubai.ae/' + slug })
    setJsonLD(data, reviewData)
    trackProfileView(data.id)
    setLoading(false)
  }

  async function refreshReviews() {
    const { data } = await supabase.from('reviews')
      .select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id')
      .eq('company_id', company.id).eq('is_approved', true)
      .order('created_at', { ascending: false }).limit(20)
    if (data) setReviews(data)
  }

  function requireLogin(forWhat) {
    if (customer === undefined) return false
    if (customer !== null) return true
    setLoginFor(forWhat); setShowLoginPrompt(true); return false
  }

  async function sendLeadEmail(name, phone, email) {
    try {
      const companyEmail = company.email || company.business_email || company.owner_email
      if (!companyEmail) return
      await fetch(`${SUPABASE_URL}/functions/v1/send-lead-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: company.name, company_email: companyEmail, company_whatsapp: company.whatsapp || '', lead_name: name, lead_phone: phone, lead_email: email, answers, slug }),
      })
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
    setSubmittingReview(false); setReviewSubmitted(true); setShowReviewForm(false)
    await refreshReviews()
  }

  async function deleteReview(reviewId) {
    if (!confirm('Delete your review?')) return
    await supabase.from('reviews').delete().eq('id', reviewId)
    await refreshReviews()
  }

  async function saveEditReview(reviewId) {
    if (!editingText.trim()) return
    await supabase.from('reviews').update({ rating: editingRating, review_text: editingText }).eq('id', reviewId)
    setEditingReviewId(null)
    await refreshReviews()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #03C1F5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ fontSize: 14, color: '#6b7280' }}>Loading...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#111827' }}>Company not found</h2>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: '#03C1F5', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500 }}>Go to TrustDubai</button>
      </div>
    </div>
  )

  const plan = company.plan || 'free'
  const T = PLAN_THEMES[plan] || PLAN_THEMES.free
  const isDark = plan === 'platinum'
  const initials = company.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const avatarColors = ['#1a73e8', '#1e8e3e', '#d93025', '#f9a825', '#9c27b0', '#00897b']
  const avatarColor = avatarColors[company.name?.charCodeAt(0) % avatarColors.length]
  const companyCategories = Array.isArray(company.categories) && company.categories.length > 0 ? company.categories : company.category ? [company.category] : []

  const credScore = calcCredibility(company, reviews)
  const credColor = credScore >= 75 ? '#10b981' : credScore >= 50 ? '#f59e0b' : '#6b7280'
  const credLabel = credScore >= 75 ? 'High Trust' : credScore >= 50 ? 'Medium Trust' : 'Building Trust'
  const socialLinks = buildSocialLinks(company)
  const sub = calcSubScores(company, reviews)
  const aiSummary = buildAISummary(reviews)

  const portLimit = featureVal('portfolioLimit', plan)
  const shownPortfolio = portfolio.slice(0, portLimit)

  const cardBase = { background: T.cardBg, borderRadius: 16, border: '1px solid ' + T.border, padding: 20, marginBottom: 24 }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ background: T.headerBg, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#fff" opacity={isDark ? '0.1' : '1'} />
            <path d="M16 4L26 8L26 17C26 22.5 21.5 27 16 28C10.5 27 6 22.5 6 17L6 8Z" fill="#03C1F5" opacity="0.3" />
            <polyline points="11.5,16 14.5,19.5 20.5,13" fill="none" stroke="#03C1F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: isDark ? '#a78bfa' : '#fff', fontWeight: 600, fontSize: 16 }}>TrustDubai</span>
        </button>
        {T.badge && (
          <span style={{ background: 'rgba(255,255,255,0.15)', color: isDark ? '#a78bfa' : '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>{T.badge.label}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {customer === undefined ? (
            <div style={{ width: 60, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: 20 }} />
          ) : customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>{(customer.full_name || customer.email)[0].toUpperCase()}</div>
              <span style={{ fontSize: 12, color: isDark ? '#a78bfa' : 'rgba(255,255,255,0.9)' }}>{customer.full_name || customer.email.split('@')[0]}</span>
              <button onClick={() => { signOut(); setCustomer(null) }} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => signInWithGoogle()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(255,255,255,0.1)' : '#fff', color: isDark ? '#a78bfa' : '#374151', border: isDark ? '1px solid rgba(167,139,250,0.4)' : 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in
            </button>
          )}
        </div>
      </div>

      {plan === 'platinum' && (
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d1b69)', borderBottom: '1px solid rgba(139,92,246,0.3)', padding: '10px 24px', textAlign: 'center', fontSize: 12, color: '#a78bfa', letterSpacing: '0.05em' }}>✦ PLATINUM VERIFIED BUSINESS ✦</div>
      )}
      {plan === 'gold' && (
        <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderBottom: '1px solid #fcd34d', padding: '8px 24px', textAlign: 'center', fontSize: 12, color: '#92400e', fontWeight: 500 }}>🏆 Gold Verified Business on TrustDubai</div>
      )}

      {/* Hero */}
      <div style={{ background: T.heroBg, borderBottom: '1px solid ' + T.border, padding: '32px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
            <div style={{ width: isDark ? 80 : 72, height: isDark ? 80 : 72, borderRadius: isDark ? 20 : 16, flexShrink: 0, background: isDark ? 'linear-gradient(135deg, #4c1d95, #1e1b4b)' : avatarColor + '22', color: isDark ? '#a78bfa' : avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isDark ? 28 : 24, fontWeight: 700, border: isDark ? '2px solid rgba(139,92,246,0.4)' : plan === 'gold' ? '2px solid #fcd34d' : 'none', boxShadow: isDark ? '0 0 20px rgba(139,92,246,0.3)' : plan === 'gold' ? '0 4px 20px rgba(217,119,6,0.2)' : 'none' }}>
              {company.logo_url ? <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: isDark ? 18 : 14 }} /> : initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontSize: isDark ? 26 : 22, fontWeight: 700, color: T.text, margin: 0 }}>{company.name}</h1>
                {company.is_verified && <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, border: '1px solid #a7f3d0' }}>✓ Verified</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {companyCategories.map(cat => (
                  <span key={cat} style={{ background: isDark ? 'rgba(139,92,246,0.15)' : plan === 'gold' ? '#fef3c7' : '#f3f4f6', color: isDark ? '#a78bfa' : plan === 'gold' ? '#92400e' : '#374151', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>{cat}</span>
                ))}
                {company.location && <span style={{ background: isDark ? 'rgba(139,92,246,0.1)' : '#f3f4f6', color: T.textSub, fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>📍 {company.location}</span>}
              </div>
              {company.description && can('description', plan) && <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>{company.description}</p>}
            </div>
          </div>

          {/* Rating bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: isDark ? 'rgba(139,92,246,0.1)' : plan === 'gold' ? '#fffbf0' : '#f9fafb', borderRadius: 12, border: '1px solid ' + T.border, marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: T.text, lineHeight: 1 }}>{company.avg_rating || '0.0'}</div>
              <div style={{ color: '#f9a825', fontSize: 16, marginTop: 2 }}>{'★'.repeat(Math.round(company.avg_rating || 0))}{'☆'.repeat(5 - Math.round(company.avg_rating || 0))}</div>
            </div>
            <div style={{ width: 1, height: 40, background: T.border }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{company.total_reviews || reviews.length} Reviews</div>
              <div style={{ fontSize: 13, color: T.textSub }}>From verified customers</div>
            </div>
            {company.whatsapp && (
              <>
                <div style={{ width: 1, height: 40, background: T.border, marginLeft: 'auto' }} />
                <button onClick={() => window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, ''), '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#25D366', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>💬 WhatsApp</button>
              </>
            )}
          </div>

          {/* Trust Score bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: isDark ? 'rgba(139,92,246,0.08)' : plan === 'gold' ? '#fffbf0' : '#f9fafb', borderRadius: 12, border: '1px solid ' + T.border, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, whiteSpace: 'nowrap' }}>🛡️ Trust Score</div>
            <div style={{ flex: 1, height: 6, background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: credScore + '%', height: '100%', background: credColor, borderRadius: 99, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: credColor, minWidth: 30 }}>{credScore}</div>
            <div style={{ fontSize: 12, color: credColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{credLabel}</div>
          </div>

          {/* Social Media — gated */}
          {can('socialLinks', plan) && socialLinks.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {socialLinks.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: isDark ? 'rgba(139,92,246,0.1)' : plan === 'gold' ? '#fef3c7' : '#f3f4f6', color: isDark ? '#a78bfa' : plan === 'gold' ? '#92400e' : '#374151', borderRadius: 20, fontSize: 13, fontWeight: 500, textDecoration: 'none', border: '1px solid ' + T.border }}>{s.icon} {s.label}</a>
              ))}
            </div>
          )}

          {plan === 'free' && company.description && <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, margin: 0 }}>{company.description}</p>}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 0' }}>

        {/* ===== TRUST OVERVIEW GAUGES (Gold+) ===== */}
        {can('trustGauges', plan) && (
          <div style={cardBase}>
            <SectionTitle T={T} icon="🛡️">Trust Overview</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))', gap: 14, justifyItems: 'center' }}>
              <Gauge score={credScore} label="Trust Score" color={credColor} isDark={isDark} />
              <Gauge score={sub.satisfaction} label="Satisfaction" color="#10b981" isDark={isDark} />
              <Gauge score={sub.serviceQuality} label="Service" color="#3b82f6" isDark={isDark} />
              <Gauge score={sub.verification} label="Verification" color={company.is_verified ? '#10b981' : '#f59e0b'} isDark={isDark} />
              <Gauge score={sub.community} label="Community" color="#8b5cf6" isDark={isDark} />
            </div>
          </div>
        )}

        {/* ===== AI BUSINESS SUMMARY (Gold+) ===== */}
        {can('aiSummary', plan) && aiSummary && (
          <div style={{ ...cardBase, background: isDark ? 'rgba(139,92,246,0.08)' : T.cardBg }}>
            <SectionTitle T={T} icon="🤖">AI Business Summary</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>What Customers Love</div>
                {aiSummary.loves.map((l, i) => <div key={i} style={{ fontSize: 12, color: T.textSub, marginBottom: 4, lineHeight: 1.5 }}>✓ {l}</div>)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>Areas to Watch</div>
                {aiSummary.concerns.map((c, i) => <div key={i} style={{ fontSize: 12, color: T.textSub, marginBottom: 4, lineHeight: 1.5 }}>• {c}</div>)}
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, fontSize: 12, color: T.textSub }}>
              <span style={{ fontWeight: 700, color: T.text }}>Reputation:</span> {aiSummary.trend}
            </div>
          </div>
        )}

        {/* ===== BUSINESS INSIGHTS (Gold+) ===== */}
        {can('businessInsights', plan) && (
          <div style={cardBase}>
            <SectionTitle T={T} icon="📊">Business Insights</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Profile Views', value: company.profile_views || 0, icon: '👁️' },
                { label: 'Total Reviews', value: company.total_reviews || reviews.length, icon: '⭐' },
                { label: 'Avg Rating', value: (company.avg_rating || '0.0') + '★', icon: '📈' },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: '14px 8px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 10, border: '1px solid ' + T.border }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: T.textSub, marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Form */}
        {leadForm && (
          <div style={cardBase}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: T.text }}>Request Submitted!</h3>
                <p style={{ fontSize: 14, color: T.textSub }}>{company.name} will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={submitLead}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: T.text }}>{leadForm.title}</h3>
                <p style={{ fontSize: 13, color: T.textSub, marginBottom: 20 }}>Fill this form — {company.name} will respond shortly</p>
                {customer && <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#065f46' }}>✓ Logged in as <strong>{customer.full_name || customer.email}</strong></div>}
                {questions.map(q => (
                  <div key={q.id} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: T.text, display: 'block', marginBottom: 6 }}>{q.question}{q.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</label>
                    {q.type === 'text' && <input required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.question]: e.target.value }))} placeholder="Your answer..." style={{ width: '100%', padding: '10px 12px', border: '1px solid ' + T.border, borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: isDark ? '#1a1a2e' : '#fff', color: T.text }} />}
                    {q.type === 'select' && <select required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.question]: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid ' + T.border, borderRadius: 8, fontSize: 14, background: isDark ? '#1a1a2e' : '#fff', color: T.text }}><option value="">Select an option</option>{(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}</select>}
                    {q.type === 'radio' && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{(q.options || []).map((o, i) => <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: T.textSub, cursor: 'pointer' }}><input type="radio" name={q.id} value={o} required={q.required} onChange={() => setAnswers(prev => ({ ...prev, [q.question]: o }))} />{o}</label>)}</div>}
                  </div>
                ))}
                <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', background: submitting ? '#9ca3af' : T.accent, color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>{submitting ? 'Submitting...' : customer ? 'Submit — Get Quote' : 'Sign in to Submit'}</button>
              </form>
            )}
          </div>
        )}

        {/* ===== PORTFOLIO (Silver+, plan-limited; Free => upgrade lock) ===== */}
        {!can('portfolio', plan) ? (
          <div style={{ marginBottom: 4 }}>
            <SectionTitle T={T} icon="🖼️">Portfolio</SectionTitle>
            <UpgradeLock T={T} title="Portfolio is a premium feature" sub="This business is on the Free plan. Upgrade to Silver or higher to showcase project photos." />
          </div>
        ) : portfolio.length > 0 ? (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle T={T} icon="🖼️"
              right={portfolio.length > portLimit ? <span style={{ fontSize: 11, color: T.textSub }}>Showing {portLimit} of {portfolio.length}</span> : null}>
              Portfolio
            </SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {shownPortfolio.map(item => (
                <div key={item.id} onClick={() => setLightboxImg(item)} style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid ' + T.border, aspectRatio: '1', background: isDark ? '#1a1a2e' : '#f8fafc', position: 'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <img src={item.image_url} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }} onError={e => { e.target.style.display = 'none' }} />
                  {item.title && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '16px 8px 6px', color: '#fff', fontSize: 11, fontWeight: 600 }}>{item.title}</div>
                  )}
                </div>
              ))}
            </div>
            {portfolio.length > portLimit && plan === 'silver' && (
              <div style={{ marginTop: 10, fontSize: 11, color: T.textSub, textAlign: 'center' }}>Upgrade to Gold to showcase all {portfolio.length} projects</div>
            )}
          </div>
        ) : null}

        {/* ===== VERIFIED TEAM (Silver+) — structure ready, data later ===== */}
        {can('teamSection', plan) && (
          <div style={cardBase}>
            <SectionTitle T={T} icon="👷">Verified Team</SectionTitle>
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textSub, fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
              Team verification coming soon — this business will display its ID-verified professionals here.
            </div>
          </div>
        )}

        {/* ===== ACHIEVEMENTS (Gold+) — structure ready ===== */}
        {can('achievements', plan) && (
          <div style={cardBase}>
            <SectionTitle T={T} icon="🏅">Achievements &amp; Badges</SectionTitle>
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textSub, fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>
              Awards &amp; certifications will appear here soon.
            </div>
          </div>
        )}

        {/* Reviews Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.sectionTitle, margin: 0 }}>Customer Reviews</h2>
          {!reviewSubmitted && (
            <button onClick={() => { if (requireLogin('review')) setShowReviewForm(true) }} style={{ padding: '7px 16px', background: customer ? T.accent : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'), color: customer ? '#fff' : T.textSub, border: customer ? 'none' : '1px solid ' + T.border, borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{customer ? '+ Write a Review' : '🔐 Sign in to Review'}</button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && customer && (
          <div style={{ background: T.cardBg, borderRadius: 12, border: '1px solid ' + T.border, padding: '20px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: T.text }}>Write a Review</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 8 }}>Your Rating</div>
              <div style={{ display: 'flex', gap: 6 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setReviewRating(s)} type="button" style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', color: s <= reviewRating ? '#f9a825' : '#d1d5db' }}>★</button>)}</div>
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." style={{ width: '100%', padding: '10px 12px', border: '1px solid ' + T.border, borderRadius: 8, fontSize: 14, minHeight: 100, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', resize: 'vertical', background: isDark ? '#1a1a2e' : '#fff', color: T.text }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitReview} disabled={submittingReview || !reviewText.trim()} style={{ flex: 1, padding: '10px', background: (submittingReview || !reviewText.trim()) ? '#9ca3af' : T.accent, color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
              <button onClick={() => setShowReviewForm(false)} style={{ flex: 1, padding: '10px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: T.textSub, border: 'none', borderRadius: 20, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {reviewSubmitted && (
          <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#065f46' }}>Review submitted successfully!</div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: T.cardBg, borderRadius: 12, border: '1px solid ' + T.border, marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <p style={{ fontSize: 14, color: T.textSub }}>No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {reviews.map(r => {
              const analysis = analyzeReview(r)
              const isMyReview = customer && r.customer_id === customer.id
              const isEditing = editingReviewId === r.id
              return (
                <div key={r.id} style={{ background: T.cardBg, borderRadius: 12, border: '1px solid ' + (isMyReview ? T.accent : T.border), padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: isMyReview ? T.accent + '22' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: isMyReview ? T.accent : (isDark ? '#a0aec0' : '#374151') }}>{(r.reviewer_name || 'A')[0].toUpperCase()}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{r.reviewer_name || 'Anonymous'}</div>
                          {isMyReview && <span style={{ fontSize: 10, background: T.accent + '22', color: T.accent, padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>Your Review</span>}
                        </div>
                        <div style={{ fontSize: 11, color: T.textSub }}>{new Date(r.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric', day: 'numeric' })}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ color: '#f9a825', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      {isMyReview && !isEditing && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setEditingReviewId(r.id); setEditingText(r.review_text); setEditingRating(r.rating) }} style={{ padding: '3px 10px', background: 'transparent', border: '1px solid ' + T.border, borderRadius: 6, fontSize: 11, color: T.textSub, cursor: 'pointer' }}>✏️ Edit</button>
                          <button onClick={() => deleteReview(r.id)} style={{ padding: '3px 10px', background: 'transparent', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 11, color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditingRating(s)} type="button" style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: s <= editingRating ? '#f9a825' : '#d1d5db' }}>★</button>)}</div>
                      <textarea value={editingText} onChange={e => setEditingText(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid ' + T.border, borderRadius: 8, fontSize: 14, minHeight: 80, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box', resize: 'vertical', background: isDark ? '#1a1a2e' : '#fff', color: T.text }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEditReview(r.id)} style={{ flex: 1, padding: '8px', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save Changes</button>
                        <button onClick={() => setEditingReviewId(null)} style={{ flex: 1, padding: '8px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: T.textSub, border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {r.review_text && <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.6, margin: '0 0 10px 0' }}>{r.review_text}</p>}
                      {aiAnalysisOn && can('aiReviewAnalysis', plan) && r.review_text && r.review_text.length > 5 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 10px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8, border: '1px solid ' + T.border, marginBottom: r.owner_reply ? 10 : 0 }}>
                          <div style={{ fontSize: 10, color: T.textSub, width: '100%', marginBottom: 3, fontWeight: 600, letterSpacing: '0.04em' }}>AI ANALYSIS</div>
                          {[
                            { label: 'Authenticity', value: analysis.authenticity + '%', color: analysis.authenticity >= 70 ? '#1e8e3e' : analysis.authenticity >= 45 ? '#e8b84b' : '#d93025' },
                            { label: 'Bias Level', value: analysis.bias, color: analysis.bias === 'Low' ? '#1e8e3e' : analysis.bias === 'Medium' ? '#e8b84b' : '#d93025' },
                            { label: 'Tone', value: analysis.tone, color: analysis.tone === 'Positive' ? '#1e8e3e' : analysis.tone === 'Negative' ? '#d93025' : '#6b7280' },
                            { label: 'Trust', value: analysis.trust, color: analysis.trust === 'High' ? '#1e8e3e' : analysis.trust === 'Medium' ? '#e8b84b' : '#d93025' },
                          ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: T.cardBg, padding: '3px 8px', borderRadius: 99, border: '1px solid ' + T.border }}>
                              <span style={{ fontSize: 10, color: T.textSub }}>{item.label}:</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.owner_reply && (
                        <div style={{ background: isDark ? 'rgba(139,92,246,0.1)' : '#f0fdf4', border: '1px solid ' + (isDark ? 'rgba(139,92,246,0.3)' : '#a7f3d0'), borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#a78bfa' : '#065f46', marginBottom: 6 }}>💬 Owner Reply{(r.owner_reply_at || r.replied_at) && <span style={{ fontWeight: 400, color: T.textSub }}> · {new Date(r.owner_reply_at || r.replied_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}</div>
                          <p style={{ fontSize: 13, color: T.textSub, margin: 0, lineHeight: 1.6 }}>{r.owner_reply}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ===== FAQ (Gold+) — structure ready ===== */}
        {can('faqSection', plan) && (
          <div style={cardBase}>
            <SectionTitle T={T} icon="❓">Frequently Asked Questions</SectionTitle>
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textSub, fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
              FAQs will appear here soon — this business can add common questions from their portal.
            </div>
          </div>
        )}

        {/* ===== RELATED BUSINESSES (all plans) ===== */}
        {can('relatedBusiness', plan) && related.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle T={T} icon="🔗">Related Businesses</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {related.map(rc => {
                const rInit = rc.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                return (
                  <div key={rc.id} onClick={() => { if (rc.slug) window.location.href = '/' + rc.slug }} style={{ cursor: 'pointer', background: T.cardBg, border: '1px solid ' + T.border, borderRadius: 12, padding: 12 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent + '22', color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                        {rc.logo_url ? <img src={rc.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : rInit}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.name}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f9a825' }}>{rc.avg_rating || '—'}★</span>
                      {rc.is_verified && <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>✓ Verified</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '100%', textAlign: 'center' }}>
            <img src={lightboxImg.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain' }} />
            {lightboxImg.title && <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginTop: 14 }}>{lightboxImg.title}</div>}
            {lightboxImg.description && <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>{lightboxImg.description}</div>}
            <button onClick={() => setLightboxImg(null)} style={{ marginTop: 16, padding: '8px 24px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>{loginFor === 'review' ? 'Sign in to Write a Review' : 'Sign in to Submit Inquiry'}</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>{loginFor === 'review' ? 'Sign in with Google to leave a genuine review.' : 'Sign in to submit your inquiry.'}</p>
            <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10, color: '#374151' }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={() => setShowLoginPrompt(false)} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '32px 24px', color: T.textSub, fontSize: 12 }}>
        <button onClick={() => window.location.href = '/'} style={{ color: T.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>TrustDubai</button>
        {' — Building trust in Dubai\'s business community'}
      </div>
    </div>
  )
}
