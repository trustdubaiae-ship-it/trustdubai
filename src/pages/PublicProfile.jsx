import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'

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

export default function PublicProfile() {
  const { slug } = useParams()
  const [company, setCompany] = useState(null)
  const [reviews, setReviews] = useState([])
  const [leadForm, setLeadForm] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [customer, setCustomer] = useState(undefined) // undefined = loading, null = not logged in
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginFor, setLoginFor] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  useEffect(() => {
    fetchCompany()
    checkCustomer()
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

  async function fetchCompany() {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'approved')
      .single()
    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCompany(data)

    const [reviewRes, formRes] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, reviewer_name, rating, review_text, owner_reply, replied_at, created_at')
        .eq('company_id', data.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('lead_forms')
        .select('*')
        .eq('company_id', data.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
    ])

    const reviewData = reviewRes.data || []
    setReviews(reviewData)

    if (formRes.data) {
      setLeadForm(formRes.data)
      const { data: qData } = await supabase
        .from('lead_form_questions')
        .select('*')
        .eq('form_id', formRes.data.id)
        .order('order_num')
      setQuestions(qData || [])
    }

    const avgRating = reviewData.length > 0
      ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1)
      : null
    const seoTitle = data.name + ' — ' + (data.category || 'Business') + ' Dubai | TrustDubai'
    const seoDesc = (data.description ? data.description.slice(0, 140) : data.name + ' is a verified ' + (data.category || 'business') + ' in Dubai.')
      + (avgRating ? ' Rated ' + avgRating + '/5.' : '') + ' Contact on TrustDubai.'
    setSEO({ title: seoTitle, description: seoDesc, image: 'https://trustdubai.ae/og-image.png', url: 'https://trustdubai.ae/' + slug })
    setJsonLD(data, reviewData)
    setLoading(false)
  }

  function requireLogin(forWhat) {
    // Abhi bhi load ho raha hai — wait karo
    if (customer === undefined) return false
    // Logged in hai
    if (customer !== null) return true
    // Logged in nahi — prompt dikhao
    setLoginFor(forWhat)
    setShowLoginPrompt(true)
    return false
  }

  async function submitLead(e) {
    e.preventDefault()
    if (!requireLogin('lead')) return
    setSubmitting(true)
    const name = customer?.full_name || answers['Your name'] || ''
    const phone = answers['Your phone number'] || answers['phone'] || ''
    const email = customer?.email || answers['Email'] || ''
    await supabase.from('lead_submissions').insert({
      form_id: leadForm.id, company_id: company.id,
      name, phone, email, answers, source_url: window.location.href,
    })
    await supabase.rpc('increment_leads', { p_company_id: company.id })
    if (company.whatsapp) {
      const msg = [
        '🏢 *New Lead from TrustDubai*', '',
        '👤 Name: ' + (name || 'Not provided'),
        '📞 Phone: ' + (phone || 'Not provided'),
        '✉️ Email: ' + (email || 'Not provided'), '',
        '📋 *Answers:*',
        ...Object.entries(answers).map(([q, a]) => '• ' + q + ': ' + a), '',
        '🔗 Via: trustdubai.ae/' + slug,
        '⏰ ' + new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' }) + ' Dubai',
      ].join('\n')
      window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank')
    }
    setSubmitting(false)
    setSubmitted(true)
  }

  async function submitReview(e) {
    e.preventDefault()
    if (!requireLogin('review')) return
    setSubmittingReview(true)
    await supabase.from('reviews').insert({
      company_id: company.id,
      reviewer_name: customer.full_name || customer.email,
      reviewer_email: customer.email,
      customer_id: customer.id,
      rating: reviewRating,
      review_text: reviewText,
      is_approved: false,
    })
    setSubmittingReview(false)
    setReviewSubmitted(true)
    setShowReviewForm(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>Loading...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#111827' }}>Company not found</h2>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: '#03C1F5', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
          Go to TrustDubai
        </button>
      </div>
    </div>
  )

  const initials = company.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = ['#1a73e8', '#1e8e3e', '#d93025', '#f9a825', '#9c27b0', '#00897b']
  const color = colors[company.name?.charCodeAt(0) % colors.length]

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#03C1F5', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#fff"/>
            <path d="M16 4L26 8L26 17C26 22.5 21.5 27 16 28C10.5 27 6 22.5 6 17L6 8Z" fill="#03C1F5" opacity="0.3"/>
            <polyline points="11.5,16 14.5,19.5 20.5,13" fill="none" stroke="#03C1F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>TrustDubai</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {customer === undefined ? (
            <div style={{ width: 60, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: 20 }} />
          ) : customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>
                {(customer.full_name || customer.email)[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#fff', opacity: 0.9 }}>{customer.full_name || customer.email.split('@')[0]}</span>
              <button onClick={() => { signOut(); setCustomer(null) }} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => signInWithGoogle()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#374151', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '32px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, background: color + '22', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>
              {company.logo_url
                ? <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
                : initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{company.name}</h1>
                {company.is_verified && <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, border: '1px solid #a7f3d0' }}>✓ Verified</span>}
                {company.plan && company.plan !== 'free' && (
                  <span style={{ background: company.plan === 'platinum' ? '#f5f3ff' : company.plan === 'gold' ? '#fffdf7' : '#f1f5f9', color: company.plan === 'platinum' ? '#8b5cf6' : company.plan === 'gold' ? '#e8b84b' : '#94a3b8', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99 }}>
                    {company.plan === 'platinum' ? '💎' : company.plan === 'gold' ? '🥇' : '🥈'} {company.plan.charAt(0).toUpperCase() + company.plan.slice(1)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {company.category && <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>{company.category}</span>}
                {company.location && <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>📍 {company.location}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{company.avg_rating || '0.0'}</div>
              <div style={{ color: '#f9a825', fontSize: 16, marginTop: 2 }}>{'★'.repeat(Math.round(company.avg_rating || 0))}{'☆'.repeat(5 - Math.round(company.avg_rating || 0))}</div>
            </div>
            <div style={{ width: 1, height: 40, background: '#e5e7eb' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{company.total_reviews || reviews.length} Reviews</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>From verified customers</div>
            </div>
            {company.whatsapp && (
              <>
                <div style={{ width: 1, height: 40, background: '#e5e7eb', marginLeft: 'auto' }} />
                <button onClick={() => window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, ''), '_blank')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#25D366', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                  💬 WhatsApp
                </button>
              </>
            )}
          </div>
          {company.description && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{company.description}</p>}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 0' }}>

        {/* Lead Form */}
        {leadForm && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 24 }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#111827' }}>Request Submitted!</h3>
                <p style={{ fontSize: 14, color: '#6b7280' }}>{company.name} will contact you shortly.</p>
                <div style={{ marginTop: 12, display: 'inline-block', background: '#e0f9ff', color: '#03C1F5', fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 99 }}>Lead from TrustDubai</div>
              </div>
            ) : (
              <form onSubmit={submitLead}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: '#111827' }}>{leadForm.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Fill this form — {company.name} will respond shortly</p>
                {customer && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#065f46' }}>
                    ✓ Logged in as <strong>{customer.full_name || customer.email}</strong>
                  </div>
                )}
                {questions.map(q => (
                  <div key={q.id} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                      {q.question}{q.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                    </label>
                    {q.type === 'text' && <input required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.question]: e.target.value }))} placeholder="Your answer..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />}
                    {q.type === 'select' && <select required={q.required} value={answers[q.question] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q.question]: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}><option value="">Select an option</option>{(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}</select>}
                    {q.type === 'radio' && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{(q.options || []).map((o, i) => <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#374151', cursor: 'pointer' }}><input type="radio" name={q.id} value={o} required={q.required} onChange={() => setAnswers(prev => ({ ...prev, [q.question]: o }))} />{o}</label>)}</div>}
                  </div>
                ))}
                <button type="submit" disabled={submitting} style={{ width: '100%', padding: '12px', background: submitting ? '#9ca3af' : '#03C1F5', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Submitting...' : customer ? 'Submit — Get Quote' : 'Sign in to Submit'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#9ca3af' }}>Powered by TrustDubai</div>
              </form>
            )}
          </div>
        )}

        {/* Reviews Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Customer Reviews</h2>
          {!reviewSubmitted && (
            <button
              onClick={() => { if (requireLogin('review')) setShowReviewForm(true) }}
              style={{ padding: '7px 16px', background: customer ? '#03C1F5' : '#f3f4f6', color: customer ? '#fff' : '#374151', border: customer ? 'none' : '1px solid #e5e7eb', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {customer ? '+ Write a Review' : '🔐 Sign in to Review'}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && customer && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111827' }}>Write a Review</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Your Rating</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)} type="button"
                    style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', color: s <= reviewRating ? '#f9a825' : '#d1d5db' }}>★</button>
                ))}
              </div>
            </div>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
              placeholder="Share your experience..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, minHeight: 100, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitReview} disabled={submittingReview}
                style={{ flex: 1, padding: '10px', background: '#03C1F5', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
              <button onClick={() => setShowReviewForm(false)}
                style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 20, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {reviewSubmitted && (
          <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#065f46' }}>Review submitted — pending approval</div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <p style={{ fontSize: 14, color: '#6b7280' }}>No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                      {(r.reviewer_name || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{r.reviewer_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric', day: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ color: '#f9a825', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                </div>
                {r.review_text && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 10px 0' }}>{r.review_text}</p>}
                {r.owner_reply && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      💬 Owner Reply
                      {r.replied_at && <span style={{ fontWeight: 400, color: '#6b7280' }}>· {new Date(r.replied_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                    <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{r.owner_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
              {loginFor === 'review' ? 'Sign in to Write a Review' : 'Sign in to Submit Inquiry'}
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
              {loginFor === 'review'
                ? 'We verify reviews to ensure authenticity. Sign in with Google to leave a genuine review.'
                : 'Sign in to submit your inquiry. This helps companies verify genuine leads.'}
            </p>
            <button onClick={() => signInWithGoogle()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10, color: '#374151' }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={() => setShowLoginPrompt(false)} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>Powered by TrustDubai · Your data is secure</div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: 12 }}>
        <button onClick={() => window.location.href = '/'} style={{ color: '#03C1F5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 12 }}>TrustDubai</button>
        {' — Building trust in Dubai\'s business community'}
      </div>
    </div>
  )
}
