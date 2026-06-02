import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'
import CompanyCard from '../components/CompanyCard'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'

const MAP_PINS = [
  { top: '30%', left: '34%' }, { top: '44%', left: '52%' },
  { top: '56%', left: '22%' }, { top: '22%', left: '66%' },
  { top: '60%', left: '70%' }, { top: '34%', left: '80%' },
  { top: '50%', left: '42%' },
]

function useDevice() {
  function getDevice() {
    if (typeof window === 'undefined') return 'desktop'
    const w = document.documentElement.clientWidth
    if (w >= 1025) return 'desktop'
    if (w >= 481)  return 'tablet'
    return 'mobile'
  }
  const [device, setDevice] = useState(getDevice)
  useEffect(() => {
    function detect() { setDevice(getDevice()) }
    window.addEventListener('resize', detect)
    return () => window.removeEventListener('resize', detect)
  }, [])
  return device
}

function Logo({ size = 15 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', lineHeight: 1, flexShrink: 0 }}>
      <span style={{ fontSize: size, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Trust</span>
      <span style={{ fontSize: size, fontWeight: 700, color: '#0099cc', letterSpacing: '-0.3px' }}>Dubai</span>
      <span style={{ fontSize: size * 0.38, color: '#0099cc', marginLeft: 1, lineHeight: 1, verticalAlign: 'super' }}>●</span>
    </div>
  )
}

/* ============ GET QUOTES BUTTON (reusable) ============ */
function GetQuotesButton({ onClick, mobile }) {
  return (
    <button onClick={onClick}
      style={{ width:'100%', maxWidth: mobile?'100%':440, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
        background:'#0099cc', color:'#fff', border:'none', borderRadius:mobile?10:12, padding:mobile?'11px':'13px',
        fontSize:mobile?13:14.5, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(0,153,204,0.3)', transition:'all 0.15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,153,204,0.4)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px rgba(0,153,204,0.3)' }}>
      <i className="ti ti-sparkles" style={{ fontSize:mobile?14:16 }} /> Get 3 Free Quotes
    </button>
  )
}

/* ============ LEAD QUOTE MODAL ============ */
function LeadQuoteModal({ open, onClose, customer, mobile }) {
  const [form, setForm]         = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (open) { loadForm(); setDone(false); setAnswers({}); setError('') }
  }, [open])

  async function loadForm() {
    setLoading(true)
    try {
      const { data: f } = await supabase
        .from('lead_forms')
        .select('*')
        .eq('is_platform', true)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (!f) { setForm(null); setLoading(false); return }
      setForm(f)
      const { data: qs } = await supabase
        .from('lead_form_questions')
        .select('*')
        .eq('form_id', f.id)
        .order('order_num', { ascending: true })
      setQuestions(qs || [])
      // categories for service_category dropdown
      const { data: cats } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setCategories((cats || []).map(c => c.name))
      // track view + increment view_count
      await supabase.from('lead_form_views').insert({ form_id: f.id, source_url: 'home' })
      await supabase.from('lead_forms').update({ view_count: (f.view_count || 0) + 1 }).eq('id', f.id)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setAns(qid, val) { setAnswers(prev => ({ ...prev, [qid]: val })) }

  function toggleMulti(qid, opt) {
    setAnswers(prev => {
      const cur = Array.isArray(prev[qid]) ? prev[qid] : []
      return { ...prev, [qid]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] }
    })
  }

  function optionsFor(q) {
    if ((q.question || '').toLowerCase().includes('service category') && (!q.options || !q.options.length)) return categories
    return Array.isArray(q.options) ? q.options : []
  }

  async function submit() {
    // required check
    for (const q of questions) {
      if (q.required) {
        const a = answers[q.id]
        if (a == null || a === '' || (Array.isArray(a) && a.length === 0)) {
          setError('Please fill: ' + q.question); return
        }
      }
    }
    setError('')
    setSubmitting(true)
    try {
      const answerObj = {}
      questions.forEach(q => { answerObj[q.question] = answers[q.id] ?? '' })
      const { error: insErr } = await supabase.from('lead_submissions').insert({
        form_id: form.id,
        name: customer.full_name || customer.email?.split('@')[0] || 'Customer',
        phone: customer.phone || '',
        email: customer.email || '',
        answers: answerObj,
        source_url: 'home',
        customer_id: customer.id || null,
        status: 'new',
      })
      if (insErr) throw insErr
      await supabase.from('lead_forms').update({ submit_count: (form.submit_count || 0) + 1 }).eq('id', form.id)
      setDone(true)
    } catch (e) { console.error(e); setError('Something went wrong. Please try again.') }
    finally { setSubmitting(false) }
  }

  if (!open) return null

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:3000, display:'flex',
    alignItems: mobile ? 'flex-end' : 'center', justifyContent:'center' }
  const sheet = { background:'var(--bg-card)', border:'0.5px solid var(--border-default)',
    borderRadius: mobile ? '18px 18px 0 0' : 14, padding: mobile ? '14px 16px 22px' : 24,
    width: mobile ? '100%' : 400, maxWidth: mobile ? '100%' : '92vw', maxHeight:'88vh', overflowY:'auto' }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        {mobile && <div style={{ width:34, height:4, background:'var(--border-default)', borderRadius:99, margin:'0 auto 12px' }} />}

        {done ? (
          <div style={{ textAlign:'center', padding:'18px 0 8px' }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <i className="ti ti-check" style={{ fontSize:28, color:'#10b981' }} />
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Request received!</div>
            <div style={{ fontSize:12.5, color:'var(--text-muted)', lineHeight:1.5, marginBottom:18 }}>
              We're matching you with top trusted companies. You'll hear from them shortly.
            </div>
            <button onClick={onClose}
              style={{ padding:'10px 22px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'0.5px solid var(--border-default)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{form?.title || 'Get Free Quotes'}</div>
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:18, lineHeight:1 }}>×</button>
            </div>
            <div style={{ fontSize:11.5, color:'var(--text-muted)', marginBottom:16 }}>
              {form?.description || "Answer a few questions — we'll match you with up to 3 trusted companies."}
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:30, color:'var(--text-muted)', fontSize:13 }}>
                <div style={{ width:28, height:28, border:'3px solid #0099cc', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Loading...
              </div>
            ) : !form ? (
              <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)', fontSize:13 }}>
                Quote requests are not available right now. Please try again later.
              </div>
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:13, marginBottom:14 }}>
                  {questions.map(q => {
                    const opts = optionsFor(q)
                    return (
                      <div key={q.id}>
                        <div style={{ fontSize:11.5, color:'var(--text-secondary)', marginBottom:5, fontWeight:600 }}>
                          {q.question}{q.required && <span style={{ color:'#ef4444' }}> *</span>}
                        </div>
                        {q.help_text && <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:5 }}>{q.help_text}</div>}

                        {(q.type === 'dropdown') && (
                          <select value={answers[q.id] || ''} onChange={e => setAns(q.id, e.target.value)}
                            style={inpStyle}>
                            <option value="">Select...</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}

                        {(q.type === 'multiselect') && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {opts.map(o => {
                              const on = Array.isArray(answers[q.id]) && answers[q.id].includes(o)
                              return (
                                <button key={o} onClick={() => toggleMulti(q.id, o)}
                                  style={{ fontSize:11.5, padding:'7px 12px', borderRadius:99, cursor:'pointer',
                                    border:`0.5px solid ${on ? '#0099cc' : 'var(--border-default)'}`,
                                    background: on ? '#0099cc' : 'var(--bg-secondary)', color: on ? '#fff' : 'var(--text-primary)' }}>
                                  {o}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {(q.type === 'yesno') && (
                          <div style={{ display:'flex', gap:8 }}>
                            {['Yes','No'].map(o => {
                              const on = answers[q.id] === o
                              return (
                                <button key={o} onClick={() => setAns(q.id, o)}
                                  style={{ flex:1, fontSize:12.5, padding:'9px', borderRadius:8, cursor:'pointer',
                                    border:`0.5px solid ${on ? '#0099cc' : 'var(--border-default)'}`,
                                    background: on ? '#0099cc' : 'var(--bg-secondary)', color: on ? '#fff' : 'var(--text-primary)', fontWeight:600 }}>
                                  {o}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {(q.type === 'textarea') && (
                          <textarea value={answers[q.id] || ''} onChange={e => setAns(q.id, e.target.value)}
                            placeholder={q.placeholder || ''} rows={3} style={{ ...inpStyle, resize:'none', fontFamily:'inherit' }} />
                        )}

                        {(q.type === 'text' || q.type === 'number' || q.type === 'phone' || q.type === 'email') && (
                          <input
                            type={q.type === 'number' ? 'number' : q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : 'text'}
                            value={answers[q.id] || ''} onChange={e => setAns(q.id, e.target.value)}
                            placeholder={q.placeholder || ''} style={inpStyle} />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div style={{ background:'#f0faff', border:'0.5px solid #b3d9f0', borderRadius:8, padding:'8px 11px', fontSize:10.5, color:'#0077aa', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                  <i className="ti ti-user-check" style={{ fontSize:13 }} />
                  Signed in as {customer.full_name || customer.email?.split('@')[0]} — name &amp; phone auto-attached
                </div>

                {error && <div style={{ fontSize:11.5, color:'#dc2626', marginBottom:10 }}>{error}</div>}

                <button onClick={submit} disabled={submitting}
                  style={{ width:'100%', padding:'12px', background:'#0099cc', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', opacity:submitting?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  {submitting
                    ? <><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Submitting...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>
                    : <><i className="ti ti-send" style={{ fontSize:14 }}/> Submit request</>
                  }
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
const inpStyle = { width:'100%', padding:'10px 12px', background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:12.5, color:'var(--text-primary)', outline:'none', boxSizing:'border-box' }

function TrustWave({ score }) {
  const bars = [4,8,12,6,10,14,8,5,11,7,9,13,6,10,8,12,5,9,11,7,8,11,7,13]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:8, padding:'5px 10px', marginBottom:8 }}>
      <i className="ti ti-heart-rate-monitor" style={{ fontSize:11, color:'#0099cc' }} />
      <span style={{ fontSize:8, color:'var(--text-muted)', whiteSpace:'nowrap' }}>Platform Trust Score</span>
      <div style={{ flex:1, display:'flex', alignItems:'center', gap:1, height:14 }}>
        {bars.map((h,i) => <div key={i} style={{ width:2, height:h, background:'#0099cc', borderRadius:1, opacity:0.6 }} />)}
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:'#0099cc', minWidth:44 }}>{score}/100</span>
    </div>
  )
}

function CityMap({ height = 100 }) {
  return (
    <div style={{ background:'linear-gradient(135deg, #e8f4fd, #dbeafe)', borderRadius:8, position:'relative', overflow:'hidden', height }}>
      <div style={{ position:'absolute', inset:0, opacity:0.1, backgroundImage:'linear-gradient(#0099cc 1px, transparent 1px), linear-gradient(90deg, #0099cc 1px, transparent 1px)', backgroundSize:'16px 16px' }} />
      <div style={{ position:'relative', fontSize:8, fontWeight:700, color:'#0077aa', padding:'8px 10px 4px' }}>🗺️ Dubai Service Heatmap</div>
      {MAP_PINS.map((pin,i) => (
        <div key={i} style={{ position:'absolute', top:pin.top, left:pin.left, width:8, height:8, background:'#0099cc', borderRadius:'50%', border:'1.5px solid #fff' }} />
      ))}
    </div>
  )
}

function ReviewGraph({ data }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'10px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-chart-line" style={{ fontSize:11, color:'#0099cc' }} />
          <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.04em', textTransform:'uppercase' }}>Reviews This Month</span>
          <span style={{ fontSize:8, color:'var(--text-muted)' }}>— star-wise trend</span>
        </div>
        <span style={{ fontSize:8, color:'var(--text-muted)' }}>
          {new Date().toLocaleString('en-AE',{month:'long',year:'numeric'})} · {data.total} total
        </span>
      </div>
      <div style={{ display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' }}>
        {[['#10b981','5★'],['#0099cc','4★'],['#f5a623','3★'],['#f97316','2★'],['#ef4444','1★']].map(([c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:8.5, color:'var(--text-muted)' }}>
            <div style={{ width:12, height:3, background:c, borderRadius:99 }} />{l}
          </div>
        ))}
      </div>
      <div style={{ position:'relative', height:80 }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:16, display:'flex', flexDirection:'column', justifyContent:'space-between', width:22 }}>
          {['30','15','0'].map(l => <span key={l} style={{ fontSize:7, color:'var(--text-muted)' }}>{l}</span>)}
        </div>
        <div style={{ position:'absolute', left:24, right:0, top:0, bottom:16 }}>
          <svg width="100%" height="100%" viewBox="0 0 540 64" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g5h" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0,21,43,64].map(y => <line key={y} x1="0" y1={y} x2="540" y2={y} stroke="var(--border-default)" strokeWidth="0.5"/>)}
            <path d="M0,56 27,51 54,46 81,41 108,36 135,30 162,24 189,19 216,15 243,11 270,9 297,7 324,5 351,4 378,3 405,2 432,2 459,1 486,1 513,1 540,1 L540,64 L0,64 Z" fill="url(#g5h)"/>
            <polyline points="0,56 27,51 54,46 81,41 108,36 135,30 162,24 189,19 216,15 243,11 270,9 297,7 324,5 351,4 378,3 405,2 432,2 459,1 486,1 513,1 540,1" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <polyline points="0,58 27,57 54,55 81,53 108,51 135,49 162,47 189,45 216,43 243,42 270,40 297,38 324,36 351,35 378,33 405,32 432,31 459,30 486,29 513,29 540,28" fill="none" stroke="#0099cc" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="540" cy="1" r="2.5" fill="#10b981"/>
            <circle cx="540" cy="28" r="2" fill="#0099cc"/>
          </svg>
        </div>
        <div style={{ position:'absolute', left:24, right:0, bottom:0, display:'flex', justifyContent:'space-between' }}>
          {['1','7','14','21','30'].map(l => <span key={l} style={{ fontSize:7, color:'var(--text-muted)' }}>{l}</span>)}
        </div>
      </div>
      <div style={{ display:'flex', gap:6, marginTop:9, flexWrap:'wrap' }}>
        {[
          { label:'★★★★★', count:data.s5, up:data.s5_pct, bg:'#f0fdf4', border:'#a7f3d0', color:'#065f46' },
          { label:'★★★★',  count:data.s4, up:data.s4_pct, bg:'#e0f9ff', border:'#b3d9f0', color:'#0077aa' },
          { label:'★★★',   count:data.s3, bg:'#fef9ed', border:'#fcd34d', color:'#92400e' },
          { label:'★★',    count:data.s2, bg:'#fff7ed', border:'#fed7aa', color:'#9a3412' },
          { label:'★',     count:data.s1, bg:'#fef2f2', border:'#fca5a5', color:'#991b1b' },
        ].map(p => (
          <div key={p.label} style={{ display:'flex', alignItems:'center', gap:4, background:p.bg, border:`0.5px solid ${p.border}`, borderRadius:5, padding:'3px 8px' }}>
            <span style={{ fontSize:8, color:p.color, fontWeight:700 }}>{p.label}</span>
            <span style={{ fontSize:8, color:p.color, fontWeight:600 }}>{p.count}</span>
            {p.up > 0 && <span style={{ fontSize:7.5, color:p.color }}>↑{p.up}%</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function RightPanel({ recentReviews }) {
  const [email,           setEmail]           = useState('')
  const [subscribed,      setSubscribed]       = useState(false)
  const [sponsoredCos,    setSponsoredCos]     = useState([])
  const [quoteModal,      setQuoteModal]       = useState(null)
  const [quoteForm,       setQuoteForm]        = useState({ name:'', phone:'', message:'' })
  const [quoteSubmitting, setQuoteSubmitting]  = useState(false)
  const [quoteDone,       setQuoteDone]        = useState(false)

  const fallbackReviews = [
    { id:1, reviewer_name:'M. Ahmed',     rating:5, review_text:'Incredible job! Highly recommend.' },
    { id:2, reviewer_name:'S. Hassan',    rating:4, review_text:'Amazing design, professional team.' },
    { id:3, reviewer_name:'F. Al Rashid', rating:5, review_text:'Fast service, great response time!' },
  ]
  const reviews = recentReviews.length>0 ? recentReviews : fallbackReviews

  useEffect(() => { fetchSponsoredSlots() }, [])

  async function fetchSponsoredSlots() {
    try {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('sponsor_slots')
        .select('id,slot_number,company_id,companies(id,name,category,avg_rating,plan,area)')
        .eq('status','active')
        .lte('starts_at', now)
        .gte('expires_at', now)
        .order('slot_number')
        .limit(3)
      if (data?.length > 0) {
        setSponsoredCos(data)
        const viewEvents = data.map(s=>({ slot_id:s.id, company_id:s.company_id, event_type:'view', source_page:'home' }))
        await supabase.from('sponsor_analytics').insert(viewEvents)
      }
    } catch(e) { console.error(e) }
  }

  async function trackClick(slot) {
    try {
      await supabase.from('sponsor_analytics').insert({ slot_id:slot.id, company_id:slot.company_id, event_type:'click', source_page:'home' })
    } catch(e) { console.error(e) }
  }

  async function submitQuote() {
    if (!quoteForm.name||!quoteForm.phone) { alert('Name aur phone required!'); return }
    setQuoteSubmitting(true)
    try {
      await supabase.from('sponsor_analytics').insert({
        slot_id:      quoteModal.slot_id,
        company_id:   quoteModal.company_id,
        event_type:   'quote_request',
        source_page:  'home',
        lead_name:    quoteForm.name,
        lead_phone:   quoteForm.phone,
        lead_message: quoteForm.message,
      })
      setQuoteDone(true)
      setTimeout(() => { setQuoteModal(null); setQuoteDone(false); setQuoteForm({ name:'', phone:'', message:'' }) }, 2500)
    } catch(e) { console.error(e) }
    finally { setQuoteSubmitting(false) }
  }

  const fallbackSponsors = [
    { id:'f1', slot_number:1, company_id:'f1', companies:{ name:'Jaguar Interiors',  category:'Luxury Interior Design',   avg_rating:'4.9' }},
    { id:'f2', slot_number:2, company_id:'f2', companies:{ name:'RenoFix Plus',      category:'Construction & Renovation', avg_rating:'4.8' }},
    { id:'f3', slot_number:3, company_id:'f3', companies:{ name:'AirCool Dubai',     category:'AC Service & Maintenance',  avg_rating:'4.6' }},
  ]
  const displaySponsored = sponsoredCos.length>0 ? sponsoredCos : fallbackSponsors
  const isRealData       = sponsoredCos.length>0
  const avColors = [
    { bg:'#ede9fe', color:'#5b21b6' },
    { bg:'#fef3c7', color:'#92400e' },
    { bg:'#d1fae5', color:'#065f46' },
  ]

  return (
    <div style={{ width:230, flexShrink:0, background:'var(--bg-card)', borderLeft:'0.5px solid var(--border-default)', padding:12, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>

      {/* Sponsored */}
      <div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-ad-2" style={{ fontSize:11, color:'#0099cc' }}/> Sponsored
        </div>
        {displaySponsored.map((slot,i) => {
          const co = slot.companies||{}
          const av = avColors[i%avColors.length]
          return (
            <div key={slot.id} style={{ background:'#f0faff', border:'0.5px solid #b3d9f0', borderRadius:8, padding:'8px 10px', marginBottom:6, position:'relative' }}>
              <span style={{ position:'absolute', top:5, right:5, fontSize:7, color:'#7a9ab5', background:'#e8f4fd', padding:'1px 4px', borderRadius:3 }}>Ad</span>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                <div style={{ width:26, height:26, borderRadius:6, background:av.bg, color:av.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0 }}>
                  {(co.name||'?').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{co.name||'—'}</div>
                  <div style={{ fontSize:7.5, color:'var(--text-muted)' }}>{co.category||'—'}</div>
                </div>
              </div>
              <div style={{ fontSize:8.5, color:'#f5a623', marginBottom:5 }}>
                {'★'.repeat(Math.round(parseFloat(co.avg_rating)||5))} {co.avg_rating||'5.0'}
              </div>
              <button
                onClick={() => {
                  if (isRealData) {
                    trackClick(slot)
                    setQuoteModal({ slot_id:slot.id, company_id:slot.company_id, company_name:co.name })
                  }
                }}
                style={{ width:'100%', background:'#0099cc', border:'none', borderRadius:5, padding:'5px 0', fontSize:9.5, color:'#fff', fontWeight:700, cursor:isRealData?'pointer':'default' }}>
                Get a Free Quote
              </button>
            </div>
          )
        })}
      </div>

      {/* Trending */}
      <div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-trending-up" style={{ fontSize:11, color:'#0099cc' }}/> Trending
        </div>
        {[
          { r:'1', name:'RenoFix Plus',    cat:'Construction',   hot:true },
          { r:'2', name:'Jaguar Interiors', cat:'Interior Design', hot:true },
          { r:'3', name:'AirCool Dubai',    cat:'AC Service' },
          { r:'4', name:'CleanPro Dubai',   cat:'Cleaning' },
        ].map((t,i) => (
          <div key={t.name} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 0', borderBottom:i<3?'0.5px solid var(--border-default)':'none' }}>
            <span style={{ fontSize:10, fontWeight:700, width:14, color:t.hot?'#f5a623':'var(--text-muted)', flexShrink:0 }}>{t.r}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
              <div style={{ fontSize:7.5, color:'var(--text-muted)' }}>{t.cat}</div>
            </div>
            <i className="ti ti-arrow-up-right" style={{ fontSize:10, color:'#0099cc', flexShrink:0 }}/>
          </div>
        ))}
      </div>

      {/* Recent Reviews */}
      <div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-message-circle" style={{ fontSize:11, color:'#0099cc' }}/> Recent Reviews
        </div>
        {reviews.slice(0,3).map((r,i) => (
          <div key={r.id||i} style={{ display:'flex', gap:7, padding:'5px 0', borderBottom:i<2?'0.5px solid var(--border-default)':'none' }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:['#0099cc','#7c3aed','#059669'][i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {(r.reviewer_name||'A')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:8.5, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.reviewer_name||'Anonymous'}</div>
              <div style={{ fontSize:7.5, color:'var(--text-muted)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(r.review_text||'').slice(0,42)}...</div>
              <div style={{ fontSize:8, color:'#f5a623' }}>{'★'.repeat(r.rating||5)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Newsletter */}
      <div style={{ background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-mail" style={{ fontSize:11, color:'#0099cc' }}/> Service Deals
        </div>
        <div style={{ fontSize:8, color:'var(--text-muted)', marginBottom:8, lineHeight:1.5 }}>Weekly deals & top-rated alerts in Dubai.</div>
        {subscribed ? (
          <div style={{ background:'#f0fdf4', border:'0.5px solid #a7f3d0', borderRadius:6, padding:'5px 8px', fontSize:9, color:'#065f46', fontWeight:600, textAlign:'center' }}>✓ Subscribed!</div>
        ) : (
          <div style={{ display:'flex', gap:5 }}>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex:1, padding:'5px 8px', border:'0.5px solid var(--border-default)', borderRadius:6, fontSize:9, background:'var(--bg-card)', color:'var(--text-primary)', outline:'none' }}/>
            <button onClick={()=>{ if(email.includes('@')) setSubscribed(true) }}
              style={{ padding:'5px 9px', background:'#0099cc', border:'none', borderRadius:6, fontSize:9, color:'#fff', fontWeight:600, cursor:'pointer' }}>Join</button>
          </div>
        )}
      </div>

      {/* App Download */}
      <div style={{ background:'#1a2744', borderRadius:10, padding:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#fff', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-device-mobile" style={{ fontSize:11, color:'#0099cc' }}/> Download App
        </div>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.45)', marginBottom:8, lineHeight:1.5 }}>Find trusted services on the go.</div>
        <div style={{ display:'flex', gap:6 }}>
          <button style={{ flex:1, background:'rgba(255,255,255,0.1)', border:'0.5px solid rgba(255,255,255,0.15)', borderRadius:7, padding:'6px 4px', cursor:'pointer', textAlign:'center' }}>
            <i className="ti ti-brand-apple" style={{ fontSize:14, color:'#fff', display:'block', marginBottom:2 }}/>
            <span style={{ fontSize:7.5, color:'rgba(255,255,255,0.6)' }}>App Store</span>
          </button>
          <button style={{ flex:1, background:'rgba(0,153,204,0.2)', border:'0.5px solid rgba(0,153,204,0.3)', borderRadius:7, padding:'6px 4px', cursor:'pointer', textAlign:'center' }}>
            <i className="ti ti-brand-android" style={{ fontSize:14, color:'#0099cc', display:'block', marginBottom:2 }}/>
            <span style={{ fontSize:7.5, color:'rgba(255,255,255,0.6)' }}>Play Store</span>
          </button>
        </div>
      </div>

      {/* Sponsored Quote Modal */}
      {quoteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:14, padding:24, width:360, maxWidth:'90vw' }}>
            {quoteDone ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <i className="ti ti-circle-check" style={{ fontSize:44, color:'#10b981', display:'block', marginBottom:10 }}/>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Quote Request Sent!</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{quoteModal.company_name} will contact you shortly.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:3 }}>Get a Free Quote</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:16 }}>from {quoteModal.company_name}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>Your Name *</div>
                    <input value={quoteForm.name} onChange={e=>setQuoteForm({...quoteForm,name:e.target.value})}
                      placeholder="e.g. Ahmed Hassan"
                      style={{ width:'100%', padding:'9px 12px', background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:12, color:'var(--text-primary)', outline:'none' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>Phone Number *</div>
                    <input value={quoteForm.phone} onChange={e=>setQuoteForm({...quoteForm,phone:e.target.value})}
                      placeholder="+971 50 123 4567"
                      style={{ width:'100%', padding:'9px 12px', background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:12, color:'var(--text-primary)', outline:'none' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:4 }}>Message (optional)</div>
                    <textarea value={quoteForm.message} onChange={e=>setQuoteForm({...quoteForm,message:e.target.value})}
                      placeholder="Describe your project..."
                      rows={3}
                      style={{ width:'100%', padding:'9px 12px', background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:12, color:'var(--text-primary)', outline:'none', resize:'none', fontFamily:'inherit' }}/>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={submitQuote} disabled={quoteSubmitting}
                    style={{ flex:1, padding:'10px', background:'#0099cc', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, opacity:quoteSubmitting?0.7:1 }}>
                    {quoteSubmitting
                      ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Sending...</>
                      : <><i className="ti ti-send" style={{ fontSize:13 }}/> Send Request</>
                    }
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </button>
                  <button onClick={()=>setQuoteModal(null)}
                    style={{ flex:1, padding:'10px', background:'var(--bg-secondary)', color:'var(--text-muted)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Sidebar({ navigate }) {
  const sections = [
    { label:'Browse', items:[
      { icon:'ti-home',    name:'Home',           active:true },
      { icon:'ti-search',  name:'Search',         action:()=>navigate('search',{}) },
      { icon:'ti-star',    name:'Top Rated',      action:()=>navigate('search',{}) },
      { icon:'ti-map-pin', name:'Near Me' },
      { icon:'ti-clock',   name:'Recently Added' },
    ]},
    { label:'Services', items:[
      { icon:'ti-snowflake', name:'AC Service',  action:()=>navigate('search',{category:'AC Service'}) },
      { icon:'ti-tool',      name:'Plumbing',    action:()=>navigate('search',{category:'Plumbing'}) },
      { icon:'ti-brush',     name:'Painting',    action:()=>navigate('search',{category:'Painting'}) },
      { icon:'ti-bolt',      name:'Electrical',  action:()=>navigate('search',{category:'Electrical'}) },
      { icon:'ti-sofa',      name:'Interior',    action:()=>navigate('search',{category:'Interior Design'}) },
      { icon:'ti-building',  name:'Renovation',  action:()=>navigate('search',{category:'Renovation'}) },
    ]},
    { label:'Explore', items:[
      { icon:'ti-map-2',      name:'City Map' },
      { icon:'ti-chart-line', name:'Review Trends' },
      { icon:'ti-users',      name:'Community' },
    ]},
  ]
  return (
    <div style={{ width:190, flexShrink:0, background:'var(--bg-card)', borderRight:'0.5px solid var(--border-default)', padding:'10px 0' }}>
      {sections.map(section => (
        <div key={section.label}>
          <div style={{ fontSize:8, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 14px 3px' }}>{section.label}</div>
          {section.items.map(item => (
            <div key={item.name} onClick={item.action}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 14px', fontSize:11, color:item.active?'#0099cc':'var(--text-secondary)', background:item.active?'#f0faff':'transparent', borderRight:item.active?'2px solid #0099cc':'none', fontWeight:item.active?600:400, cursor:item.action?'pointer':'default', transition:'all 0.15s' }}
              onMouseEnter={e=>{ if(!item.active) e.currentTarget.style.background='var(--bg-secondary)' }}
              onMouseLeave={e=>{ if(!item.active) e.currentTarget.style.background='transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize:13, flexShrink:0 }} />
              {item.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CoCard({ company, badge, extra, onClick }) {
  const plan = company?.plan || 'free'
  const name = company?.name || '...'
  const initials = name.slice(0,2).toUpperCase()
  const avColors = [
    { bg:'#ede9fe', color:'#5b21b6' },
    { bg:'#fef3c7', color:'#92400e' },
    { bg:'#d1fae5', color:'#065f46' },
    { bg:'#e0f9ff', color:'#0077aa' },
    { bg:'#fce7f3', color:'#9d174d' },
  ]
  const av = avColors[(name.charCodeAt(0)||0) % avColors.length]
  return (
    <div onClick={onClick}
      style={{ background:plan==='gold'?'#fffef8':plan==='platinum'?'#fdfbff':'var(--bg-card)', border:`0.5px solid ${plan==='gold'?'rgba(232,184,75,0.5)':plan==='platinum'?'rgba(139,92,246,0.35)':'var(--border-default)'}`, borderRadius:10, padding:'9px 10px', cursor:'pointer', transition:'all 0.15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,153,204,0.12)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
        <div style={{ width:28, height:28, borderRadius:7, background:av.bg, color:av.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{initials}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div style={{ fontSize:7.5, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{company?.category||company?.categories?.[0]||'—'}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>{badge}</div>
      {extra && <div style={{ fontSize:7.5, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:2 }}>{extra}</div>}
    </div>
  )
}

function PlanTag({ plan }) {
  if (plan==='gold')     return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#fef3c7', color:'#92400e' }}>Gold</span>
  if (plan==='platinum') return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#ede9fe', color:'#5b21b6' }}>Platinum</span>
  return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>✓</span>
}

export default function Home({ navigate }) {
  const [topCos,        setTopCos]        = useState([])
  const [nearCos,       setNearCos]       = useState([])
  const [newCos,        setNewCos]        = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [categories,    setCategories]    = useState([])
  const [stats,         setStats]         = useState({ companies:0, reviews:0, avgRating:'0.0', verified:0 })
  const [reviewData,    setReviewData]    = useState({ total:0, s5:0, s4:0, s3:0, s2:0, s1:0, s5_pct:0, s4_pct:0 })
  const [trustScore,    setTrustScore]    = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [customer,      setCustomer]      = useState(null)
  const [showUserMenu,  setShowUserMenu]  = useState(false)
  const [blockedMsg,    setBlockedMsg]    = useState(null)
  const [hasActiveForm, setHasActiveForm] = useState(false)
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const device    = useDevice()
  const isMobile  = device === 'mobile'
  const isTablet  = device === 'tablet'
  const isDesktop = device === 'desktop'

  const BIZ_URL = 'https://business.trustdubai.ae'

  useEffect(() => {
    fetchAll()
    fetchCategories()
    checkActiveForm()
    checkCustomer()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event==='SIGNED_IN' && session?.user) {
        const cust = await getCustomer()
        if (cust && cust.blocked) { setCustomer(null); setBlockedMsg(cust.companyName || 'your business') }
        else setCustomer(cust)
      }
      else if (event==='SIGNED_OUT') setCustomer(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkActiveForm() {
    try {
      const { data } = await supabase
        .from('lead_forms')
        .select('id')
        .eq('is_platform', true)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      setHasActiveForm(!!data)
    } catch(e) { console.error(e) }
  }

  function openQuotes() {
    if (!customer) { signInWithGoogle(); return }
    setLeadModalOpen(true)
  }

  async function fetchCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon, type, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setCategories(data || [])
    } catch(e) { console.error(e) }
  }

  async function fetchAll() {
    try {
      const [
        { count: totalCo },
        { count: totalRev },
        { count: verifiedCo },
        { data: ratData },
        { data: allCo },
        { data: revData },
        { data: recentRev },
      ] = await Promise.all([
        supabase.from('companies').select('*',{count:'exact',head:true}).eq('status','approved'),
        supabase.from('reviews').select('*',{count:'exact',head:true}).eq('is_approved',true),
        supabase.from('companies').select('*',{count:'exact',head:true}).eq('status','approved').eq('is_verified',true),
        supabase.from('reviews').select('rating').eq('is_approved',true),
        supabase.from('companies').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(20),
        supabase.from('reviews').select('rating,created_at').eq('is_approved',true),
        supabase.from('reviews').select('id,reviewer_name,rating,review_text,created_at').eq('is_approved',true).order('created_at',{ascending:false}).limit(5),
      ])
      const avg = ratData?.length>0 ? (ratData.reduce((s,r)=>s+r.rating,0)/ratData.length).toFixed(1) : '0.0'
      setStats({ companies:totalCo||0, reviews:totalRev||0, avgRating:avg, verified:verifiedCo||0 })
      const approved = allCo||[]
      setTopCos([...approved].sort((a,b)=>(b.avg_rating||0)-(a.avg_rating||0)).slice(0,4))
      setNearCos([...approved].slice(0,4))
      setNewCos([...approved].slice(0,4))
      setRecentReviews(recentRev||[])
      const monthStart = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString()
      const tm = (revData||[]).filter(r=>r.created_at>=monthStart)
      const s5=tm.filter(r=>r.rating===5).length, s4=tm.filter(r=>r.rating===4).length
      const s3=tm.filter(r=>r.rating===3).length, s2=tm.filter(r=>r.rating===2).length
      const s1=tm.filter(r=>r.rating===1).length, total=tm.length
      setReviewData({ total,s5,s4,s3,s2,s1, s5_pct:total>0?Math.round(s5/total*100):0, s4_pct:total>0?Math.round(s4/total*100):0 })
      setTrustScore(Math.min(100,Math.round((verifiedCo/Math.max(totalCo,1))*40+(parseFloat(avg)/5)*40+Math.min((totalRev||0)/100,1)*20)))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function checkCustomer() {
    const cust = await getCustomer()
    if (cust && cust.blocked) {
      setCustomer(null)
      setBlockedMsg(cust.companyName || 'your business')
      return
    }
    setCustomer(cust)
  }

  function goTo(c) {
    if (!c?.id) return
    if (c.slug) window.location.href = '/'+c.slug
    else navigate('company',{company:c})
  }

  function fmt(n) {
    if (n>=1000) return Math.floor(n/1000)+'K+'
    if (n>=100) return n+'+'
    return String(n||0)
  }

  // Business email blocked banner (sab layouts ke upar)
  const BlockedBanner = blockedMsg ? (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:3000, background:'#fef2f2', borderBottom:'1px solid #fecaca', padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
      <i className="ti ti-alert-triangle" style={{ fontSize:20, color:'#dc2626', flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>This email is registered as a business</div>
        <div style={{ fontSize:11.5, color:'#b91c1c', marginTop:1 }}>
          "{blockedMsg}" uses this email on TrustDubai. Please use the Business Portal to manage it. Customer login needs a different email.
        </div>
      </div>
      <button onClick={()=>window.open(BIZ_URL,'_blank')}
        style={{ padding:'7px 12px', background:'#0099cc', color:'#fff', border:'none', borderRadius:7, fontSize:11.5, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
        Business Portal
      </button>
      <button onClick={()=>setBlockedMsg(null)}
        style={{ width:28, height:28, borderRadius:7, background:'transparent', border:'none', color:'#dc2626', cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
    </div>
  ) : null

  function Topbar() {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 20px', height:48, background:'var(--bg-card)', borderBottom:'0.5px solid var(--border-default)', position:'sticky', top:0, zIndex:100, width:'100%' }}>
        <Logo size={15} />
        <nav style={{ display:'flex', gap:4, marginLeft:8 }}>
          {['Home','Categories','Top Rated','Near Me','City Map'].map((l,i)=>(
            <button key={l}
              onClick={()=>{ if(l!=='Home') navigate('search',{}) }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, fontWeight:i===0?700:500, color:i===0?'#0099cc':'var(--text-muted)', borderBottom:i===0?'1.5px solid #0099cc':'none', padding:'0 8px', height:48, whiteSpace:'nowrap' }}>
              {l}
            </button>
          ))}
        </nav>
        <div style={{ flex:1, maxWidth:220, minWidth:100, background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:20, padding:'5px 10px', display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-search" style={{ fontSize:10, color:'#0099cc', flexShrink:0 }} />
          <input placeholder="Search companies..."
            onKeyDown={e=>{ if(e.key==='Enter'&&e.target.value.trim()) navigate('search',{query:e.target.value.trim()}) }}
            style={{ border:'none', background:'none', outline:'none', fontSize:9, color:'var(--text-primary)', width:'100%', minWidth:0 }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginLeft:'auto' }}>
          <ThemeToggle />
          <button onClick={()=>window.open(BIZ_URL,'_blank')}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', border:'0.5px solid #b3d9f0', borderRadius:99, background:'#f0faff', color:'#0099cc', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            <i className="ti ti-briefcase" style={{ fontSize:9 }} /> {customer ? 'My Business' : 'List Business'}
          </button>
          {customer ? (
            <div style={{ position:'relative' }}>
              <button onClick={()=>setShowUserMenu(!showUserMenu)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', border:'0.5px solid var(--border-default)', borderRadius:99, background:'var(--bg-card)', cursor:'pointer' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'#1a2744', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff' }}>
                  {(customer.full_name||customer.email||'U')[0].toUpperCase()}
                </div>
                <span style={{ fontSize:10, color:'var(--text-primary)', fontWeight:600, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {(customer.full_name||customer.email?.split('@')[0]||'User').slice(0,12)}
                </span>
              </button>
              {showUserMenu && (
  <div style={{ position:'absolute', right:0, top:36, background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:8, minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.1)', zIndex:200 }}>
    <div style={{ fontSize:10, color:'var(--text-muted)', padding:'4px 8px', borderBottom:'0.5px solid var(--border-default)', marginBottom:4 }}>{customer.email}</div>
    <button onClick={()=>{navigate('customer-profile');setShowUserMenu(false)}}
      style={{ width:'100%', padding:'7px 8px', background:'transparent', color:'var(--text-primary)', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
      <i className="ti ti-user" style={{ fontSize:12 }}/> My Profile
    </button>
    <button onClick={()=>{navigate('add-review',{});setShowUserMenu(false)}}
      style={{ width:'100%', padding:'7px 8px', background:'transparent', color:'var(--text-primary)', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
      <i className="ti ti-star" style={{ fontSize:12 }}/> Write a Review
    </button>
    <button onClick={()=>{signOut();setCustomer(null);setShowUserMenu(false)}}
      style={{ width:'100%', padding:'7px 8px', background:'#fff0f0', color:'#dc2626', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left' }}>Sign Out</button>
  </div>
)}
            </div>
          ) : (
            <button onClick={()=>signInWithGoogle()}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', border:'none', borderRadius:99, background:'#fff', color:'#374151', fontSize:10, fontWeight:600, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.12)', whiteSpace:'nowrap' }}>
              <svg width="12" height="12" viewBox="0 0 24 24">
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
    )
  }

  function Hero() {
    return (
      <div style={{ background:'var(--bg-card)', padding:'14px 20px', borderBottom:'0.5px solid var(--border-default)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'relative', maxWidth:520, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:99, padding:'3px 10px', marginBottom:8 }}>
            <i className="ti ti-shield-check" style={{ fontSize:10, color:'#0099cc' }} />
            <span style={{ fontSize:9, color:'#0099cc', fontWeight:600 }}>Dubai's Most Trusted Review Platform</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-1px', lineHeight:1.1, marginBottom:5 }}>
            Find Trusted <span style={{ color:'#0099cc' }}>Services</span> in Dubai
          </h1>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, lineHeight:1.6 }}>
            Verified companies · Real reviews from real customers
          </p>
          <div style={{ maxWidth:440, margin:'0 auto 10px' }}>
            <SearchBar placeholder="AC repair, plumbing, renovation..." onSearch={q=>navigate('search',{query:q})} />
          </div>
          {hasActiveForm && (
            <div style={{ maxWidth:440, margin:'0 auto 12px' }}>
              <GetQuotesButton onClick={openQuotes} />
              <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:6 }}>Tell us once — we match you with up to 3 trusted companies</div>
            </div>
          )}
          <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
            {[['companies','Companies'],['reviews','Reviews'],['avgRating','Avg Rating'],['verified','Verified']].map(([k,l])=>(
              <div key={k} style={{ background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, padding:'6px 12px', textAlign:'center', minWidth:65 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#0099cc', lineHeight:1 }}>{k==='avgRating'?stats.avgRating+'★':fmt(stats[k])}</div>
                <div style={{ fontSize:7.5, color:'var(--text-muted)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function ServicesRow() {
    return (
      <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'7px 10px', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-category" style={{ fontSize:11, color:'#0099cc' }} />
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Top Services</span>
          </div>
          <span style={{ fontSize:8, color:'var(--text-muted)' }}>← swipe →</span>
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {categories.length === 0 ? (
            [1,2,3,4,5,6].map(i => <div key={i} style={{ flexShrink:0, width:52, height:52, background:'var(--bg-secondary)', borderRadius:9 }} />)
          ) : categories.map((c,i)=>(
            <div key={c.id} onClick={()=>navigate('search',{category:c.name})}
              style={{ flexShrink:0, width:52, height:52, background:i===0?'#f0faff':'var(--bg-secondary)', border:`0.5px solid ${i===0?'#0099cc':'var(--border-default)'}`, borderRadius:9, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='#0099cc'; e.currentTarget.style.background='#f0faff' }}
              onMouseLeave={e=>{ if(i!==0){ e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.background='var(--bg-secondary)' }}}
            >
              <span style={{ fontSize:17, lineHeight:1 }}>{c.icon || '🏷️'}</span>
              <span style={{ fontSize:7, color:i===0?'#0099cc':'var(--text-muted)', fontWeight:i===0?600:400, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function SecHeader({ icon, title, subtitle, viewAll, onViewAll }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <i className={`ti ${icon}`} style={{ fontSize:11, color:'#0099cc' }} />
          <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>{title}</span>
          {subtitle && <span style={{ fontSize:8, color:'var(--text-muted)', fontWeight:400, textTransform:'none' }}>{subtitle}</span>}
        </div>
        {viewAll && <span onClick={onViewAll} style={{ fontSize:8, color:'#0099cc', fontWeight:600, cursor:'pointer' }}>{viewAll}</span>}
      </div>
    )
  }

  function CardGrid({ companies, renderBadge, renderExtra }) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:7 }}>
        {companies.map((c,i) => c ? (
          <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
            badge={renderBadge(c,i)}
            extra={renderExtra ? renderExtra(c,i) : null}
          />
        ) : (
          <div key={i} style={{ height:80, background:'linear-gradient(90deg,var(--bg-tertiary) 25%,var(--bg-secondary) 50%,var(--bg-tertiary) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', borderRadius:10 }}>
            <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          </div>
        ))}
      </div>
    )
  }

  function MainContent() {
    const empty = [null,null,null,null]
    const top  = loading ? empty : (topCos.length>0  ? topCos  : empty)
    const near = loading ? empty : (nearCos.length>0 ? nearCos : empty)
    const novo = loading ? empty : (newCos.length>0  ? newCos  : empty)
    return (
      <div style={{ flex:1, minWidth:0, padding:'10px 14px', background:'var(--bg-secondary)', overflowX:'hidden' }}>
        <ServicesRow />
        <TrustWave score={trustScore} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
            <SecHeader icon="ti-star" title="Top Rated Companies" viewAll="View all →" onViewAll={()=>navigate('search',{})} />
            <CardGrid companies={top}
              renderBadge={(c)=>(
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{c.avg_rating||'—'}★</span>
                  <PlanTag plan={c.plan} />
                </div>
              )}
              renderExtra={(c)=><><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
            />
          </div>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
            <SecHeader icon="ti-map-pin" title="Near Me" subtitle="· Dubai" viewAll="View all →" onViewAll={()=>navigate('search',{})} />
            <CardGrid companies={near}
              renderBadge={(c,i)=>(
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{c.avg_rating||'—'}★</span>
                  <span style={{ fontSize:7.5, color:'#0099cc', fontWeight:600 }}>{((i+1)*0.7).toFixed(1)}km</span>
                </div>
              )}
              renderExtra={(c)=><><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
            />
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
            <SecHeader icon="ti-clock" title="Recently Added" viewAll="View all →" onViewAll={()=>navigate('search',{})} />
            <CardGrid companies={novo}
              renderBadge={()=>(
                <span style={{ fontSize:7, background:'#e0f9ff', color:'#0077aa', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>New</span>
              )}
              renderExtra={(c)=><><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
            />
          </div>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
            <SecHeader icon="ti-map-2" title="City Network" />
            <CityMap height={120} />
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:7 }}>
              {['Downtown','Business Bay','JBR','DIFC','Marina','Jumeirah','+6 more'].map(a=>(
                <span key={a} style={{ fontSize:7.5, background:'#e0f9ff', color:'#0077aa', padding:'2px 7px', borderRadius:4, fontWeight:600 }}>{a}</span>
              ))}
            </div>
          </div>
        </div>
        <ReviewGraph data={reviewData} />
      </div>
    )
  }

  function BottomNav() {
    return (
      <div style={{ position:'fixed', bottom:0, left:0, right:0, maxWidth:480, margin:'0 auto', background:'var(--bg-card)', borderTop:'0.5px solid var(--border-default)', padding:'8px 0 10px', display:'flex', justifyContent:'space-around', zIndex:100 }}>
        {[
          { icon:'ti-home',           label:'Home',     active:true },
          { icon:'ti-search',         label:'Search',   action:()=>navigate('search',{}) },
          { icon:'ti-building-store', label: customer ? 'My Biz' : 'List Biz', action:()=>window.open(BIZ_URL,'_blank') },
          { icon:'ti-star',           label:'Reviews',  action:()=>{ if(customer) navigate('add-review',{}); else signInWithGoogle() } },
        ].map(item=>(
          <button key={item.label} onClick={item.action}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'0 8px' }}>
            <i className={`ti ${item.icon}`} style={{ fontSize:18, color:item.active?'#0099cc':'var(--text-muted)' }} />
            {item.active && <div style={{ width:4, height:4, background:'#0099cc', borderRadius:'50%' }} />}
            <span style={{ fontSize:8, color:item.active?'#0099cc':'var(--text-muted)', fontWeight:item.active?600:400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    )
  }

  const LeadModal = <LeadQuoteModal open={leadModalOpen} onClose={()=>setLeadModalOpen(false)} customer={customer} mobile={isMobile} />

  if (isMobile) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh', paddingBottom:72, overflowX:'hidden' }}>
        {BlockedBanner}
        {LeadModal}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-card)', borderBottom:'0.5px solid var(--border-default)', position:'sticky', top:0, zIndex:100 }}>
          <Logo size={14} />
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <ThemeToggle />
            <button onClick={()=>window.open(BIZ_URL,'_blank')}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', border:'0.5px solid #b3d9f0', borderRadius:99, background:'#f0faff', color:'#0099cc', fontSize:9.5, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              <i className="ti ti-briefcase" style={{ fontSize:9 }} /> {customer ? 'My Biz' : 'List Biz'}
            </button>
            {customer ? (
              <div style={{ position:'relative' }}>
                <button onClick={()=>setShowUserMenu(!showUserMenu)}
                  style={{ display:'flex', alignItems:'center', gap:0, padding:0, border:'none', background:'none', cursor:'pointer' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#1a2744', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>
                    {(customer.full_name||customer.email||'U')[0].toUpperCase()}
                  </div>
                </button>
                {showUserMenu && (
                  <div style={{ position:'absolute', right:0, top:38, background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:8, minWidth:170, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:200 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', padding:'4px 8px', borderBottom:'0.5px solid var(--border-default)', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{customer.email}</div>
                    <button onClick={()=>{navigate('customer-profile');setShowUserMenu(false)}}
                      style={{ width:'100%', padding:'7px 8px', background:'transparent', color:'var(--text-primary)', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <i className="ti ti-user" style={{ fontSize:12 }}/> My Profile
                    </button>
                    <button onClick={()=>{navigate('add-review',{});setShowUserMenu(false)}}
                      style={{ width:'100%', padding:'7px 8px', background:'transparent', color:'var(--text-primary)', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <i className="ti ti-star" style={{ fontSize:12 }}/> Write a Review
                    </button>
                    <button onClick={()=>{signOut();setCustomer(null);setShowUserMenu(false)}}
                      style={{ width:'100%', padding:'7px 8px', background:'#fff0f0', color:'#dc2626', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left' }}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={()=>signInWithGoogle()}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', border:'none', borderRadius:99, background:'#fff', color:'#374151', fontSize:9.5, fontWeight:700, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.12)', whiteSpace:'nowrap' }}>
                <svg width="12" height="12" viewBox="0 0 24 24">
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
        <div style={{ background:'var(--bg-card)', padding:'16px 14px 14px', borderBottom:'0.5px solid var(--border-default)', textAlign:'center' }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.5px', lineHeight:1.1, marginBottom:5 }}>
            Find Trusted <span style={{ color:'#0099cc' }}>Services</span>
          </h1>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>Real reviews from real customers in Dubai</p>
          <SearchBar placeholder="AC repair, plumbing, interiors..." onSearch={q=>navigate('search',{query:q})} />
          {hasActiveForm && (
            <div style={{ marginTop:10 }}>
              <GetQuotesButton onClick={openQuotes} mobile />
              <div style={{ fontSize:8.5, color:'var(--text-muted)', marginTop:6 }}>Tell us once — we match you with top companies</div>
            </div>
          )}
        </div>
        <div style={{ padding:'10px 14px 6px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
            {categories.length === 0 ? (
              [1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ width:'100%', paddingTop:'100%', background:'var(--bg-card)', borderRadius:10 }} />)
            ) : categories.slice(0,8).map(c=>(
              <div key={c.id} onClick={()=>navigate('search',{category:c.name})} style={{ cursor:'pointer' }}>
                <div style={{ position:'relative', width:'100%', paddingTop:'100%', background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                    <span style={{ fontSize:20, lineHeight:1 }}>{c.icon || '🏷️'}</span>
                    <span style={{ fontSize:8, color:'var(--text-muted)', textAlign:'center', fontWeight:500, padding:'0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{c.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:'6px 14px' }}>
          <TrustWave score={trustScore} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Top Rated</span>
            <button onClick={()=>navigate('search',{})} style={{ background:'none', border:'none', fontSize:9, color:'#0099cc', cursor:'pointer', fontWeight:600 }}>View all</button>
          </div>
          {loading ? [1,2,3].map(i=><div key={i} style={{ height:70, background:'var(--bg-tertiary)', borderRadius:10, marginBottom:6 }}/>) :
            topCos.map(c=><CompanyCard key={c.id} company={c} onClick={()=>goTo(c)} />)
          }
        </div>
        <BottomNav />
      </div>
    )
  }

  if (isTablet) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh', overflowX:'hidden' }}>
        {BlockedBanner}
        {LeadModal}
        <Topbar />
        <Hero />
        <div style={{ display:'flex' }}>
          <Sidebar navigate={navigate} />
          <div style={{ flex:1, minWidth:0, padding:'10px 16px' }}>
            <ServicesRow />
            <TrustWave score={trustScore} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
                <SecHeader icon="ti-star" title="Top Rated" viewAll="View all →" onViewAll={()=>navigate('search',{})} />
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:7 }}>
                  {topCos.slice(0,4).map((c,i)=>(
                    <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                      badge={<span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{c.avg_rating||'—'}★</span>}
                      extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                    />
                  ))}
                </div>
              </div>
              <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
                <SecHeader icon="ti-map-2" title="City Network" />
                <CityMap height={120} />
              </div>
            </div>
            <ReviewGraph data={reviewData} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh', overflowX:'hidden' }}>
      {BlockedBanner}
      {LeadModal}
      <Topbar />
      <Hero />
      <div style={{ display:'flex', alignItems:'stretch' }}>
        <Sidebar navigate={navigate} />
        <MainContent />
        <RightPanel recentReviews={recentReviews} />
      </div>
    </div>
  )
}
