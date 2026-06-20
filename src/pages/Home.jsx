import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer, updateCustomerProfile } from '../customerAuth'
import CompanyCard from '../components/CompanyCard'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'

const DUBAI_AREAS = [
  'Downtown Dubai','Business Bay','Dubai Marina','Palm Jumeirah','Jumeirah Village Circle (JVC)',
  'Jumeirah Lake Towers (JLT)','Jumeirah','Dubai Hills Estate','Arabian Ranches','DAMAC Hills',
  'Emirates Hills','The Springs','The Meadows','The Greens','Dubai Silicon Oasis',
  'Mirdif','Al Barsha','Deira','Bur Dubai','Dubai Investment Park (DIP)',
  'Jumeirah Beach Residence (JBR)','DIFC','City Walk','Al Furjan','Discovery Gardens',
  'Motor City','Jumeirah Golf Estates','Dubailand','International City','Town Square','Other',
]

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1, flexShrink: 0 }}>
      <i className="ti ti-shield-check" style={{ fontSize: size * 1.35, color: '#0099cc', lineHeight: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: size, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Quv</span>
        <span style={{ fontSize: size, fontWeight: 700, color: '#0099cc', letterSpacing: '-0.3px' }}>era</span>
        <span style={{ fontSize: size * 0.38, color: '#0099cc', marginLeft: 1, lineHeight: 1, verticalAlign: 'super' }}>●</span>
      </div>
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

/* ============ PROFILE GATE MODAL (complete profile before quotes) ============ */
function ProfileGateModal({ open, onClose, customer, onComplete, mobile }) {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [area, setArea]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && customer) {
      setName(customer.full_name || '')
      setPhone(customer.phone || '')
      setArea(customer.area || '')
      setError('')
    }
  }, [open, customer])

  if (!open) return null

  async function save() {
    if (!name.trim())  { setError('Please enter your name'); return }
    if (!phone.trim() || phone.replace(/[^0-9]/g,'').length < 7) { setError('Please enter a valid phone number'); return }
    if (!area)         { setError('Please select your area'); return }
    setError('')
    setSaving(true)
    const updated = await updateCustomerProfile(customer.id, {
      full_name: name.trim(), phone: phone.trim(), area,
    })
    setSaving(false)
    if (!updated) { setError('Could not save. Please try again.'); return }
    onComplete(updated)
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:3000, display:'flex',
    alignItems: mobile ? 'flex-end' : 'center', justifyContent:'center' }
  const sheet = { background:'var(--bg-card)', border:'0.5px solid var(--border-default)',
    borderRadius: mobile ? '18px 18px 0 0' : 14, padding: mobile ? '16px 16px 24px' : 24,
    width: mobile ? '100%' : 400, maxWidth: mobile ? '100%' : '92vw', maxHeight:'88vh', overflowY:'auto' }
  const lbl = { fontSize:11.5, color:'var(--text-secondary)', marginBottom:5, fontWeight:600, display:'block' }
  const inp = { width:'100%', padding:'10px 12px', background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:13, color:'var(--text-primary)', outline:'none', boxSizing:'border-box' }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        {mobile && <div style={{ width:34, height:4, background:'var(--border-default)', borderRadius:99, margin:'0 auto 12px' }} />}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>Complete your profile</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:18, lineHeight:1 }}>×</button>
        </div>
        <div style={{ fontSize:11.5, color:'var(--text-muted)', marginBottom:16 }}>
          We need a few details so trusted companies can reach you with quotes.
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:13, marginBottom:16 }}>
          <div>
            <label style={lbl}>Full Name <span style={{ color:'#ef4444' }}>*</span></label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp} />
          </div>
          <div>
            <label style={lbl}>Phone Number <span style={{ color:'#ef4444' }}>*</span></label>
            <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+971 50 123 4567" style={inp} />
          </div>
          <div>
            <label style={lbl}>Your Area in Dubai <span style={{ color:'#ef4444' }}>*</span></label>
            <select value={area} onChange={e=>setArea(e.target.value)} style={inp}>
              <option value="">Select area...</option>
              {DUBAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background:'#f0faff', border:'0.5px solid #b3d9f0', borderRadius:8, padding:'8px 11px', fontSize:10.5, color:'#0077aa', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-lock" style={{ fontSize:13 }} />
          Your details are only shared with companies you request quotes from.
        </div>

        {error && <div style={{ fontSize:11.5, color:'#dc2626', marginBottom:10 }}>{error}</div>}

        <button onClick={save} disabled={saving}
          style={{ width:'100%', padding:'12px', background:'#0099cc', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          {saving
            ? <><div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Saving...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>
            : <><i className="ti ti-arrow-right" style={{ fontSize:15 }}/> Save &amp; Continue</>
          }
        </button>
      </div>
    </div>
  )
}

/* ============ LEAD QUOTE MODAL ============ */
function MatchedCompanyCard({ co, leadId, customer, onMessage }) {
  const name = co?.name || 'Company'
  const initials = name.slice(0,2).toUpperCase()
  const verified = co?.is_verified
  const plan = (co?.plan || 'free').toLowerCase()
  const planTag = plan==='platinum' ? { t:'Platinum', bg:'#ede9fe', c:'#5b21b6' }
                : plan==='gold'     ? { t:'Gold', bg:'#fef3c7', c:'#92400e' }
                : plan==='silver'   ? { t:'Silver', bg:'#f1f5f9', c:'#475569' }
                : null
  function openProfile() { if (co?.slug) window.open('/'+co.slug, '_blank') }
  return (
    <div style={{ border:'0.5px solid var(--border-default)', borderRadius:11, background:'var(--bg-card)', marginBottom:8, padding:'11px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
        <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', flexShrink:0, background:'#e0f9ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {co?.logo_url
            ? <img src={co.logo_url} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:13, fontWeight:700, color:'#0077aa' }}>{initials}</span>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
            {verified && <i className="ti ti-rosette-discount-check-filled" style={{ fontSize:13, color:'#1e9e63', flexShrink:0 }} />}
          </div>
          <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1, display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
            <span style={{ color:'#f5a623', fontWeight:700 }}>★ {co?.avg_rating ? Number(co.avg_rating).toFixed(1) : 'New'}</span>
            <span>{co?.total_reviews || 0} reviews</span>
            {co?.trust_score != null && <span style={{ color:'#0099cc', fontWeight:600 }}>Trust {Math.round(co.trust_score)}</span>}
            {planTag && <span style={{ fontSize:8, fontWeight:700, background:planTag.bg, color:planTag.c, padding:'1px 6px', borderRadius:4 }}>{planTag.t}</span>}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:7, marginTop:9 }}>
        <button onClick={()=>onMessage && onMessage(co)}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:12, fontWeight:700, color:'#fff', background:'#0099cc', border:'none', borderRadius:8, padding:'8px', cursor:'pointer' }}>
          <i className="ti ti-message-2" style={{ fontSize:14 }} /> Message
        </button>
        <button onClick={openProfile}
          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:12, fontWeight:600, color:'#0099cc', background:'#f0faff', border:'0.5px solid #b3d9f0', borderRadius:8, padding:'8px', cursor:'pointer' }}>
          <i className="ti ti-eye" style={{ fontSize:14 }} /> View
        </button>
      </div>
    </div>
  )
}

function ChatDrawer({ open, onClose, company, leadId, customer, mobile }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open || !company || !leadId) return
    let alive = true
    load()
    const t = setInterval(load, 4000)
    return () => { alive = false; clearInterval(t) }
    async function load() {
      try {
        const { data } = await supabase
          .from('lead_chat')
          .select('id,sender_type,body,created_at,read_by_company,read_by_customer')
          .eq('lead_id', leadId)
          .eq('company_id', company.id)
          .order('created_at', { ascending: true })
        if (!alive) return
        setMessages(data || [])
        const unread = (data || []).filter(m => m.sender_type==='company' && !m.read_by_customer)
        if (unread.length) {
          await supabase.from('lead_chat').update({ read_by_customer:true })
            .eq('lead_id', leadId).eq('company_id', company.id).eq('sender_type','company').eq('read_by_customer', false)
        }
      } catch(e){ console.error(e) }
      finally { if (alive) setLoading(false) }
    }
  }, [open, company, leadId])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    const optimistic = { id:'tmp'+Date.now(), sender_type:'customer', body, created_at:new Date().toISOString() }
    setMessages(m => [...m, optimistic])
    setText('')
    try {
      await supabase.from('lead_chat').insert({
        lead_id: leadId, company_id: company.id, customer_id: customer?.id || null,
        sender_type: 'customer', body, read_by_customer: true,
      })
    } catch(e){ console.error(e) }
    finally { setSending(false) }
  }

  if (!open || !company) return null
  const name = company.name || 'Company'
  const initials = name.slice(0,2).toUpperCase()

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:4000, display:'flex',
    alignItems: mobile ? 'stretch' : 'center', justifyContent: mobile ? 'stretch' : 'flex-end' }
  const panel = { background:'var(--bg-card)', display:'flex', flexDirection:'column',
    width: mobile ? '100%' : 400, height: mobile ? '100%' : '88vh',
    maxHeight: mobile ? '100%' : '88vh',
    borderRadius: mobile ? 0 : '14px 0 0 14px', overflow:'hidden',
    marginRight: mobile ? 0 : 0 }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'0.5px solid var(--border-default)', flexShrink:0 }}>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'0.5px solid var(--border-default)', background:'var(--bg-secondary)', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-arrow-left" style={{ fontSize:17 }} />
          </button>
          <div style={{ width:36, height:36, borderRadius:9, overflow:'hidden', background:'#e0f9ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {company.logo_url ? <img src={company.logo_url} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:12, fontWeight:700, color:'#0077aa' }}>{initials}</span>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
              {name} {company.is_verified && <i className="ti ti-rosette-discount-check-filled" style={{ fontSize:12, color:'#1e9e63' }} />}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
              {company.avg_rating ? '★ '+Number(company.avg_rating).toFixed(1) : 'New'}{company.trust_score!=null ? ' · Trust '+Math.round(company.trust_score) : ''}
            </div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'14px', background:'var(--bg-secondary)', display:'flex', flexDirection:'column', gap:9, WebkitOverflowScrolling:'touch' }}>
          {loading ? (
            <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:20 }}>
              <div style={{ width:22, height:22, border:'3px solid #0099cc', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'20px 10px' }}>
              <i className="ti ti-message-2" style={{ fontSize:26, color:'#0099cc', display:'block', marginBottom:8 }} />
              Start the conversation with {name}. Ask about your project, pricing, or timeline.
            </div>
          ) : messages.map(m => {
            const mine = m.sender_type === 'customer'
            return (
              <div key={m.id} style={{ alignSelf: mine?'flex-end':'flex-start', maxWidth:'80%' }}>
                <div style={{ background: mine?'#0099cc':'var(--bg-card)', color: mine?'#fff':'var(--text-primary)',
                  border: mine?'none':'0.5px solid var(--border-default)',
                  padding:'9px 12px', borderRadius: mine?'12px 12px 4px 12px':'12px 12px 12px 4px', fontSize:13, lineHeight:1.5, wordBreak:'break-word' }}>
                  {m.body}
                </div>
                <div style={{ fontSize:9.5, color:'var(--text-muted)', textAlign: mine?'right':'left', marginTop:3 }}>
                  {new Date(m.created_at).toLocaleTimeString('en-AE',{hour:'numeric',minute:'2-digit'})}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderTop:'0.5px solid var(--border-default)', flexShrink:0 }}>
          <input value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') send() }}
            placeholder="Type a message…"
            style={{ flex:1, height:38, border:'0.5px solid var(--border-default)', borderRadius:99, padding:'0 14px', fontSize:13, background:'var(--bg-secondary)', color:'var(--text-primary)', outline:'none' }} />
          <button onClick={send} disabled={sending || !text.trim()}
            style={{ width:38, height:38, borderRadius:'50%', background:'#0099cc', border:'none', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, cursor:'pointer', opacity:(sending||!text.trim())?0.6:1 }}>
            <i className="ti ti-send" style={{ fontSize:17 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

function LeadQuoteModal({ open, onClose, customer, mobile }) {
  const [form, setForm]         = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const [categories, setCategories] = useState([])
  const [matched, setMatched]   = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [leadId, setLeadId]     = useState(null)
  const [chatCo, setChatCo]     = useState(null)
  const [gName, setGName]       = useState('')
  const [gPhone, setGPhone]     = useState('')
  const [gEmail, setGEmail]     = useState('')
  const [gArea, setGArea]       = useState('')

  useEffect(() => {
    if (open) {
      loadForm(); setDone(false); setAnswers({}); setError(''); setMatched([]); setLeadId(null); setChatCo(null)
      setGName(customer?.full_name || '')
      setGPhone(customer?.phone || '')
      setGEmail(customer?.email || '')
      setGArea(customer?.area || '')
    }
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
      const { data: cats } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setCategories((cats || []).map(c => c.name))
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

  async function fetchMatched(leadId) {
    setMatchLoading(true)
    async function query() {
      const { data } = await supabase.rpc('get_lead_matches', { p_lead_id: leadId })
      return Array.isArray(data) ? data : []
    }
    try {
      await new Promise(r => setTimeout(r, 1500))
      let cos = await query()
      for (let i = 0; i < 3 && cos.length === 0; i++) {
        await new Promise(r => setTimeout(r, 1500))
        cos = await query()
      }
      setMatched(cos)
    } catch (e) { console.error(e) }
    finally { setMatchLoading(false) }
  }

  async function submit() {
    const leadName  = (gName  || customer?.full_name || '').trim()
    const leadPhone = (gPhone || customer?.phone || '').trim()
    const leadEmail = (gEmail || customer?.email || '').trim()
    const leadArea  = (gArea  || customer?.area || '')
    if (!leadName)  { setError('Please enter your name'); return }
    if (!leadPhone || leadPhone.replace(/[^0-9]/g,'').length < 7) { setError('Please enter a valid phone number'); return }
    if (!leadArea)  { setError('Please select your area'); return }
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
      const { data: newId, error: insErr } = await supabase.rpc('submit_public_lead', {
        p_form_id: form.id,
        p_name: leadName,
        p_phone: leadPhone,
        p_email: leadEmail || '',
        p_answers: { ...answerObj, _area: leadArea || '' },
        p_source_url: 'home',
        p_customer_id: customer?.id || null,
      })
      if (insErr) throw insErr
      setDone(true)
      // Meta Pixel — track lead conversion for ads optimisation
      try { if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'Lead'); } catch (e) {}
      if (newId) { setLeadId(newId); fetchMatched(newId) }
    } catch (e) { console.error(e); setError('Something went wrong. Please try again.') }
    finally { setSubmitting(false) }
  }

  if (!open) return null

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:3000, display:'flex',
    alignItems: mobile ? 'flex-end' : 'center', justifyContent:'center' }
  const sheet = { background:'var(--bg-card)', border:'0.5px solid var(--border-default)',
    borderRadius: mobile ? '18px 18px 0 0' : 14, padding: mobile ? '14px 16px 22px' : 24,
    width: mobile ? '100%' : 420, maxWidth: mobile ? '100%' : '92vw',
    maxHeight: mobile ? '90vh' : '88vh', overflowY:'auto', display:'flex', flexDirection:'column',
    WebkitOverflowScrolling:'touch' }

  return (
    <>
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        {mobile && <div style={{ width:34, height:4, background:'var(--border-default)', borderRadius:99, margin:'0 auto 12px', flexShrink:0 }} />}

        {done ? (
          <div style={{ padding:'6px 0 2px' }}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <i className="ti ti-check" style={{ fontSize:26, color:'#10b981' }} />
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:5 }}>Request sent!</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>
                {matched.length > 0
                  ? `We matched you with ${matched.length} trusted ${matched.length===1?'company':'companies'}. They'll contact you shortly.`
                  : "We're matching you with top trusted companies. They'll contact you shortly."}
              </div>
            </div>

            {matchLoading ? (
              <div style={{ textAlign:'center', padding:'14px 0', color:'var(--text-muted)', fontSize:12 }}>
                <div style={{ width:24, height:24, border:'3px solid #0099cc', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Finding the best matches…
              </div>
            ) : matched.length > 0 ? (
              <>
                <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:9 }}>
                  Matched with these trusted companies
                </div>
                {matched.map((co, i) => <MatchedCompanyCard key={co.id || i} co={co} leadId={leadId} customer={customer} onMessage={(c)=>setChatCo(c)} />)}
              </>
            ) : null}

            <button onClick={onClose}
              style={{ width:'100%', marginTop:8, padding:'11px', background:'var(--bg-secondary)', color:'var(--text-primary)', border:'0.5px solid var(--border-default)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
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
                <div style={{ background:'#f0faff', border:'0.5px solid #b3d9f0', borderRadius:8, padding:'9px 11px', fontSize:11, color:'#0077aa', marginBottom:14, display:'flex', alignItems:'flex-start', gap:7, lineHeight:1.45 }}>
                  <i className="ti ti-bulb" style={{ fontSize:14, flexShrink:0, marginTop:1 }} />
                  <span>Describe your requirement clearly and in detail — the more you explain, the better we match you with the right company for the job.</span>
                </div>
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

                <div style={{ display:'flex', flexDirection:'column', gap:13, marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:11.5, color:'var(--text-secondary)', marginBottom:5, fontWeight:600 }}>Your Name <span style={{ color:'#ef4444' }}>*</span></div>
                    <input value={gName} onChange={e=>setGName(e.target.value)} placeholder="e.g. Ankit Sharma" style={inpStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize:11.5, color:'var(--text-secondary)', marginBottom:5, fontWeight:600 }}>Phone / WhatsApp <span style={{ color:'#ef4444' }}>*</span></div>
                    <input value={gPhone} onChange={e=>setGPhone(e.target.value)} placeholder="+971 50 000 0000" inputMode="tel" style={inpStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize:11.5, color:'var(--text-secondary)', marginBottom:5, fontWeight:600 }}>Your Area in Dubai <span style={{ color:'#ef4444' }}>*</span></div>
                    <select value={gArea} onChange={e=>setGArea(e.target.value)} style={inpStyle}>
                      <option value="">Select area...</option>
                      {DUBAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                {customer && (
                  <div style={{ background:'#f0faff', border:'0.5px solid #b3d9f0', borderRadius:8, padding:'8px 11px', fontSize:10.5, color:'#0077aa', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
                    <i className="ti ti-user-check" style={{ fontSize:13 }} />
                    Signed in as {customer.full_name || customer.email?.split('@')[0]}
                  </div>
                )}

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
      <ChatDrawer open={!!chatCo} onClose={()=>setChatCo(null)} company={chatCo} leadId={leadId} customer={customer} mobile={mobile} />
    </>
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

function RightPanel({ recentReviews, trending, onCompanyClick }) {
  const [email,           setEmail]           = useState('')
  const [subscribed,      setSubscribed]       = useState(false)
  const [sponsoredCos,    setSponsoredCos]     = useState([])
  const [quoteModal,      setQuoteModal]       = useState(null)
  const [quoteForm,       setQuoteForm]        = useState({ name:'', phone:'', message:'' })
  const [quoteSubmitting, setQuoteSubmitting]  = useState(false)
  const [quoteDone,       setQuoteDone]        = useState(false)
  const [installPrompt,   setInstallPrompt]    = useState(null)

  const reviews = recentReviews || []

  useEffect(() => {
    fetchSponsoredSlots()
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
    } else {
      alert('To add Quvera to your home screen:\n\n• iPhone (Safari): tap Share → "Add to Home Screen"\n• Android (Chrome): tap menu (⋮) → "Add to Home screen"')
    }
  }

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
    if (!quoteForm.name||!quoteForm.phone) { alert('Name and phone are required!'); return }
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

  const displaySponsored = sponsoredCos
  const isRealData       = sponsoredCos.length>0
  const avColors = [
    { bg:'#ede9fe', color:'#5b21b6' },
    { bg:'#fef3c7', color:'#92400e' },
    { bg:'#d1fae5', color:'#065f46' },
  ]

  return (
    <div style={{ width:230, flexShrink:0, background:'var(--bg-card)', borderLeft:'0.5px solid var(--border-default)', padding:12, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>

      <div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-ad-2" style={{ fontSize:11, color:'#0099cc' }}/> Sponsored
        </div>
        {sponsoredCos.length === 0 ? (
          <div onClick={()=>window.open('https://business.quvera.ae','_blank')}
            style={{ background:'#f0faff', border:'0.5px dashed #b3d9f0', borderRadius:8, padding:'12px 10px', cursor:'pointer', textAlign:'center' }}>
            <i className="ti ti-speakerphone" style={{ fontSize:18, color:'#0099cc', display:'block', marginBottom:5 }} />
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>Advertise here</div>
            <div style={{ fontSize:8, color:'var(--text-muted)', marginBottom:8, lineHeight:1.5 }}>Promote your business to Dubai customers</div>
            <span style={{ display:'inline-block', background:'#0099cc', color:'#fff', borderRadius:5, padding:'5px 12px', fontSize:9, fontWeight:700 }}>List your business →</span>
          </div>
        ) : displaySponsored.map((slot,i) => {
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

      <div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-trending-up" style={{ fontSize:11, color:'#0099cc' }}/> Trending
        </div>
        {(!trending || trending.length === 0) ? (
          <div style={{ fontSize:8.5, color:'var(--text-muted)', padding:'4px 0' }}>Gathering trends…</div>
        ) : trending.map((co,i) => (
          <div key={co.id||i} onClick={()=>onCompanyClick && onCompanyClick(co)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 0', borderBottom:i<trending.length-1?'0.5px solid var(--border-default)':'none', cursor:'pointer' }}>
            <span style={{ fontSize:10, fontWeight:700, width:14, color:i<2?'#f5a623':'var(--text-muted)', flexShrink:0 }}>{i+1}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{co.name||'—'}</div>
              <div style={{ fontSize:7.5, color:'var(--text-muted)' }}>{co.category||co.categories?.[0]||'—'}</div>
            </div>
            <i className="ti ti-arrow-up-right" style={{ fontSize:10, color:'#0099cc', flexShrink:0 }}/>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-message-circle" style={{ fontSize:11, color:'#0099cc' }}/> Recent Reviews
        </div>
        {reviews.length === 0 ? (
          <div style={{ fontSize:8.5, color:'var(--text-muted)', padding:'6px 0', lineHeight:1.5 }}>No reviews yet — be the first to review a company you've worked with.</div>
        ) : reviews.slice(0,3).map((r,i) => (
          <div key={r.id||i} style={{ display:'flex', gap:7, padding:'5px 0', borderBottom:i<Math.min(reviews.length,3)-1?'0.5px solid var(--border-default)':'none' }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:['#0099cc','#7c3aed','#059669'][i%3], display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }}>
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

      <div style={{ background:'#1a2744', borderRadius:10, padding:10 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#fff', marginBottom:2, display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-device-mobile" style={{ fontSize:11, color:'#0099cc' }}/> Add to Home Screen
        </div>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.45)', marginBottom:8, lineHeight:1.5 }}>Install Quvera on your device — open it like an app.</div>
        <button onClick={installApp}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'rgba(0,153,204,0.2)', border:'0.5px solid rgba(0,153,204,0.4)', borderRadius:7, padding:'8px 4px', cursor:'pointer' }}>
          <i className="ti ti-download" style={{ fontSize:14, color:'#0099cc' }}/>
          <span style={{ fontSize:9.5, color:'#fff', fontWeight:700 }}>Add to Home Screen</span>
        </button>
      </div>

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

function Sidebar({ navigate, scrollToSection }) {
  const sections = [
    { label:'Browse', items:[
      { icon:'ti-home',    name:'Home',           active:true, action:()=>scrollToSection('top') },
      { icon:'ti-search',  name:'Search',         action:()=>navigate('search',{}) },
      { icon:'ti-star',    name:'Top Rated',      action:()=>navigate('search',{sort:'rating'}) },
      { icon:'ti-map-pin', name:'By Area',        action:()=>scrollToSection('by-area') },
      { icon:'ti-clock',   name:'Recently Added', action:()=>navigate('search',{sort:'recent'}) },
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
      { icon:'ti-map-2',      name:'City Map',      action:()=>scrollToSection('city-network') },
      { icon:'ti-chart-line', name:'Review Trends', action:()=>scrollToSection('review-trends') },
      { icon:'ti-users',      name:'Community',     action:()=>navigate('search',{}) },
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
      style={{ background:plan==='gold'?'#fffef8':plan==='platinum'?'#fdfbff':'var(--bg-card)', border:`0.5px solid ${plan==='gold'?'rgba(232,184,75,0.5)':plan==='platinum'?'rgba(139,92,246,0.35)':'var(--border-default)'}`, borderRadius:10, padding:'9px 10px', cursor:'pointer', transition:'all 0.15s', height:92, boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,153,204,0.12)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <div style={{ width:28, height:28, borderRadius:7, background:av.bg, color:av.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{initials}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div style={{ fontSize:7.5, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{company?.category||company?.categories?.[0]||'—'}</div>
        </div>
      </div>
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', minHeight:18 }}>{badge}</div>
        <div style={{ fontSize:7.5, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:2, minHeight:11 }}>{extra}</div>
      </div>
    </div>
  )
}

function PlanTag({ plan }) {
  if (plan==='gold')     return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#fef3c7', color:'#92400e' }}>Gold</span>
  if (plan==='platinum') return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#ede9fe', color:'#5b21b6' }}>Platinum</span>
  return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>✓</span>
}

/* New/Listed badge helper — shows star rating only when real reviews exist, else a neutral "New" pill */
function ratingBadgeEl(c) {
  const hasReviews = (c?.total_reviews || 0) > 0 && (parseFloat(c?.avg_rating) || 0) > 0
  if (hasReviews) return <span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{Number(c.avg_rating).toFixed(1)}★</span>
  return <span style={{ fontSize:7, background:'#e0f9ff', color:'#0077aa', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>New</span>
}

function SiteFooter() {
  const linkStyle = { fontSize:10.5, fontWeight:600, color:'var(--text-secondary)', textDecoration:'none', cursor:'pointer' }
  return (
    <div style={{ background:'var(--bg-card)', borderTop:'0.5px solid var(--border-default)', padding:'14px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
        <a href="/terms" style={linkStyle}>Terms of Service</a>
        <a href="/privacy" style={linkStyle}>Privacy Policy</a>
        <a href="/refund" style={linkStyle}>Refund Policy</a>
      </div>
      <div style={{ fontSize:9.5, color:'var(--text-muted)', textAlign:'right' }}>
        © 2026 RenoFix Plus Technical Contracting L.L.C · operating Quvera
      </div>
    </div>
  )
}

export default function Home({ navigate }) {
  const [topCos,        setTopCos]        = useState([])
  const [approvedCos,   setApprovedCos]   = useState([])
  const [newCos,        setNewCos]        = useState([])
  const [trending,      setTrending]      = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [categories,    setCategories]    = useState([])
  const [areaList,      setAreaList]      = useState([])
  const [areaFilter,    setAreaFilter]    = useState('')
  const [stats,         setStats]         = useState({ companies:0, reviews:0, avgRating:'0.0', verified:0 })
  const [reviewData,    setReviewData]    = useState({ total:0, s5:0, s4:0, s3:0, s2:0, s1:0, s5_pct:0, s4_pct:0 })
  const [trustScore,    setTrustScore]    = useState(0)
  const [thresholds,    setThresholds]    = useState({ min_companies:50, min_reviews:100, min_rating:3.5, min_rating_reviews:50, min_verified:100, trust_score_min_verified:100 })
  const [loading,       setLoading]       = useState(true)
  const [customer,      setCustomer]      = useState(null)
  const [showUserMenu,  setShowUserMenu]  = useState(false)
  const [blockedMsg,    setBlockedMsg]    = useState(null)
  const [hasActiveForm, setHasActiveForm] = useState(false)
  const [authChecked,   setAuthChecked]   = useState(false)
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [profileGateOpen, setProfileGateOpen] = useState(false)
  const [requireLogin, setRequireLogin] = useState(false)
  const device    = useDevice()
  const isMobile  = device === 'mobile'
  const isTablet  = device === 'tablet'
  const isDesktop = device === 'desktop'

  const BIZ_URL = 'https://business.quvera.ae'

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

  // Auto-open quote modal from ?quote=1 (landing/service pages) or a saved intent after login.
  // Logged OUT + ?quote=1 → save intent, send to Google login, then re-open the form on return.
  useEffect(() => {
    if (!authChecked || !hasActiveForm) return

    let urlIntent = false
    let savedIntent = false
    try {
      const sp = new URLSearchParams(window.location.search)
      urlIntent = sp.get('quote') === '1'
      savedIntent = sessionStorage.getItem('td_quote_intent') === '1'
    } catch(e) {}

    if (!urlIntent && !savedIntent) return

    // No login required → open the form directly (guests allowed, zero friction)
    if (!requireLogin) {
      try { sessionStorage.removeItem('td_quote_intent') } catch(e) {}
      try { window.history.replaceState({}, '', '/') } catch(e) {}
      setLeadModalOpen(true)
      return
    }

    // Logged in → clear intent, clean the URL, open form (or profile gate)
    if (customer) {
      try { sessionStorage.removeItem('td_quote_intent') } catch(e) {}
      try { window.history.replaceState({}, '', '/') } catch(e) {}
      if (profileComplete(customer)) setLeadModalOpen(true)
      else setProfileGateOpen(true)
      return
    }

    // Logged OUT — only auto-start login when it came from the URL (avoids a login loop
    // if the user cancels Google and returns with just the saved intent).
    if (urlIntent) {
      try { sessionStorage.setItem('td_quote_intent', '1') } catch(e) {}
      try { window.history.replaceState({}, '', '/') } catch(e) {}
      signInWithGoogle()
    }
  }, [authChecked, customer, hasActiveForm, requireLogin])

  function scrollToSection(id) {
    if (id === 'top') { window.scrollTo({ top:0, behavior:'smooth' }); return }
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
  }

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

  function profileComplete(c) {
    return !!(c && c.phone && c.phone.trim() && c.area && c.area.trim())
  }

  function openQuotes() {
    if (requireLogin && !customer) {
      try { sessionStorage.setItem('td_quote_intent', '1') } catch(e) {}
      signInWithGoogle(); return
    }
    if (requireLogin && customer && !profileComplete(customer)) { setProfileGateOpen(true); return }
    setLeadModalOpen(true)
  }

  function onProfileComplete(updated) {
    setCustomer(updated)
    setProfileGateOpen(false)
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
      // all reads (incl. admin thresholds) fire in parallel for speed.
      // allSettled = one failing/slow query never blanks the whole homepage.
      const results = await Promise.allSettled([
        supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('companies').select('*',{count:'exact',head:true}).eq('status','approved'),
        supabase.from('reviews').select('*',{count:'exact',head:true}).eq('is_approved',true),
        supabase.from('companies').select('*',{count:'exact',head:true}).eq('status','approved').eq('is_verified',true),
        supabase.from('companies').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(50),
        supabase.from('reviews').select('rating,created_at').eq('is_approved',true),
        supabase.from('reviews').select('id,reviewer_name,rating,review_text,created_at').eq('is_approved',true).order('created_at',{ascending:false}).limit(5),
        supabase.from('companies').select('area').eq('status','approved'),
      ])
      const val = (i) => (results[i] && results[i].status === 'fulfilled') ? results[i].value : {}
      const settingsRow = val(0).data
      const totalCo     = val(1).count
      const totalRev    = val(2).count
      const verifiedCo  = val(3).count
      const allCo       = val(4).data
      const revAll      = val(5).data       // one fetch reused for avg + monthly graph
      const recentRev   = val(6).data
      const areaRows    = val(7).data
      const ratData     = revAll
      const revData     = revAll

      let th = thresholds
      if (settingsRow) { th = { ...thresholds, ...settingsRow }; setThresholds(th); setRequireLogin(settingsRow.require_login_for_quotes === true) }
      const avg = ratData?.length>0 ? (ratData.reduce((s,r)=>s+r.rating,0)/ratData.length).toFixed(1) : '0.0'
      setStats({ companies:totalCo||0, reviews:totalRev||0, avgRating:avg, verified:verifiedCo||0 })
      const approved = allCo||[]
      setApprovedCos(approved)
      // Homepage Top Rated + Trending = only verified companies rated >= min_rating (default 3.5)
      const minR = parseFloat(th.min_rating) || 3.5
      const verifiedRated = approved.filter(c => c.is_verified && (parseFloat(c.avg_rating)||0) >= minR)
      setTopCos([...verifiedRated].sort((a,b)=>(b.avg_rating||0)-(a.avg_rating||0)).slice(0,4))
      setNewCos([...approved].slice(0,4))
      setTrending([...verifiedRated].sort((a,b)=>
        ((b.profile_views||0)+(b.total_reviews||0)*3) - ((a.profile_views||0)+(a.total_reviews||0)*3)
      ).slice(0,5))
      const counts = {}
      ;(areaRows||[]).forEach(r => { const a=(r.area||'').trim(); if(a) counts[a]=(counts[a]||0)+1 })
      const areaArr = Object.entries(counts).map(([area,count])=>({area,count})).sort((a,b)=>b.count-a.count)
      setAreaList(areaArr)
      setAreaFilter(prev => prev || areaArr[0]?.area || '')
      setRecentReviews(recentRev||[])
      const monthStart = new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString()
      const tm = (revData||[]).filter(r=>r.created_at>=monthStart)
      const s5=tm.filter(r=>r.rating===5).length, s4=tm.filter(r=>r.rating===4).length
      const s3=tm.filter(r=>r.rating===3).length, s2=tm.filter(r=>r.rating===2).length
      const s1=tm.filter(r=>r.rating===1).length, total=tm.length
      setReviewData({ total,s5,s4,s3,s2,s1, s5_pct:total>0?Math.round(s5/total*100):0, s4_pct:total>0?Math.round(s4/total*100):0 })
      setTrustScore(Math.min(100,Math.round(((verifiedCo||0)/Math.max(totalCo||1,1))*40+(parseFloat(avg)/5)*40+Math.min((totalRev||0)/100,1)*20)))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function checkCustomer() {
    try {
      const cust = await getCustomer()
      if (cust && cust.blocked) {
        setCustomer(null)
        setBlockedMsg(cust.companyName || 'your business')
        return
      }
      setCustomer(cust)
    } finally {
      setAuthChecked(true)
    }
  }

  function goTo(c) {
    if (!c?.id) return
    if (c.slug) window.location.href = '/'+c.slug
    else navigate('company',{company:c})
  }

  // exact numbers with thousands separators (e.g. 1,095) — no "1K+" rounding
  function fmtExact(n) {
    return Number(n || 0).toLocaleString('en-US')
  }

  // ── Live stat visibility — show real numbers as soon as they exist ──
  const showCompanies = (stats.companies||0) > 0
  const showReviews   = (stats.reviews||0)   > 0
  const showRating    = (parseFloat(stats.avgRating)||0) > 0 && (stats.reviews||0) > 0
  const showVerified  = (stats.verified||0)  > 0
  const statFlags     = { companies: showCompanies, reviews: showReviews, avgRating: showRating, verified: showVerified }
  const anyStat       = showCompanies || showReviews || showRating || showVerified
  const showTrustScore = (stats.verified||0) >= (thresholds.trust_score_min_verified ?? 100)

  const byAreaCompanies = areaFilter
    ? approvedCos.filter(c => (c.area||c.location||'').trim().toLowerCase() === areaFilter.toLowerCase()).slice(0,4)
    : []

  const BlockedBanner = blockedMsg ? (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:3000, background:'#fef2f2', borderBottom:'1px solid #fecaca', padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
      <i className="ti ti-alert-triangle" style={{ fontSize:20, color:'#dc2626', flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>This email is registered as a business</div>
        <div style={{ fontSize:11.5, color:'#b91c1c', marginTop:1 }}>
          "{blockedMsg}" uses this email on Quvera. Please use the Business Portal to manage it. Customer login needs a different email.
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

  function Topbar({ fixed }) {
    const navItems = [
      { l:'Home',       action:()=>scrollToSection('top'), active:true },
      { l:'Categories', action:()=>scrollToSection('services-row') },
      { l:'Top Rated',  action:()=>navigate('search',{sort:'rating'}) },
      { l:'By Area',    action:()=>scrollToSection('by-area') },
      { l:'City Map',   action:()=>scrollToSection('city-network') },
    ]
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 20px', height:48, background:'var(--bg-card)', borderBottom:'0.5px solid var(--border-default)', position: fixed ? 'fixed' : 'sticky', top:0, left:0, right:0, zIndex:200, width:'100%', boxSizing:'border-box' }}>
        <Logo size={15} />
        <nav style={{ display:'flex', gap:4, marginLeft:8 }}>
          {navItems.map((it)=>(
            <button key={it.l} onClick={it.action}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, fontWeight:it.active?700:500, color:it.active?'#0099cc':'var(--text-muted)', borderBottom:it.active?'1.5px solid #0099cc':'none', padding:'0 8px', height:48, whiteSpace:'nowrap' }}>
              {it.l}
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
          <button onClick={()=>navigate('claim-company')}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', border:'0.5px solid var(--border-default)', borderRadius:99, background:'var(--bg-secondary)', color:'var(--text-secondary)', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            <i className="ti ti-discount-check" style={{ fontSize:10 }} /> Claim your company
          </button>
          <button onClick={()=>window.open(BIZ_URL,'_blank')}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', border:'0.5px solid #b3d9f0', borderRadius:99, background:'#f0faff', color:'#0099cc', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            <i className="ti ti-briefcase" style={{ fontSize:9 }} /> {customer ? 'My Business' : 'List Business'}
          </button>
          {customer ? (
            <div style={{ position:'relative' }}>
              <button onClick={()=>navigate('my-account')}
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
    <button onClick={()=>{navigate('my-requests');setShowUserMenu(false)}}
      style={{ width:'100%', padding:'7px 8px', background:'transparent', color:'var(--text-primary)', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
      <i className="ti ti-clipboard-list" style={{ fontSize:12 }}/> My Requests
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
            {anyStat ? (
              [['companies','Companies'],['reviews','Reviews'],['avgRating','Avg Rating'],['verified','Verified']]
                .filter(([k]) => statFlags[k])
                .map(([k,l])=>(
                  <div key={k} style={{ background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, padding:'6px 12px', textAlign:'center', minWidth:65 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0099cc', lineHeight:1 }}>{k==='avgRating'?stats.avgRating+'★':fmtExact(stats[k])}</div>
                    <div style={{ fontSize:7.5, color:'var(--text-muted)', marginTop:2 }}>{l}</div>
                  </div>
                ))
            ) : (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:99, padding:'7px 14px' }}>
                <i className="ti ti-shield-check" style={{ fontSize:12, color:'#0099cc' }} />
                <span style={{ fontSize:10, color:'var(--text-secondary)', fontWeight:600 }}>Trusted platform · growing daily</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function ServicesRow() {
    return (
      <div id="services-row" style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'7px 10px', marginBottom:8 }}>
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
          <div key={i} style={{ height:92, background:'linear-gradient(90deg,var(--bg-tertiary) 25%,var(--bg-secondary) 50%,var(--bg-tertiary) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite', borderRadius:10 }}>
            <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          </div>
        ))}
      </div>
    )
  }

  function EmptyTopRated() {
    return (
      <div style={{ textAlign:'center', padding:'18px 10px', fontSize:9, color:'var(--text-muted)' }}>
        <i className="ti ti-star" style={{ fontSize:18, color:'#0099cc', display:'block', marginBottom:6, opacity:0.7 }} />
        Top rated companies will appear here as verified reviews grow.
      </div>
    )
  }

  function ByAreaCard() {
    const areaChips = areaList.slice(0, 6)
    return (
      <div id="by-area" style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
        <SecHeader icon="ti-map-pin" title="By Area" subtitle={areaFilter ? '· '+areaFilter : ''}
          viewAll={areaFilter ? 'View all →' : null}
          onViewAll={()=>navigate('search',{area:areaFilter})} />
        {areaChips.length === 0 ? (
          <div style={{ fontSize:9, color:'var(--text-muted)', padding:'6px 0' }}>No areas yet.</div>
        ) : (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:9 }}>
            {areaChips.map(a=>(
              <span key={a.area} onClick={()=>setAreaFilter(a.area)}
                style={{ fontSize:7.5, padding:'3px 8px', borderRadius:99, cursor:'pointer', fontWeight:600,
                  background: areaFilter===a.area ? '#0099cc' : '#e0f9ff',
                  color: areaFilter===a.area ? '#fff' : '#0077aa' }}>
                {a.area} ({a.count})
              </span>
            ))}
          </div>
        )}
        {byAreaCompanies.length > 0 ? (
          <CardGrid companies={byAreaCompanies}
            renderBadge={(c)=>(
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                {ratingBadgeEl(c)}
                <PlanTag plan={c.plan} />
              </div>
            )}
            renderExtra={(c)=><><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
          />
        ) : (
          <div style={{ textAlign:'center', padding:'14px 8px', fontSize:9, color:'var(--text-muted)' }}>
            {areaFilter ? `No companies listed in ${areaFilter} yet.` : 'Select an area above.'}
            {areaFilter && <div onClick={()=>navigate('search',{area:areaFilter})} style={{ color:'#0099cc', fontWeight:600, cursor:'pointer', marginTop:6 }}>Search in {areaFilter} →</div>}
          </div>
        )}
      </div>
    )
  }

  function CityNetworkCard({ height = 120 }) {
    const chips = areaList.slice(0, 8)
    return (
      <div id="city-network" style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
        <SecHeader icon="ti-map-2" title="City Network" subtitle={areaList.length ? '· '+areaList.length+' areas' : ''} />
        <CityMap height={height} />
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:7 }}>
          {chips.length === 0 ? (
            <span style={{ fontSize:7.5, color:'var(--text-muted)' }}>Areas appear as companies are added.</span>
          ) : chips.map(a=>(
            <span key={a.area} onClick={()=>navigate('search',{area:a.area})}
              style={{ fontSize:7.5, background:'#e0f9ff', color:'#0077aa', padding:'2px 7px', borderRadius:4, fontWeight:600, cursor:'pointer' }}>
              {a.area} · {a.count}
            </span>
          ))}
        </div>
      </div>
    )
  }

  function MainContent() {
    const empty = [null,null,null,null]
    const novo = loading ? empty : (newCos.length>0 ? newCos : empty)
    return (
      <div style={{ flex:1, minWidth:0, padding:'10px 14px', background:'var(--bg-secondary)', overflowX:'hidden' }}>
        <ServicesRow />
        {showTrustScore && <TrustWave score={trustScore} />}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8, alignItems:'stretch' }}>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
            <SecHeader icon="ti-star" title="Top Rated Companies" viewAll="View all →" onViewAll={()=>navigate('search',{sort:'rating'})} />
            {!loading && topCos.length === 0
              ? <EmptyTopRated />
              : <CardGrid companies={loading ? empty : topCos}
                  renderBadge={(c)=>(
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      {ratingBadgeEl(c)}
                      <PlanTag plan={c.plan} />
                    </div>
                  )}
                  renderExtra={(c)=><><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                />
            }
          </div>
          <ByAreaCard />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8, alignItems:'stretch' }}>
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
            <SecHeader icon="ti-clock" title="Recently Added" viewAll="View all →" onViewAll={()=>navigate('search',{sort:'recent'})} />
            <CardGrid companies={novo}
              renderBadge={()=>(
                <span style={{ fontSize:7, background:'#e0f9ff', color:'#0077aa', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>New</span>
              )}
              renderExtra={(c)=><><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
            />
          </div>
          <CityNetworkCard height={120} />
        </div>
        <div id="review-trends">
          <ReviewGraph data={reviewData} />
        </div>
      </div>
    )
  }

  function BottomNav() {
    return (
      <div style={{ position:'fixed', bottom:0, left:0, right:0, maxWidth:480, margin:'0 auto', background:'var(--bg-card)', borderTop:'0.5px solid var(--border-default)', padding:'8px 0 10px', display:'flex', justifyContent:'space-around', zIndex:100 }}>
        {[
          { icon:'ti-home',           label:'Home',     active:true, action:()=>scrollToSection('top') },
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
  const ProfileGate = <ProfileGateModal open={profileGateOpen} onClose={()=>setProfileGateOpen(false)} customer={customer} onComplete={onProfileComplete} mobile={isMobile} />

  if (isMobile) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh', paddingBottom:72, overflowX:'hidden' }}>
        {BlockedBanner}
        {LeadModal}
        {ProfileGate}
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
                <button onClick={()=>navigate('my-account')}
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
                    <button onClick={()=>{navigate('my-requests');setShowUserMenu(false)}}
                      style={{ width:'100%', padding:'7px 8px', background:'transparent', color:'var(--text-primary)', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <i className="ti ti-clipboard-list" style={{ fontSize:12 }}/> My Requests
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
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:99, padding:'3px 10px', marginBottom:10 }}>
            <i className="ti ti-shield-check" style={{ fontSize:10, color:'#0099cc' }} />
            <span style={{ fontSize:9, color:'#0099cc', fontWeight:600 }}>Dubai's Most Trusted Review Platform</span>
          </div>
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
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Categories</span>
            <button onClick={()=>navigate('search',{})} style={{ background:'none', border:'none', fontSize:9, color:'#0099cc', cursor:'pointer', fontWeight:600 }}>View all</button>
          </div>
          <div style={{ display:'flex', gap:9, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none', msOverflowStyle:'none' }}>
            {categories.length === 0 ? (
              [1,2,3,4,5,6].map(i => <div key={i} style={{ flexShrink:0, width:70, height:70, background:'var(--bg-card)', borderRadius:14 }} />)
            ) : categories.map(c=>(
              <div key={c.id} onClick={()=>navigate('search',{category:c.name})}
                style={{ flexShrink:0, width:70, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <div style={{ width:70, height:70, background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30 }}>
                  {c.icon || '🏷️'}
                </div>
                <span style={{ fontSize:9, color:'var(--text-secondary)', textAlign:'center', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {areaList.length > 0 && (
          <div style={{ padding:'6px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>By Area</span>
              {areaFilter && <button onClick={()=>navigate('search',{area:areaFilter})} style={{ background:'none', border:'none', fontSize:9, color:'#0099cc', cursor:'pointer', fontWeight:600 }}>View all</button>}
            </div>
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:6 }}>
              {areaList.slice(0,8).map(a=>(
                <span key={a.area} onClick={()=>setAreaFilter(a.area)}
                  style={{ flexShrink:0, fontSize:10, padding:'6px 12px', borderRadius:99, cursor:'pointer', fontWeight:600,
                    background: areaFilter===a.area ? '#0099cc' : 'var(--bg-card)',
                    border:`0.5px solid ${areaFilter===a.area ? '#0099cc' : 'var(--border-default)'}`,
                    color: areaFilter===a.area ? '#fff' : 'var(--text-secondary)', whiteSpace:'nowrap' }}>
                  {a.area} ({a.count})
                </span>
              ))}
            </div>
            <div style={{ marginTop:8 }}>
              {byAreaCompanies.length > 0
                ? byAreaCompanies.map(c=><CompanyCard key={c.id} company={c} onClick={()=>goTo(c)} />)
                : <div style={{ fontSize:10, color:'var(--text-muted)', padding:'8px 0', textAlign:'center' }}>{areaFilter ? `No companies in ${areaFilter} yet.` : 'Select an area.'}</div>
              }
            </div>
          </div>
        )}

        <div style={{ padding:'6px 14px' }}>
          {showTrustScore && <TrustWave score={trustScore} />}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Top Rated</span>
            <button onClick={()=>navigate('search',{sort:'rating'})} style={{ background:'none', border:'none', fontSize:9, color:'#0099cc', cursor:'pointer', fontWeight:600 }}>View all</button>
          </div>
          {loading
            ? [1,2,3].map(i=><div key={i} style={{ height:70, background:'var(--bg-tertiary)', borderRadius:10, marginBottom:6 }}/>)
            : topCos.length > 0
              ? topCos.map(c=><CompanyCard key={c.id} company={c} onClick={()=>goTo(c)} />)
              : <div style={{ textAlign:'center', padding:'16px 10px', fontSize:10, color:'var(--text-muted)' }}>
                  <i className="ti ti-star" style={{ fontSize:18, color:'#0099cc', display:'block', marginBottom:6, opacity:0.7 }} />
                  Top rated companies will appear here as verified reviews grow.
                </div>
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
        {ProfileGate}
        <Topbar />
        <Hero />
        <div style={{ display:'flex' }}>
          <Sidebar navigate={navigate} scrollToSection={scrollToSection} />
          <div style={{ flex:1, minWidth:0, padding:'10px 16px' }}>
            <ServicesRow />
            {showTrustScore && <TrustWave score={trustScore} />}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8, alignItems:'stretch' }}>
              <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
                <SecHeader icon="ti-star" title="Top Rated" viewAll="View all →" onViewAll={()=>navigate('search',{sort:'rating'})} />
                {!loading && topCos.length === 0
                  ? <EmptyTopRated />
                  : <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:7 }}>
                      {(loading ? [null,null,null,null] : topCos.slice(0,4)).map((c,i)=> c ? (
                        <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                          badge={ratingBadgeEl(c)}
                          extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                        />
                      ) : <div key={i} style={{ height:92, background:'var(--bg-tertiary)', borderRadius:10 }} />)}
                    </div>
                }
              </div>
              <ByAreaCard />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8, alignItems:'stretch' }}>
              <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px' }}>
                <SecHeader icon="ti-clock" title="Recently Added" viewAll="View all →" onViewAll={()=>navigate('search',{sort:'recent'})} />
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:7 }}>
                  {(loading ? [null,null,null,null] : newCos.slice(0,4)).map((c,i)=> c ? (
                    <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                      badge={<span style={{ fontSize:7, background:'#e0f9ff', color:'#0077aa', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>New</span>}
                      extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                    />
                  ) : <div key={i} style={{ height:92, background:'var(--bg-tertiary)', borderRadius:10 }} />)}
                </div>
              </div>
              <CityNetworkCard height={120} />
            </div>
            <div id="review-trends">
              <ReviewGraph data={reviewData} />
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh' }}>
      {BlockedBanner}
      {LeadModal}
      {ProfileGate}
      <Topbar fixed />
      <div style={{ height:48 }} />
      <Hero />
      <div style={{ display:'flex', alignItems:'stretch' }}>
        <Sidebar navigate={navigate} scrollToSection={scrollToSection} />
        <MainContent />
        <RightPanel recentReviews={recentReviews} trending={trending} onCompanyClick={goTo} />
      </div>
      <SiteFooter />
    </div>
  )
}
