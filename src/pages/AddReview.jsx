import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { signInWithGoogle, getCustomer, upsertCustomer } from '../customerAuth'

export default function AddReview({ navigate, params }) {
  const company = params.company
  const [rating, setRating] = useState(0)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [service, setService] = useState('')
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [customer, setCustomer] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  const labels = ['','Poor','Below average','Average','Good','Excellent']

  useEffect(() => {
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const cust = await upsertCustomer(session.user)
        setCustomer(cust)
        if (cust?.full_name) setName(cust.full_name)
        setAuthLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setCustomer(null)
        setAuthLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkAuth() {
    setAuthLoading(true)
    const cust = await getCustomer()
    setCustomer(cust)
    if (cust?.full_name) setName(cust.full_name)
    setAuthLoading(false)
  }

  async function handleGoogleSignIn() {
    setSigningIn(true)
    await signInWithGoogle()
  }

  async function handleSubmit() {
    if (!rating) return setError('Please select a rating')
    if (!text.trim()) return setError('Please write your review')
    setLoading(true)
    setError('')

    let companyId = company?.id
    if (!companyId && companyName) {
      const { data } = await supabase.from('companies').select('id').ilike('name', companyName).single()
      companyId = data?.id
    }

    if (!companyId) {
      setLoading(false)
      return setError('Company not found. Please register it first.')
    }

    const { data: reviewData, error: reviewError } = await supabase.from('reviews').insert({
      company_id: companyId,
      reviewer_name: name || customer?.full_name || 'Anonymous',
      reviewer_email: customer?.email || null,
      customer_id: customer?.id || null,
      rating,
      review_text: text,
      service_type: service,
    }).select().single()

    if (reviewError) { setLoading(false); return setError('Failed to submit. Please try again.') }

    for (const photo of photos) {
      const fileName = `${reviewData.id}_${Date.now()}_${photo.name}`
      const { data: uploadData } = await supabase.storage.from('review-photos').upload(fileName, photo)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('review-photos').getPublicUrl(fileName)
        await supabase.from('review_photos').insert({ review_id: reviewData.id, photo_url: urlData.publicUrl })
      }
    }

    setLoading(false)
    setSuccess(true)
  }

  // ── AUTH LOADING ──
  if (authLoading) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:28, height:28, border:'2.5px solid var(--primary)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── LOGIN GATE — not logged in ──
  if (!customer) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-primary)', position:'sticky', top:0, zIndex:100 }}>
          <button onClick={() => company ? navigate('company',{company}) : navigate('home')}
            style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text-secondary)' }}>
            <i className="ti ti-arrow-left"/>
          </button>
          <span style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>Write a Review</span>
          <div style={{ width:32 }}/>
        </div>

        {/* Login Gate */}
        <div style={{ padding:'40px 24px', textAlign:'center', maxWidth:400, margin:'0 auto' }}>

          {/* Company info */}
          {company && (
            <div style={{ background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'10px 12px', marginBottom:28, textAlign:'left' }}>
              <p style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:2 }}>Reviewing</p>
              <p style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>{company.name}</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{company.category} · {company.area}</p>
            </div>
          )}

          {/* Lock icon */}
          <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(0,153,204,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="ti ti-user-check" style={{ fontSize:28, color:'#0099cc' }}/>
          </div>

          <h2 style={{ fontSize:18, fontWeight:600, color:'var(--text-primary)', marginBottom:8 }}>Sign in to write a review</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:28 }}>
            To keep reviews authentic and trustworthy, we require a verified account before submitting.
          </p>

          {/* Benefits */}
          <div style={{ background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:28, textAlign:'left' }}>
            {[
              { icon:'ti-shield-check', text:'Verified reviews only — no fake reviews' },
              { icon:'ti-history',      text:'Track all your past reviews in one place' },
              { icon:'ti-bell',         text:'Get notified when businesses reply' },
            ].map((b,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:i<2?'0.5px solid var(--border-default)':'none' }}>
                <i className={`ti ${b.icon}`} style={{ fontSize:15, color:'#0099cc', flexShrink:0 }}/>
                <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Google Sign In button */}
          <button onClick={handleGoogleSignIn} disabled={signingIn}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'13px 20px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, fontSize:14, fontWeight:500, color:'#374151', cursor:signingIn?'not-allowed':'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', opacity:signingIn?0.7:1, marginBottom:12 }}>
            {signingIn ? (
              <div style={{ width:18, height:18, border:'2px solid #e2e8f0', borderTopColor:'#374151', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {signingIn ? 'Redirecting...' : 'Continue with Google'}
          </button>

          <p style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
            By signing in, you agree to our Terms of Service and Privacy Policy. Your review will be published under your name.
          </p>
        </div>
      </div>
    )
  }

  // ── SUCCESS ──
  if (success) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh' }}>
        <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid var(--border-default)' }}>
          <button onClick={() => navigate('home')} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text-secondary)' }}>
            <i className="ti ti-arrow-left"/>
          </button>
        </div>
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:52, color:'var(--green)', marginBottom:16 }}>
            <i className="ti ti-circle-check"/>
          </div>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:8, color:'var(--text-primary)' }}>Review submitted!</div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:24 }}>Thank you for your honest review. It helps others make better decisions.</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => navigate('customer-profile')}
              style={{ padding:'11px 20px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'1px solid var(--border-default)', borderRadius:24, fontSize:13, cursor:'pointer' }}>
              My Reviews
            </button>
            <button onClick={() => navigate('home')}
              style={{ padding:'11px 24px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:24, fontSize:14, cursor:'pointer' }}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── REVIEW FORM (logged in) ──
  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-primary)', position:'sticky', top:0, zIndex:100 }}>
        <button onClick={() => company ? navigate('company',{company}) : navigate('home')}
          style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left"/>
        </button>
        <span style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>Write a Review</span>
        {/* Customer avatar */}
        <button onClick={() => navigate('customer-profile')}
          style={{ width:30, height:30, borderRadius:'50%', background:'#0099cc', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
          {customer?.avatar_url
            ? <img src={customer.avatar_url} alt="" style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }}/>
            : (customer?.full_name||'U')[0].toUpperCase()
          }
        </button>
      </div>

      <div style={{ padding:16 }}>
        {/* Logged in as */}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(0,153,204,0.08)', border:'0.5px solid rgba(0,153,204,0.25)', borderRadius:'var(--radius-lg)', padding:'8px 12px', marginBottom:14 }}>
          <i className="ti ti-circle-check" style={{ fontSize:14, color:'#0099cc', flexShrink:0 }}/>
          <span style={{ fontSize:11, color:'#0099cc' }}>Reviewing as <strong>{customer.full_name||customer.email}</strong></span>
        </div>

        {company && (
          <div style={{ background:'var(--bg-secondary)', borderRadius:'var(--radius-lg)', padding:'10px 12px', marginBottom:16 }}>
            <p style={{ fontSize:11, color:'var(--text-secondary)' }}>Reviewing</p>
            <p style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>{company.name}</p>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>{company.category} · {company.area}</p>
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Your rating *</label>
          <div style={{ display:'flex', gap:6, marginBottom:4 }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} onClick={() => setRating(i)} style={{ fontSize:30, cursor:'pointer', color:i<=rating?'var(--amber)':'var(--border-default)', transition:'color 0.15s' }}>★</span>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>{rating ? labels[rating] : 'Tap to rate'}</p>
        </div>

        {!company && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Company name *</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="Which company are you reviewing?"
              style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--radius)', fontSize:13, outline:'none', background:'var(--bg-secondary)', color:'var(--text-primary)' }}/>
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Your name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional"
            style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--radius)', fontSize:13, outline:'none', background:'var(--bg-secondary)', color:'var(--text-primary)' }}/>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Your review *</label>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Quality of work, timeline, communication, value for money..."
            style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--radius)', fontSize:13, outline:'none', minHeight:80, resize:'vertical', background:'var(--bg-secondary)', color:'var(--text-primary)' }}/>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>
            Add photos <span style={{ fontWeight:400, color:'var(--text-muted)' }}>(optional)</span>
          </label>
          <label style={{ display:'block', border:'1.5px dashed var(--border-default)', borderRadius:'var(--radius-lg)', padding:16, textAlign:'center', cursor:'pointer', background:'var(--bg-secondary)' }}>
            <i className="ti ti-camera" style={{ fontSize:24, color:'var(--text-muted)' }}/>
            <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:6 }}>Tap to add photos</p>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>Before/after, finished work, etc.</p>
            <input type="file" multiple accept="image/*" style={{ display:'none' }}
              onChange={e => setPhotos([...photos, ...e.target.files])}/>
          </label>
          {photos.length > 0 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              {photos.map((f,i) => (
                <div key={i} style={{ position:'relative' }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width:60, height:60, borderRadius:6, objectFit:'cover' }}/>
                  <span onClick={() => setPhotos(photos.filter((_,j) => j!==i))} style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'var(--red)', color:'#fff', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>Service type</label>
          <select value={service} onChange={e => setService(e.target.value)}
            style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--radius)', fontSize:13, outline:'none', background:'var(--bg-secondary)', color:'var(--text-primary)' }}>
            <option value="">Select service</option>
            {['Interior Design','Renovation','AC Service','Plumbing','Cleaning','Painting','Electrical','Handyman'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {error && <p style={{ color:'var(--red)', fontSize:13, marginBottom:10 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{ width:'100%', padding:12, background:loading?'var(--text-muted)':'var(--primary)', color:'#fff', border:'none', borderRadius:24, fontSize:14, fontWeight:500, cursor:loading?'not-allowed':'pointer' }}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  )
}
