import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'

/* ===================== PLAN FEATURE MATRIX ===================== */
const FEATURES = {
  description:      { free: true,  silver: true,  gold: true,  platinum: true  },
  socialLinks:      { free: false, silver: true,  gold: true,  platinum: true  },
  portfolio:        { free: false, silver: true,  gold: true,  platinum: true  },
  portfolioLimit:   { free: 0,     silver: 6,     gold: 999,   platinum: 999   },
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
const featureVal = (f, plan) => (FEATURES[f] ? (FEATURES[f][plan] ?? FEATURES[f].free) : 0)

const SUPABASE_URL = 'https://ribdorraxxhfbfkjhpie.supabase.co'

function makeTheme(dark) {
  if (dark) return {
    dark: true,
    bg: 'radial-gradient(1100px 560px at 8% -6%, rgba(29,111,184,0.13), transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(139,92,246,0.1), transparent 55%), #080c17',
    card: '#0f1626', line: '#1e293b', soft: '#0c1322',
    t1: '#e8eef8', t2: '#94a3b8', t3: '#5d6b7e',
    accent: '#3b8fd4', gold: '#d4a932', green: '#22c55e', blue: '#3b82f6', amber: '#d4940a', violet: '#a78bfa', red: '#ef4444',
    shadow: '0 0 0 1px rgba(255,255,255,0.02)',
  }
  return {
    dark: false,
    bg: '#dde3ec',
    card: '#ffffff', line: '#e6eaf0', soft: '#f4f7fb',
    t1: '#1e2a3a', t2: '#5d6b7e', t3: '#9aa7b8',
    accent: '#1d6fb8', gold: '#c9a227', green: '#1e9e63', blue: '#2563eb', amber: '#d4940a', violet: '#8b5cf6', red: '#dc3545',
    shadow: '0 1px 2px rgba(20,40,80,0.05), 0 2px 12px rgba(20,40,80,0.05)',
  }
}

function setSEO({ title, description, image, url }) {
  document.title = title
  const setMeta = (n, c, p = false) => { const a = p ? 'property' : 'name'; let el = document.querySelector(`meta[${a}="${n}"]`); if (!el) { el = document.createElement('meta'); el.setAttribute(a, n); document.head.appendChild(el) } el.setAttribute('content', c) }
  setMeta('description', description); setMeta('og:title', title, true); setMeta('og:description', description, true); setMeta('og:url', url, true); setMeta('og:type', 'business.business', true); setMeta('og:image', image, true); setMeta('og:site_name', 'TrustDubai', true)
  const old = document.getElementById('jsonld-business'); if (old) old.remove()
}
function setJsonLD(company, reviews) {
  const s = document.createElement('script'); s.id = 'jsonld-business'; s.type = 'application/ld+json'
  s.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: company.name, description: company.description || '', url: 'https://trustdubai.ae/' + company.slug, telephone: company.phone || '', address: { '@type': 'PostalAddress', addressLocality: company.location || 'Dubai', addressCountry: 'AE' }, aggregateRating: reviews.length > 0 ? { '@type': 'AggregateRating', ratingValue: (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1), reviewCount: reviews.length, bestRating: 5, worstRating: 1 } : undefined })
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

/* ---- atoms ---- */
function Card({ TH, children, style }) {
  return <div style={{ background: TH.card, border: `1px solid ${TH.line}`, borderRadius: 16, padding: 22, boxShadow: TH.shadow, marginBottom: 18, ...style }}>{children}</div>
}
function H2({ TH, children, right, small }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}><h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: small ? 16 : 19, fontWeight: 800, color: TH.t1, margin: 0, textTransform: 'uppercase', letterSpacing: '0.01em' }}>{children}</h2>{right}</div>
}
function BigGauge({ TH, label, score, color, area }) {
  const isText = typeof score === 'string'
  const r = 46, c = 2 * Math.PI * r, filled = (isText ? 0.5 : score / 100) * c
  return (
    <div style={{ background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 14, padding: '18px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: TH.t1, marginBottom: 14 }}>{label}</div>
      <div style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
        <svg width="112" height="112"><circle cx="56" cy="56" r={r} fill="none" stroke={TH.line} strokeWidth="8" /><circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${filled} ${c}`} strokeDashoffset={c * 0.25} transform="rotate(-90 56 56)" /></svg>
        <div style={{ position: 'absolute', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: isText ? 18 : 26, color }}>{isText ? score : score + '%'}</div>
      </div>
      <svg width="100%" height="50" viewBox="0 0 150 50" preserveAspectRatio="none">
        <polyline points={area} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  )
}

export default function PublicProfile() {
  const { slug } = useParams()
  const [dark, setDark] = useState(false)
  const [tab, setTab] = useState('overview')
  const [company, setCompany] = useState(null)
  const [reviews, setReviews] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [related, setRelated] = useState([])
  const [badges, setBadges] = useState([])
  const [faqs, setFaqs] = useState([])
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
  const [reviewTab, setReviewTab] = useState('latest')
  const [openFaq, setOpenFaq] = useState(0)
  const [helpful, setHelpful] = useState({})
  const [showAllGallery, setShowAllGallery] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [social, setSocial] = useState(null)

  useEffect(() => {
    fetchCompany(); checkCustomer(); fetchAiSetting(); fetchSocial()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (e, s) => {
      if (e === 'SIGNED_IN' && s?.user) { setCustomer(await upsertCustomer(s.user)); setShowLoginPrompt(false) }
      else if (e === 'SIGNED_OUT') setCustomer(null)
    })
    return () => subscription.unsubscribe()
  }, [slug])

  async function checkCustomer() { setCustomer((await getCustomer()) || null) }
  async function fetchAiSetting() { const { data } = await supabase.from('app_settings').select('value').eq('key', 'feature.ai_analysis').maybeSingle(); setAiAnalysisOn(data?.value?.enabled === true) }
  async function fetchSocial() { const { data } = await supabase.from('app_settings').select('value').eq('key', 'trustdubai.social').maybeSingle(); setSocial(data?.value || null) }
  async function trackProfileView(id) { try { await supabase.rpc('increment_profile_views', { p_company_id: id }); await supabase.from('profile_views_log').insert({ company_id: id, visited_at: new Date().toISOString(), user_agent: navigator.userAgent }) } catch (e) {} }

  async function fetchCompany() {
    setLoading(true)
    const { data, error } = await supabase.from('companies').select('*').eq('slug', slug).eq('status', 'approved').single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCompany(data)
    const [reviewRes, formRes, portfolioRes, badgeRes, faqRes] = await Promise.all([
      supabase.from('reviews').select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id, helpful_count').eq('company_id', data.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(60),
      supabase.from('lead_forms').select('*').eq('company_id', data.id).eq('is_active', true).limit(1).maybeSingle(),
      supabase.from('portfolio_items').select('id, image_url, title, description, created_at').eq('company_id', data.id).order('created_at', { ascending: false }),
      supabase.from('company_badges').select('*').eq('company_id', data.id).eq('is_active', true).order('display_order'),
      supabase.from('company_faqs').select('*').eq('company_id', data.id).eq('is_active', true).order('display_order'),
    ])
    setReviews(reviewRes.data || []); setPortfolio(portfolioRes.data || [])
    setBadges(badgeRes.data || []); setFaqs(faqRes.data || [])
    const hl = {}; (reviewRes.data || []).forEach(r => { hl[r.id] = r.helpful_count || 0 }); setHelpful(hl)
    if (formRes.data) { setLeadForm(formRes.data); const { data: q } = await supabase.from('lead_form_questions').select('*').eq('form_id', formRes.data.id).order('order_num'); setQuestions(q || []) }
    if (data.category) { const { data: rel } = await supabase.from('companies').select('id, name, category, avg_rating, total_reviews, plan, slug, logo_url, is_verified').eq('status', 'approved').eq('category', data.category).neq('id', data.id).order('avg_rating', { ascending: false }).limit(6); setRelated(rel || []) }
    const reviewData = reviewRes.data || []
    const avgRating = reviewData.length > 0 ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1) : null
    setSEO({ title: data.name + ' — ' + (data.category || 'Business') + ' Dubai | TrustDubai', description: (data.description ? data.description.slice(0, 140) : data.name + ' is a verified ' + (data.category || 'business') + ' in Dubai.') + (avgRating ? ' Rated ' + avgRating + '/5.' : ''), image: 'https://trustdubai.ae/og-image.png', url: 'https://trustdubai.ae/' + slug })
    setJsonLD(data, reviewData); trackProfileView(data.id); setLoading(false)
  }
  async function refreshReviews() { const { data } = await supabase.from('reviews').select('id, reviewer_name, rating, review_text, owner_reply, owner_reply_at, replied_at, created_at, customer_id, helpful_count').eq('company_id', company.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(60); if (data) { setReviews(data); const hl = {}; data.forEach(r => { hl[r.id] = r.helpful_count || 0 }); setHelpful(hl) } }
  function requireLogin(f) { if (customer === undefined) return false; if (customer !== null) return true; setLoginFor(f); setShowLoginPrompt(true); return false }
  async function markHelpful(id) { const next = (helpful[id] || 0) + 1; setHelpful(h => ({ ...h, [id]: next })); try { await supabase.rpc('increment_review_helpful', { p_review_id: id }) } catch (e) { try { await supabase.from('reviews').update({ helpful_count: next }).eq('id', id) } catch (e2) {} } }
  async function sendLeadEmail(name, phone, email) { try { const ce = company.email || company.business_email || company.owner_email; if (!ce) return; await fetch(`${SUPABASE_URL}/functions/v1/send-lead-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_name: company.name, company_email: ce, company_whatsapp: company.whatsapp || '', lead_name: name, lead_phone: phone, lead_email: email, answers, slug }) }) } catch (e) {} }
  async function submitLead(e) {
    e.preventDefault(); if (!requireLogin('lead')) return; setSubmitting(true)
    const name = customer?.full_name || answers['Your name'] || ''; const phone = answers['Your phone number'] || answers['phone'] || ''; const email = customer?.email || answers['Email'] || ''
    await supabase.from('lead_submissions').insert({ form_id: leadForm.id, company_id: company.id, customer_id: customer?.id || null, name, phone, email, answers, source_url: window.location.href })
    await supabase.rpc('increment_leads', { p_company_id: company.id }); await sendLeadEmail(name, phone, email)
    if (company.whatsapp) { const msg = ['🏢 *New Lead from TrustDubai*', '', '👤 Name: ' + (name || 'Not provided'), '📞 Phone: ' + (phone || 'Not provided'), '✉️ Email: ' + (email || 'Not provided'), '', '📋 *Answers:*', ...Object.entries(answers).map(([q, a]) => '• ' + q + ': ' + a), '', '🔗 Via: trustdubai.ae/' + slug].join('\n'); window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank') }
    setSubmitting(false); setSubmitted(true)
  }
  async function submitReview(e) { e.preventDefault(); if (!requireLogin('review')) return; if (!reviewText.trim()) return; setSubmittingReview(true); await supabase.from('reviews').insert({ company_id: company.id, reviewer_name: customer.full_name || customer.email, reviewer_email: customer.email, customer_id: customer.id, rating: reviewRating, review_text: reviewText, is_approved: true }); setSubmittingReview(false); setReviewSubmitted(true); setShowReviewForm(false); setReviewText(''); await refreshReviews() }
  async function deleteReview(id) { if (!confirm('Delete your review?')) return; await supabase.from('reviews').delete().eq('id', id); await refreshReviews() }
  async function saveEditReview(id) { if (!editingText.trim()) return; await supabase.from('reviews').update({ rating: editingRating, review_text: editingText }).eq('id', id); setEditingReviewId(null); await refreshReviews() }

  const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');@keyframes tdspin{to{transform:rotate(360deg)}}@keyframes tdfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.td-tabpane{animation:tdfade .35s ease both}`}</style>

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dde3ec' }}><Fonts /><div style={{ textAlign: 'center' }}><div style={{ width: 36, height: 36, border: '3px solid #1d6fb8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'tdspin .8s linear infinite', margin: '0 auto 12px' }} /><div style={{ fontSize: 14, color: '#5d6b7e', fontFamily: 'Manrope,sans-serif' }}>Loading...</div></div></div>
  if (notFound) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dde3ec' }}><Fonts /><div style={{ textAlign: 'center', padding: 40 }}><div style={{ fontSize: 52 }}>🔍</div><h2 style={{ fontFamily: 'Sora,sans-serif', color: '#1e2a3a', margin: '12px 0' }}>Company not found</h2><button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: '#1d6fb8', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Go to TrustDubai</button></div></div>

  const plan = company.plan || 'free'
  const TH = makeTheme(dark)
  const F = "'Manrope',sans-serif"
  const cats = Array.isArray(company.categories) && company.categories.length ? company.categories : company.category ? [company.category] : []
  const cred = calcCredibility(company, reviews)
  const sub = calcSubScores(company, reviews)
  const ai = buildAISummary(reviews)
  const socialLinks = buildSocialLinks(company)
  const respRate = 99
  const community = cred >= 75 ? 'Excellent' : cred >= 50 ? 'Good' : 'Building'

  const sortedReviews = [...reviews].sort((a, b) => reviewTab === 'highest' ? b.rating - a.rating : 0)
  const tabReviews = reviewTab === 'verified' ? sortedReviews.filter(r => r.customer_id) : sortedReviews
  const reviewSlots = (showAllReviews || reviewTab === 'all') ? tabReviews : tabReviews.slice(0, 6)
  const fixedReviewSlots = Math.max(6, reviewSlots.length)

  const chip = (t, k) => <span key={k} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, background: TH.soft, border: `1px solid ${TH.line}`, color: TH.t2, fontWeight: 600 }}>{t}</span>

  const TABS = [['overview', 'Overview'], ['reviews', 'Review Section'], ['achievement', 'Achievement & Badge']]

  /* empty placeholder cell */
  const EmptyCell = ({ h = 120, label }) => <div style={{ border: `1px dashed ${TH.line}`, borderRadius: 12, minHeight: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TH.t3, fontSize: 11, background: TH.soft }}>{label || ''}</div>

  /* ---- review card ---- */
  const ReviewCard = ({ r }) => {
    if (!r) return <EmptyCell h={150} label="" />
    const a = analyzeReview(r); const mine = customer && r.customer_id === customer.id; const ed = editingReviewId === r.id
    return (
      <div style={{ border: `1px solid ${mine ? TH.accent : TH.line}`, borderRadius: 12, padding: 14, background: TH.soft, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: TH.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{(r.reviewer_name || 'A')[0].toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reviewer_name || 'Anonymous'}{mine && <span style={{ fontSize: 8, color: TH.accent, marginLeft: 4 }}>(You)</span>}</div>
            <div style={{ color: TH.gold, fontSize: 11 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          </div>
          {mine && !ed && <span style={{ display: 'flex', gap: 4 }}><button onClick={() => { setEditingReviewId(r.id); setEditingText(r.review_text); setEditingRating(r.rating) }} style={{ fontSize: 10, background: 'none', border: 'none', color: TH.t3, cursor: 'pointer' }}>✏️</button><button onClick={() => deleteReview(r.id)} style={{ fontSize: 10, background: 'none', border: 'none', color: TH.red, cursor: 'pointer' }}>🗑️</button></span>}
          {!mine && <span style={{ color: TH.t3, fontSize: 14 }}>⋯</span>}
        </div>
        {ed ? (
          <div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditingRating(s)} type="button" style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: s <= editingRating ? TH.gold : TH.line }}>★</button>)}</div>
            <textarea value={editingText} onChange={e => setEditingText(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${TH.line}`, borderRadius: 7, fontSize: 12, minHeight: 50, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.card, color: TH.t1, marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 5 }}><button onClick={() => saveEditReview(r.id)} style={{ flex: 1, padding: 6, background: TH.accent, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Save</button><button onClick={() => setEditingReviewId(null)} style={{ flex: 1, padding: 6, background: TH.card, color: TH.t2, border: `1px solid ${TH.line}`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancel</button></div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: TH.t2, lineHeight: 1.5, margin: '0 0 10px', flex: 1 }}>{r.review_text}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, borderTop: `1px solid ${TH.line}` }}>
              <button onClick={() => markHelpful(r.id)} style={{ fontSize: 10.5, color: TH.t3, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>👍 Helpful ({helpful[r.id] || 0})</button>
              {aiAnalysisOn && can('aiReviewAnalysis', plan) && r.review_text && r.review_text.length > 5 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: TH.t3 }}>⚡ AI Authenticity</div>
                  <div style={{ fontSize: 9.5, color: a.ok ? TH.green : TH.amber, fontWeight: 700 }}>{a.ok ? '✓ ' : ''}{a.label}</div>
                </div>
              )}
            </div>
            {r.owner_reply && <div style={{ background: TH.accent + '14', border: `1px solid ${TH.accent}44`, borderRadius: 7, padding: '8px 11px', marginTop: 9 }}><div style={{ fontSize: 10, fontWeight: 700, color: TH.accent, marginBottom: 3 }}>💬 Owner Reply</div><p style={{ fontSize: 11, color: TH.t2, margin: 0, lineHeight: 1.4 }}>{r.owner_reply}</p></div>}
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: TH.bg, minHeight: '100vh', fontFamily: F, color: TH.t1, fontSize: 13 }}>
      <Fonts />

      {/* HEADER with TABS */}
      <div style={{ background: TH.dark ? 'rgba(8,12,23,0.9)' : TH.card, borderBottom: `1px solid ${TH.line}`, position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17, color: TH.t1 }}>🛡️ Trust<span style={{ color: TH.accent }}>Dubai</span></button>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TABS.map(([k, l]) => <button key={k} onClick={() => { setTab(k); window.scrollTo(0, 0) }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? TH.accent : 'transparent'}`, color: tab === k ? TH.accent : TH.t2, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{l}</button>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <button onClick={() => setDark(d => !d)} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${TH.line}`, background: TH.card, color: TH.t2, cursor: 'pointer', fontSize: 14 }}>{dark ? '☀️' : '🌙'}</button>
            {customer === undefined ? <div style={{ width: 56, height: 30, background: TH.soft, borderRadius: 20 }} /> : customer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: TH.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{(customer.full_name || customer.email)[0].toUpperCase()}</div>
                <button onClick={() => { signOut(); setCustomer(null) }} style={{ fontSize: 11, color: TH.t3, background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
              </div>
            ) : (
              <button onClick={() => signInWithGoogle()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: TH.card, border: `1px solid ${TH.line}`, borderRadius: 20, padding: '6px 13px', fontSize: 12, fontWeight: 600, color: TH.t1, cursor: 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 20px 50px' }}>

        {/* ============================ OVERVIEW (4 col) ============================ */}
        {tab === 'overview' && (
          <div className="td-tabpane">
            {/* HEADER + ROW 1 */}
            <Card TH={TH}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>{company.name}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: TH.green, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '6px 0 16px' }}>{company.is_verified && '✓ Verified Business'}{plan !== 'free' && ' · ' + plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 18 }}>
                {[['Average Rating', (company.avg_rating || '0.0'), '★'], ['Verified Reviews', company.total_reviews || reviews.length], ['Response Rate', respRate + '%'], ['Community Trust', community]].map(([k, v, st], i) => (
                  <div key={k} style={{ borderLeft: i ? `1px solid ${TH.line}` : 'none', paddingLeft: i ? 22 : 0 }}>
                    <div style={{ fontSize: 10, color: TH.t3 }}>{k}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: k === 'Community Trust' ? 18 : 22, fontWeight: 800, color: k === 'Community Trust' ? TH.green : TH.t1, marginTop: k === 'Community Trust' ? 3 : 0 }}>{v} {st && <span style={{ color: TH.gold, fontSize: 16 }}>{st}</span>}</div>
                  </div>
                ))}
              </div>

              {/* Row 1 grid: photos col1-3 (2 sub-rows), data col4 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="td-ov-row1">
                <div style={{ gridColumn: '1 / 4' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TH.t3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Featured Work</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '1fr 1fr', gap: 8 }}>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const p = portfolio[i]
                      return p
                        ? <img key={i} src={p.image_url} alt="" onClick={() => setLightboxImg(p)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 9, cursor: 'pointer' }} onError={e => { e.target.style.display = 'none' }} />
                        : <div key={i} style={{ width: '100%', aspectRatio: '1', borderRadius: 9, background: TH.soft, border: `1px dashed ${TH.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TH.t3, fontSize: 18 }}>🖼️</div>
                    })}
                  </div>
                </div>
                <div style={{ gridColumn: '4 / 5', background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 12, padding: 14, alignSelf: 'start' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{company.name}</div>
                  <div style={{ color: TH.gold, fontSize: 13, marginBottom: 10 }}>{'★'.repeat(Math.round(company.avg_rating || 0))}{'☆'.repeat(5 - Math.round(company.avg_rating || 0))}</div>
                  {[['Average Rating', (parseFloat(company.avg_rating || 0) / 5 * 100)], ['Response Rate', respRate], ['Community Trust', cred]].map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 10, color: TH.t3 }}>{k}</span>{k === 'Community Trust' && <span style={{ fontSize: 10, fontWeight: 700, color: TH.green }}>{community}</span>}</div>
                      <div style={{ height: 5, background: TH.line, borderRadius: 99, marginTop: 4, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: v + '%', background: TH.green, borderRadius: 99 }} /></div>
                    </div>
                  ))}
                  <button onClick={() => { setTab('reviews'); if (requireLogin('review')) setShowReviewForm(true) }} style={{ width: '100%', background: TH.accent, color: '#fff', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 }}>Write Review</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>{cats.map(c => chip(c, c))}{company.location && chip('📍 ' + company.location, 'loc')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {company.whatsapp && <button onClick={() => window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, ''), '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💬 WhatsApp</button>}
                {can('socialLinks', plan) && socialLinks.map(s => <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: TH.soft, color: TH.t1, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', border: `1px solid ${TH.line}` }}>{s.icon} {s.label}</a>)}
              </div>
            </Card>

            {/* ROW 2: Trust Overview */}
            <Card TH={TH}>
              <H2 TH={TH}>🛡️ Trust Overview</H2>
              {can('trustGauges', plan) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="td-ov-t4">
                  <BigGauge TH={TH} label="Reputation Health" score={sub.reputation} color={TH.green} area="0,40 25,30 50,35 75,20 100,28 125,14 150,10" />
                  <BigGauge TH={TH} label="Customer Satisfaction" score={sub.satisfaction} color={TH.blue} area="0,38 25,32 50,34 75,22 100,24 125,12 150,8" />
                  <BigGauge TH={TH} label="Service Quality" score={sub.service} color={TH.gold} area="0,40 25,34 50,28 75,30 100,18 125,16 150,10" />
                  <BigGauge TH={TH} label="Community Trust" score={sub.community} color={TH.violet} area="0,42 25,34 50,30 75,24 100,20 125,14 150,9" />
                </div>
              ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 Trust Overview is available on Gold plan and above</div>}
            </Card>

            {/* ROW 3: AI Summary (col1-2) + Location (col3-4) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }} className="td-ov-row3">
              <Card TH={TH} style={{ gridColumn: '1 / 3', marginBottom: 0 }}>
                <H2 TH={TH} small>🤖 AI Business Summary</H2>
                {can('aiSummary', plan) ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>What Customers Love</div>
                      {(ai.loves.length ? ai.loves : ['Building reputation']).map((l, i) => <div key={i} style={{ fontSize: 12.5, color: TH.t2, marginBottom: 9, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><span style={{ width: 17, height: 17, borderRadius: '50%', background: TH.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✓</span>{l}</div>)}
                    </div>
                    <div style={{ background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Common Concerns</div>
                      {(ai.concerns.length ? ai.concerns : ['None reported']).map((c, i) => <div key={i} style={{ fontSize: 12.5, color: TH.t2, marginBottom: 9, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><span style={{ width: 17, height: 17, borderRadius: '50%', background: TH.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>!</span>{c}</div>)}
                    </div>
                  </div>
                ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 AI Summary on Gold plan and above</div>}
              </Card>
              <Card TH={TH} style={{ gridColumn: '3 / 5', marginBottom: 0 }}>
                <H2 TH={TH} small>📍 Location Section</H2>
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }} className="td-loc">
                  <div style={{ height: 150, borderRadius: 12, overflow: 'hidden', position: 'relative', background: TH.dark ? 'linear-gradient(135deg,#0d1a30,#0a1424)' : 'linear-gradient(135deg,#d6e6f5,#c2d8ee)' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: `linear-gradient(${TH.accent} 1px,transparent 1px),linear-gradient(90deg,${TH.accent} 1px,transparent 1px)`, backgroundSize: '20px 20px' }} />
                    <div style={{ position: 'absolute', top: '40%', left: '38%', width: 14, height: 14, borderRadius: '50% 50% 50% 0', background: '#dc3545', transform: 'rotate(-45deg)' }} />
                    <div style={{ position: 'absolute', top: '48%', left: '42%', background: '#1e2a3a', color: '#fff', fontSize: 9, padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>📍 {company.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: TH.t2, lineHeight: 1.9 }}>
                    <div style={{ marginBottom: 6 }}><b style={{ color: TH.t1 }}>📍 {company.name}</b><br />{company.location || 'Dubai, UAE'}</div>
                    {company.phone && <div>📞 {company.phone}</div>}
                    <div>🕐 8 AM – 8 PM</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* ROW 4-5: About Company (full) */}
            <Card TH={TH} style={{ marginTop: 18 }}>
              <H2 TH={TH}>📋 About Company</H2>
              <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20 }} className="td-about">
                <div>
                  <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, margin: '0 0 6px' }}>Story</h4>
                  <p style={{ fontSize: 13, color: TH.t2, lineHeight: 1.65, margin: 0 }}>{company.description || 'No description added yet. This business can add their story from the portal.'}</p>
                </div>
                <div style={{ background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 12, padding: 16 }}>
                  <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, margin: '0 0 10px' }}>Services</h4>
                  {cats.length ? cats.map((c, i) => <div key={c} style={{ fontSize: 12.5, color: TH.t2, padding: '5px 0', borderBottom: i < cats.length - 1 ? `1px solid ${TH.line}` : 'none' }}>{c}</div>) : <div style={{ fontSize: 12, color: TH.t3 }}>No services listed</div>}
                </div>
              </div>
            </Card>

            {/* Lead form */}
            {leadForm && (
              <Card TH={TH} style={{ maxWidth: 600, margin: '18px auto 0' }}>
                {submitted ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ fontSize: 44 }}>✅</div><h3 style={{ fontFamily: "'Sora',sans-serif", marginTop: 8 }}>Request Submitted!</h3><p style={{ fontSize: 13, color: TH.t2, marginTop: 4 }}>{company.name} will contact you shortly.</p></div>
                ) : (
                  <form onSubmit={submitLead}>
                    <H2 TH={TH} small>📩 {leadForm.title || 'Get a Quote'}</H2>
                    {customer && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: TH.green }}>✓ {customer.full_name || customer.email}</div>}
                    {questions.map(q => {
                      const inp = { width: '100%', padding: '11px 13px', border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.soft, color: TH.t1, outline: 'none' }
                      return (
                        <div key={q.id} style={{ marginBottom: 13 }}>
                          <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>{q.question}{q.required && <span style={{ color: TH.red }}> *</span>}</label>
                          {q.type === 'text' && <input required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question]: e.target.value }))} style={inp} />}
                          {q.type === 'select' && <select required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(p => ({ ...p, [q.question]: e.target.value }))} style={inp}><option value="">Select</option>{(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}</select>}
                          {q.type === 'radio' && (q.options || []).map((o, i) => <label key={i} style={{ display: 'flex', gap: 7, fontSize: 13, color: TH.t2, marginBottom: 6, cursor: 'pointer' }}><input type="radio" name={q.id} value={o} required={q.required} onChange={() => setAnswers(p => ({ ...p, [q.question]: o }))} />{o}</label>)}
                        </div>
                      )
                    })}
                    <button type="submit" disabled={submitting} style={{ width: '100%', padding: 13, background: submitting ? '#94a3b8' : TH.accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{submitting ? '...' : customer ? 'Submit — Get Quote' : 'Sign in to Submit'}</button>
                  </form>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ============================ REVIEW SECTION (3 col) ============================ */}
        {tab === 'reviews' && (
          <div className="td-tabpane">
            {/* ROW 1: Reviews (6 fixed slots, 3x2) */}
            <Card TH={TH}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[['latest', 'Latest'], ['highest', 'Highest Rated'], ['verified', 'Verified'], ['all', 'All']].map(([k, l]) => <span key={k} onClick={() => { setReviewTab(k); setShowAllReviews(false) }} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, background: reviewTab === k ? TH.t1 : TH.soft, color: reviewTab === k ? TH.card : TH.t2 }}>{l}</span>)}
                </div>
                {!reviewSubmitted && <button onClick={() => { if (requireLogin('review')) setShowReviewForm(true) }} style={{ fontSize: 12, padding: '7px 16px', background: customer ? TH.accent : TH.soft, color: customer ? '#fff' : TH.t2, border: customer ? 'none' : `1px solid ${TH.line}`, borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>{customer ? '+ Write a Review' : '🔐 Sign in to Review'}</button>}
              </div>
              {showReviewForm && customer && (
                <div style={{ border: `1px solid ${TH.line}`, borderRadius: 12, padding: 14, marginBottom: 14, background: TH.soft }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>{[1,2,3,4,5].map(s => <button key={s} onClick={() => setReviewRating(s)} type="button" style={{ fontSize: 26, background: 'none', border: 'none', cursor: 'pointer', color: s <= reviewRating ? TH.gold : TH.line }}>★</button>)}</div>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." style={{ width: '100%', padding: '10px 12px', border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 13, minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', background: TH.card, color: TH.t1, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={submitReview} disabled={submittingReview || !reviewText.trim()} style={{ flex: 1, padding: 10, background: (submittingReview || !reviewText.trim()) ? '#94a3b8' : TH.accent, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{submittingReview ? '...' : 'Submit Review'}</button>
                    <button onClick={() => setShowReviewForm(false)} style={{ flex: 1, padding: 10, background: TH.card, color: TH.t2, border: `1px solid ${TH.line}`, borderRadius: 9, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
              {reviewSubmitted && <div style={{ marginBottom: 14, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13, color: TH.green, fontWeight: 600 }}>✅ Review submitted successfully!</div>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }} className="td-revgrid">
                {Array.from({ length: fixedReviewSlots }).map((_, i) => <ReviewCard key={reviewSlots[i]?.id || 'empty' + i} r={reviewSlots[i]} />)}
              </div>
              {reviewTab !== 'all' && tabReviews.length > 6 && !showAllReviews && (
                <div style={{ textAlign: 'center', marginTop: 14 }}><button onClick={() => setShowAllReviews(true)} style={{ padding: '8px 22px', background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 20, fontSize: 12, fontWeight: 700, color: TH.accent, cursor: 'pointer' }}>View all {tabReviews.length} reviews →</button></div>
              )}
            </Card>

            {/* ROW 2: Sentiment (col1-2) + Mood/Growth (col3) */}
            <Card TH={TH}>
              <H2 TH={TH}>📈 Customer Sentiment Analytics</H2>
              {can('sentiment', plan) ? (() => {
                const dist = [5,4,3,2,1].map(s => reviews.filter(r => r.rating === s).length)
                const maxD = Math.max(...dist, 1)
                const pos = reviews.filter(r => r.rating >= 4).length, neu = reviews.filter(r => r.rating === 3).length, neg = reviews.filter(r => r.rating <= 2).length
                const tot = reviews.length || 1
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }} className="td-sent">
                    <div>
                      <div style={{ display: 'flex', gap: 26, marginBottom: 14 }}>
                        <div><div style={{ fontSize: 12, color: TH.green, fontWeight: 700 }}>● Positive</div><div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, color: TH.green }}>{Math.round(pos / tot * 100)}%</div></div>
                        <div><div style={{ fontSize: 12, color: TH.t2, fontWeight: 700 }}>● Neutral</div><div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800 }}>{Math.round(neu / tot * 100)}%</div></div>
                        <div><div style={{ fontSize: 12, color: TH.red, fontWeight: 700 }}>● Negative</div><div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, color: TH.red }}>{Math.round(neg / tot * 100)}%</div></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 8, color: TH.t3, textAlign: 'right', height: 150, paddingBottom: 22, width: 22 }}>{[100,80,60,40,20,0].map(n => <span key={n}>{n}</span>)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 150, borderBottom: `1px solid ${TH.line}`, borderLeft: `1px solid ${TH.line}`, padding: '0 10px' }}>
                            {[5,4,3,2,1].map((star, i) => (
                              <div key={star} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ fontSize: 9, color: TH.t3 }}>{dist[i]}</div>
                                <div style={{ width: '55%', maxWidth: 26, height: `${Math.max(3, dist[i] / maxD * 100)}%`, background: star >= 4 ? TH.green : star === 3 ? TH.gold : TH.red, borderRadius: '5px 5px 0 0' }} />
                                <div style={{ fontSize: 9, color: TH.t3 }}>{star}★</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontSize: 10, color: TH.t2, flexWrap: 'wrap' }}><span>● Positive (4-5★)</span><span style={{ color: TH.gold }}>● Neutral (3★)</span><span style={{ color: TH.red }}>● Negative (1-2★)</span></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ border: `1px solid ${TH.line}`, borderRadius: 10, padding: 12, marginBottom: 12, background: TH.soft }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Mood Trends</div>
                        <svg width="100%" height="60" viewBox="0 0 140 60" preserveAspectRatio="none"><polyline points="0,46 23,34 46,40 70,22 93,32 116,16 140,20" fill="none" stroke={TH.green} strokeWidth="2" /></svg>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: TH.t3 }}><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span></div>
                      </div>
                      <div style={{ border: `1px solid ${TH.line}`, borderRadius: 10, padding: 12, background: TH.soft }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Review Growth</div>
                        <svg width="100%" height="60" viewBox="0 0 140 60" preserveAspectRatio="none"><polyline points="0,52 28,44 56,34 84,24 112,14 140,6" fill="none" stroke={TH.blue} strokeWidth="2" /></svg>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: TH.t3 }}><span>Mar</span><span>May</span><span>Jul</span></div>
                      </div>
                    </div>
                  </div>
                )
              })() : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 Sentiment Analytics on Gold plan and above</div>}
            </Card>

            {/* ROW 3: Media Gallery (12 fixed, 6x2) */}
            <Card TH={TH}>
              <H2 TH={TH} right={portfolio.length > 12 ? <button onClick={() => setShowAllGallery(true)} style={{ fontSize: 12, fontWeight: 700, color: TH.accent, background: 'none', border: 'none', cursor: 'pointer' }}>View All ({portfolio.length}) →</button> : null}>🖼️ Media Gallery</H2>
              {can('portfolio', plan) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gridTemplateRows: '1fr 1fr', gap: 10 }} className="td-mgal">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const p = portfolio[i]
                    return p
                      ? <img key={i} src={p.image_url} alt={p.title || ''} onClick={() => setLightboxImg(p)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }} onError={e => { e.target.style.display = 'none' }} />
                      : <div key={i} style={{ width: '100%', aspectRatio: '1', borderRadius: 10, background: TH.soft, border: `1px dashed ${TH.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TH.t3, fontSize: 16 }}>🖼️</div>
                  })}
                </div>
              ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 Media Gallery on Silver plan and above</div>}
            </Card>
          </div>
        )}

        {/* ============================ ACHIEVEMENT & BADGE (3 col) ============================ */}
        {tab === 'achievement' && (
          <div className="td-tabpane">
            {/* ROW 1: Achievements (3 fixed) */}
            <Card TH={TH}>
              <H2 TH={TH}>🏅 Achievements &amp; Badges</H2>
              {can('badges', plan) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="td-ach">
                  {Array.from({ length: Math.max(3, badges.length) }).map((_, i) => {
                    const b = badges[i]
                    if (!b) return <div key={i} style={{ border: `1px dashed ${TH.line}`, borderRadius: 12, padding: '26px 14px', textAlign: 'center', background: TH.soft, color: TH.t3, fontSize: 11 }}><div style={{ fontSize: 26, opacity: 0.4 }}>🏅</div><div style={{ marginTop: 8 }}>No badge yet</div></div>
                    const bc = b.style === 'navy' ? '#1a3a5c' : b.style === 'red' ? '#b01e2e' : TH.gold
                    return (
                      <div key={i} style={{ border: `2px solid ${bc}`, borderRadius: 12, padding: '26px 14px', textAlign: 'center', background: TH.dark ? `${bc}1a` : (b.style === 'red' ? 'linear-gradient(180deg,#fdf3f4,#fff)' : b.style === 'navy' ? 'linear-gradient(180deg,#f3f7fc,#fff)' : 'linear-gradient(180deg,#fdfaf0,#fff)') }}>
                        <div style={{ fontSize: 32 }}>{b.icon || '🎖️'}</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, color: TH.dark ? TH.t1 : bc, marginTop: 6 }}>{b.title}</div>
                        {b.subtitle && <div style={{ fontSize: 9.5, color: TH.t2, marginTop: 4, fontStyle: 'italic' }}>{b.subtitle}</div>}
                        <div style={{ marginTop: 8, fontSize: 13, color: bc, letterSpacing: '0.1em' }}>★ ★ ★</div>
                      </div>
                    )
                  })}
                </div>
              ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 Achievements on Silver plan and above</div>}
            </Card>

            {/* ROW 2: Business Insights (3) */}
            <Card TH={TH}>
              <H2 TH={TH}>📊 Business Insights</H2>
              {can('businessInsights', plan) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="td-ins">
                  {[
                    { k: 'Profile Views', v: (company.profile_views || 0) >= 1000 ? (company.profile_views / 1000).toFixed(1) + 'K' : (company.profile_views || 0), c: TH.accent, sp: '0,24 16,18 32,20 48,11 64,5' },
                    { k: 'Total Reviews', v: company.total_reviews || reviews.length, c: TH.blue, sp: '0,22 18,16 36,18 50,10 64,6' },
                    { k: 'Avg Rating', v: (company.avg_rating || '0.0') + '★', c: TH.green, sp: '0,24 22,19 44,13 64,7' },
                  ].map(m => (
                    <div key={m.k} style={{ background: TH.soft, border: `1px solid ${TH.line}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, color: TH.t2, fontWeight: 600 }}>{m.k}</div>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: m.c, margin: '4px 0 8px' }}>{m.v}</div>
                      <svg width="100%" height="30" viewBox="0 0 64 30" preserveAspectRatio="none"><polyline points={m.sp} fill="none" stroke={m.c} strokeWidth="2" /></svg>
                    </div>
                  ))}
                </div>
              ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 Business Insights on Gold plan and above</div>}
            </Card>

            {/* ROW 3: FAQ */}
            <Card TH={TH}>
              <H2 TH={TH}>❓ FAQ Section</H2>
              {can('faq', plan) ? (
                faqs.length ? faqs.map((f, i) => (
                  <div key={f.id} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{ border: `1px solid ${TH.line}`, borderRadius: 10, padding: '13px 15px', marginBottom: 8, cursor: 'pointer', background: TH.soft }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>{f.question}<span style={{ color: TH.t3 }}>{openFaq === i ? '▴' : '▾'}</span></div>
                    {openFaq === i && <div style={{ fontSize: 12, color: TH.t2, marginTop: 8, lineHeight: 1.5 }}>{f.answer}</div>}
                  </div>
                )) : <div style={{ textAlign: 'center', padding: 20, color: TH.t3, fontSize: 12 }}>No FAQs added yet.</div>
              ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>🔒 FAQ on Gold plan and above</div>}
            </Card>

            {/* ROW 4: Related Businesses (6 fixed, rank order) */}
            <Card TH={TH}>
              <H2 TH={TH}>🔗 Related Businesses</H2>
              {can('relatedBusiness', plan) ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }} className="td-rel">
                  {Array.from({ length: Math.max(6, related.length) }).map((_, i) => {
                    const rc = related[i]
                    if (!rc) return <div key={i} style={{ border: `1px dashed ${TH.line}`, borderRadius: 12, padding: 16, textAlign: 'center', background: TH.soft, color: TH.t3, fontSize: 11, minHeight: 78, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</div>
                    return (
                      <div key={i} onClick={() => { if (rc.slug) window.location.href = '/' + rc.slug }} style={{ border: `1px solid ${TH.line}`, borderRadius: 12, padding: 16, background: TH.soft, cursor: 'pointer', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, color: TH.t3, fontWeight: 700 }}>#{i + 1}</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rc.name}</div>
                        <div style={{ color: TH.gold, fontSize: 13 }}>{'★'.repeat(Math.round(rc.avg_rating || 0))} <span style={{ fontWeight: 800, color: TH.t1 }}>{rc.avg_rating || '—'}</span></div>
                        <div style={{ fontSize: 10, color: TH.t3, marginTop: 4 }}>{rc.category || '—'}{rc.is_verified && ' · ✓ Verified'}</div>
                      </div>
                    )
                  })}
                </div>
              ) : <div style={{ textAlign: 'center', padding: 24, color: TH.t3, fontSize: 12, border: `1px dashed ${TH.line}`, borderRadius: 12 }}>No related businesses found.</div>}
            </Card>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '20px 4px 0', borderTop: `1px solid ${TH.line}`, marginTop: 4 }}>
              <div><span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16 }}>Trust<span style={{ color: TH.accent }}>Dubai</span></span><div style={{ fontSize: 11, color: TH.t2, marginTop: 6 }}>Verify Business</div></div>
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
        )}
      </div>

      {/* full gallery modal */}
      {showAllGallery && (
        <div onClick={() => setShowAllGallery(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 280, overflowY: 'auto', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', fontFamily: "'Sora',sans-serif", fontSize: 18 }}>🖼️ {company.name} — Gallery ({portfolio.length})</h3>
              <button onClick={() => setShowAllGallery(false)} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
              {portfolio.map(p => <img key={p.id} src={p.image_url} alt={p.title || ''} onClick={() => setLightboxImg(p)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }} onError={e => { e.target.style.display = 'none' }} />)}
            </div>
          </div>
        </div>
      )}

      {/* lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
            <img src={lightboxImg.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'contain' }} />
            {lightboxImg.title && <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 14, fontFamily: "'Sora',sans-serif" }}>{lightboxImg.title}</div>}
            <button onClick={() => setLightboxImg(null)} style={{ marginTop: 14, padding: '8px 24px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
          </div>
        </div>
      )}

      {/* login modal */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: TH.card, border: `1px solid ${TH.line}`, borderRadius: 18, padding: 30, width: 360, maxWidth: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🔐</div>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, margin: '10px 0 6px', color: TH.t1 }}>{loginFor === 'review' ? 'Sign in to Review' : 'Sign in to Submit'}</h3>
            <p style={{ fontSize: 13, color: TH.t2, marginBottom: 18 }}>Sign in with Google to continue.</p>
            <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, background: TH.card, border: `2px solid ${TH.line}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: TH.t1, marginBottom: 8 }}>
              <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button onClick={() => setShowLoginPrompt(false)} style={{ width: '100%', padding: 9, background: 'none', border: 'none', color: TH.t2, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 920px){
          .td-ov-row1{ grid-template-columns: 1fr !important; }
          .td-ov-row1 > div:first-child{ grid-column: 1 / -1 !important; }
          .td-ov-row1 > div:last-child{ grid-column: 1 / -1 !important; }
          .td-ov-row3{ grid-template-columns: 1fr !important; }
          .td-ov-row3 > div{ grid-column: 1 / -1 !important; }
        }
        @media (max-width: 820px){
          .td-ov-t4{ grid-template-columns: repeat(2,1fr) !important; }
          .td-revgrid{ grid-template-columns: repeat(2,1fr) !important; }
          .td-mgal{ grid-template-columns: repeat(4,1fr) !important; }
          .td-ins, .td-ach, .td-rel{ grid-template-columns: repeat(2,1fr) !important; }
          .td-sent, .td-loc, .td-about{ grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px){
          .td-revgrid{ grid-template-columns: 1fr !important; }
          .td-mgal{ grid-template-columns: repeat(3,1fr) !important; }
          .td-ov-t4, .td-ins, .td-ach, .td-rel{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
