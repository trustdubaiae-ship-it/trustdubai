import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getCustomer, signOut, signInWithGoogle } from '../customerAuth'

/* ===================== Chat drawer (customer side) ===================== */
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
          .eq('lead_id', leadId).eq('company_id', company.id)
          .order('created_at', { ascending: true })
        if (!alive) return
        setMessages(data || [])
        const unread = (data || []).filter(m => m.sender_type === 'company' && !m.read_by_customer)
        if (unread.length) {
          await supabase.from('lead_chat').update({ read_by_customer: true })
            .eq('lead_id', leadId).eq('company_id', company.id).eq('sender_type', 'company').eq('read_by_customer', false)
        }
      } catch (e) { console.error(e) }
      finally { if (alive) setLoading(false) }
    }
  }, [open, company, leadId])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setMessages(m => [...m, { id: 'tmp' + Date.now(), sender_type: 'customer', body, created_at: new Date().toISOString() }])
    setText('')
    try {
      await supabase.from('lead_chat').insert({
        lead_id: leadId, company_id: company.id, customer_id: customer?.id || null,
        sender_type: 'customer', body, read_by_customer: true,
      })
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  if (!open || !company) return null
  const name = company.name || 'Company'
  const initials = name.slice(0, 2).toUpperCase()
  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex', alignItems: mobile ? 'stretch' : 'center', justifyContent: mobile ? 'stretch' : 'flex-end' }
  const panel = { background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', width: mobile ? '100%' : 400, height: mobile ? '100%' : '88vh', maxHeight: mobile ? '100%' : '88vh', borderRadius: mobile ? 0 : '14px 0 0 14px', overflow: 'hidden' }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 17 }} />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 9, overflow: 'hidden', background: '#e0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {company.logo_url ? <img src={company.logo_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#0077aa' }}>{initials}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              {name} {company.is_verified && <i className="ti ti-rosette-discount-check-filled" style={{ fontSize: 12, color: '#1e9e63' }} />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {company.avg_rating ? '★ ' + Number(company.avg_rating).toFixed(1) : 'New'}{company.trust_score != null ? ' · Trust ' + Math.round(company.trust_score) : ''}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 9, WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>
              <div style={{ width: 22, height: 22, border: '3px solid #0099cc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 10px' }}>
              <i className="ti ti-message-2" style={{ fontSize: 26, color: '#0099cc', display: 'block', marginBottom: 8 }} />
              Start the conversation with {name}. Ask about your project, pricing, or timeline.
            </div>
          ) : messages.map(m => {
            const mine = m.sender_type === 'customer'
            return (
              <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ background: mine ? '#0099cc' : 'var(--bg-card)', color: mine ? '#fff' : 'var(--text-primary)', border: mine ? 'none' : '0.5px solid var(--border-default)', padding: '9px 12px', borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>{m.body}</div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textAlign: mine ? 'right' : 'left', marginTop: 3 }}>{new Date(m.created_at).toLocaleTimeString('en-AE', { hour: 'numeric', minute: '2-digit' })}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="Type a message…"
            style={{ flex: 1, height: 38, border: '0.5px solid var(--border-default)', borderRadius: 99, padding: '0 14px', fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
          <button onClick={send} disabled={sending || !text.trim()} style={{ width: 38, height: 38, borderRadius: '50%', background: '#0099cc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, cursor: 'pointer', opacity: (sending || !text.trim()) ? 0.6 : 1 }}>
            <i className="ti ti-send" style={{ fontSize: 17 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ===================== Status badge ===================== */
function StatusBadge({ status, unread }) {
  if (status === 'chatting') return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#0883ad', background: '#e3f6fc', padding: '7px 11px', borderRadius: 9, whiteSpace: 'nowrap' }}>
      <i className="ti ti-message-2" style={{ fontSize: 13 }} /> Chatting
      {unread > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 15, height: 15, borderRadius: 99, background: '#ef5a6f', color: '#fff', fontSize: 8.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 2px 6px rgba(239,90,111,.5)' }}>{unread}</span>}
    </span>
  )
  if (status === 'awaiting') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', padding: '7px 11px', borderRadius: 9, whiteSpace: 'nowrap' }}>Awaiting</span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#0aa2cf,#0883ad)', padding: '7px 11px', borderRadius: 9, whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(10,162,207,.3)' }}>
      <i className="ti ti-message-2" style={{ fontSize: 13 }} /> Message
    </span>
  )
}

function CompanyRow({ co, unread, status, lastMsg, onMessage }) {
  const name = co?.name || 'Company'
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div onClick={onMessage} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', borderTop: '0.5px solid var(--border-default)', cursor: 'pointer' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#e3f6fc,#d0eef8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {co?.logo_url ? <img src={co.logo_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 800, color: '#0883ad' }}>{initials}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          {co?.is_verified && <i className="ti ti-rosette-discount-check-filled" style={{ fontSize: 12, color: '#1ea672', flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ color: '#d9a441', fontWeight: 700 }}>★ {co?.avg_rating ? Number(co.avg_rating).toFixed(1) : 'New'}</span>
          {co?.total_reviews ? <span>{co.total_reviews} reviews</span> : null}
          {co?.trust_score != null && <span style={{ color: '#0aa2cf', fontWeight: 700 }}>Trust {Math.round(co.trust_score)}</span>}
        </div>
        {lastMsg && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-secondary)', padding: '6px 9px', borderRadius: 8 }}>
            <i className={lastMsg.mine ? 'ti ti-clock' : 'ti ti-corner-down-right'} style={{ fontSize: 12, color: '#0883ad', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastMsg.mine ? 'You: ' : ''}{lastMsg.body}</span>
          </div>
        )}
      </div>
      <StatusBadge status={status} unread={unread} />
    </div>
  )
}

function ComingSoon({ icon, title, text }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '40px 22px', textAlign: 'center' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 28, color: '#0099cc' }} />
      </div>
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>{text}</p>
      <span style={{ display: 'inline-block', marginTop: 14, fontSize: 11, fontWeight: 700, color: '#0099cc', background: 'rgba(0,153,204,0.1)', padding: '4px 12px', borderRadius: 99 }}>Coming soon</span>
    </div>
  )
}

function EmptyState({ icon, title, text, cta, onCta }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-default)', borderRadius: 16, padding: '40px 22px', textAlign: 'center' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 40, color: '#0099cc' }} />
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '12px 0 6px' }}>{title}</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto 18px' }}>{text}</p>
      {cta && <button onClick={onCta} style={{ padding: '11px 24px', background: '#0099cc', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{cta}</button>}
    </div>
  )
}

/* ===================== MAIN: My Account dashboard ===================== */
export default function MyAccount({ navigate }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('requests')
  const [requests, setRequests] = useState([])
  const [reviews, setReviews] = useState([])
  const [chat, setChat] = useState(null)
  const [mobile, setMobile] = useState(() => document.documentElement.clientWidth < 769)
  // profile edit
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    function onR() { setMobile(document.documentElement.clientWidth < 769) }
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  useEffect(() => {
    (async () => {
      const c = await getCustomer()
      if (!c || c.blocked) { setCustomer(null); setLoading(false); return }
      setCustomer(c)
      setEditName(c.full_name || ''); setEditPhone(c.phone || '')
      await Promise.all([loadRequests(c), loadReviews(c)])
      setLoading(false)
    })()
  }, [])

  async function loadRequests(c) {
    try {
      const { data: leads } = await supabase
        .from('lead_submissions').select('id, answers, created_at, status')
        .eq('customer_id', c.id).order('created_at', { ascending: false })
      const leadRows = leads || []
      if (leadRows.length === 0) { setRequests([]); return }
      const leadIds = leadRows.map(l => l.id)
      const { data: dists } = await supabase
        .from('lead_distributions')
        .select('lead_id, rank, companies(id,name,slug,logo_url,avg_rating,total_reviews,trust_score,is_verified,category,plan)')
        .in('lead_id', leadIds).order('rank', { ascending: true })
      const { data: chats } = await supabase
        .from('lead_chat').select('lead_id, company_id, sender_type, body, created_at, read_by_customer').order('created_at', { ascending: true }).in('lead_id', leadIds)
      const built = leadRows.map(l => {
        const cos = (dists || []).filter(d => d.lead_id === l.id).map(d => d.companies).filter(Boolean)
        const unreadByCompany = {}, statusByCompany = {}, lastMsgByCompany = {}
        cos.forEach(co => {
          const msgs = (chats || []).filter(m => m.lead_id === l.id && m.company_id === co.id)
          const hasCustomer = msgs.some(m => m.sender_type === 'customer')
          const hasCompany = msgs.some(m => m.sender_type === 'company')
          statusByCompany[co.id] = hasCompany ? 'chatting' : hasCustomer ? 'awaiting' : 'new'
          const u = msgs.filter(m => m.sender_type === 'company' && !m.read_by_customer).length
          if (u) unreadByCompany[co.id] = u
          if (msgs.length) {
            const last = msgs[msgs.length - 1]
            lastMsgByCompany[co.id] = { body: last.body, mine: last.sender_type === 'customer' }
          }
        })
        const service = l.answers?.['Service Category'] || l.answers?.category || l.answers?.['Project Type'] || 'Service request'
        const area = l.answers?._area || l.answers?.['Area'] || l.answers?.area || ''
        const hasAnyChat = (chats || []).some(m => m.lead_id === l.id)
        return { id: l.id, created_at: l.created_at, service, area, companies: cos, unreadByCompany, statusByCompany, lastMsgByCompany, hasAnyChat }
      })
      setRequests(built)
    } catch (e) { console.error(e) }
  }

  async function loadReviews(c) {
    try {
      const { data } = await supabase
        .from('reviews').select('*, companies(name, category, area, avg_rating)')
        .eq('customer_id', c.id).order('created_at', { ascending: false })
      setReviews(data || [])
    } catch (e) { console.error(e) }
  }

  function openChat(leadId, company) {
    setChat({ leadId, company })
    setRequests(prev => prev.map(r => {
      if (r.id !== leadId) return r
      const u = { ...r.unreadByCompany }; delete u[company.id]
      return { ...r, unreadByCompany: u }
    }))
  }

  async function saveProfile() {
    if (!editName.trim()) return
    setSavingProfile(true)
    const { data } = await supabase.from('customers')
      .update({ full_name: editName, phone: editPhone, updated_at: new Date().toISOString() })
      .eq('id', customer.id).select().single()
    if (data) setCustomer(data)
    setSavingProfile(false); setEditMode(false)
  }

  async function handleSignOut() { await signOut(); navigate('home') }

  const t1 = 'var(--text-primary)', t2 = 'var(--text-secondary)', t3 = 'var(--text-muted)'
  const card = 'var(--bg-card)', line = 'var(--border-default)', soft = 'var(--bg-secondary)'

  const totalUnread = requests.reduce((sum, r) => sum + Object.values(r.unreadByCompany || {}).reduce((a, b) => a + b, 0), 0)
  const msgRequests = requests.filter(r => r.hasAnyChat || Object.keys(r.unreadByCompany).length > 0)

  const NAV = [
    { id: 'requests', label: 'My Requests', icon: 'ti-clipboard-list' },
    { id: 'messages', label: 'Messages', icon: 'ti-message-2', badge: totalUnread },
    { id: 'quotes', label: 'Quotes', icon: 'ti-file-invoice' },
    { id: 'projects', label: 'Projects', icon: 'ti-clipboard-check' },
    { id: 'reviews', label: 'My Reviews', icon: 'ti-star' },
    { id: 'profile', label: 'Profile', icon: 'ti-user' },
    { id: 'settings', label: 'Settings', icon: 'ti-settings' },
  ]

  const initials = ((customer?.full_name || customer?.email || 'U')[0] || 'U').toUpperCase() + ((customer?.full_name || '').split(' ')[1]?.[0] || '').toUpperCase()
  const joinDate = customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' }) : '—'
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'

  if (loading) return (
    <div style={{ background: soft, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 30, height: 30, border: '3px solid #0099cc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!customer) return (
    <div style={{ background: soft, minHeight: '100vh', fontFamily: "'Manrope',sans-serif" }}>
      <style>{``}</style>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '80px 16px' }}>
        <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '40px 22px', textAlign: 'center' }}>
          <i className="ti ti-user-circle" style={{ fontSize: 42, color: '#0099cc' }} />
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: t1, margin: '12px 0 6px' }}>Sign in to your account</h2>
          <p style={{ fontSize: 13, color: t2, marginBottom: 18 }}>Manage your requests, chats, reviews and profile in one place.</p>
          <button onClick={() => signInWithGoogle()} style={{ padding: '11px 24px', background: '#0099cc', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Sign in</button>
        </div>
      </div>
    </div>
  )

  /* ---------- Section content ---------- */
  function Content() {
    if (section === 'requests') {
      return requests.length === 0 ? (
        <EmptyState icon="ti-clipboard-list" title="No requests yet" text="Request free quotes from the home page — your matched companies will appear here." cta="Get 3 Quotes" onCta={() => navigate('home')} />
      ) : (
        <>
          {requests.map(r => (
            <div key={r.id} style={{ background: card, borderRadius: 18, marginBottom: 13, overflow: 'hidden', boxShadow: '0 1px 3px rgba(13,27,42,.04), 0 8px 24px rgba(13,27,42,.05)', border: '0.5px solid ' + line }}>
              <div style={{ padding: '13px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: t1, letterSpacing: '-.1px' }}>{r.service}{r.area ? ` · ${r.area}` : ''}</div>
                  <div style={{ fontSize: 10.5, color: t3, marginTop: 3 }}>Requested {new Date(r.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.companies.length} matched</div>
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#1ea672', background: 'rgba(30,166,114,.12)', padding: '4px 10px', borderRadius: 99, flexShrink: 0, letterSpacing: '.2px' }}>ACTIVE</span>
              </div>
              {r.companies.length === 0 ? (
                <div style={{ padding: '0 14px 14px', fontSize: 12, color: t3 }}>Matching you with companies — check back shortly.</div>
              ) : r.companies.map(co => (
                <CompanyRow key={co.id} co={co} unread={r.unreadByCompany[co.id] || 0} status={r.statusByCompany?.[co.id] || 'new'} lastMsg={r.lastMsgByCompany?.[co.id]} onMessage={() => openChat(r.id, co)} />
              ))}
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11.5, color: t3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="ti ti-shield-check" style={{ fontSize: 14, color: '#0099cc' }} /> Sab kuch ek jagah — companies, chat, quote, deal, project
          </div>
        </>
      )
    }
    if (section === 'messages') {
      return msgRequests.length === 0 ? (
        <EmptyState icon="ti-message-2" title="No messages yet" text="Start a chat with a matched company from My Requests. Your conversations show up here." cta="Go to My Requests" onCta={() => setSection('requests')} />
      ) : msgRequests.map(r => (
        <div key={r.id} style={{ background: card, border: `1px solid ${line}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: t2, background: soft }}>{r.service}{r.area ? ` · ${r.area}` : ''}</div>
          {r.companies.map(co => (
            <CompanyRow key={co.id} co={co} unread={r.unreadByCompany[co.id] || 0} status={r.statusByCompany?.[co.id] || 'new'} lastMsg={r.lastMsgByCompany?.[co.id]} onMessage={() => openChat(r.id, co)} />
          ))}
        </div>
      ))
    }
    if (section === 'quotes') return <ComingSoon icon="ti-file-invoice" title="Quotes coming soon" text="Soon companies will send you detailed quotations right here — compare, negotiate and accept them in one place." />
    if (section === 'projects') return <ComingSoon icon="ti-clipboard-check" title="Project tracking coming soon" text="Once you accept a quote, track your project here — milestones, updates and photos from your company." />
    if (section === 'reviews') {
      return reviews.length === 0 ? (
        <EmptyState icon="ti-star" title="No reviews yet" text="Share your experience with Dubai service companies." cta="Find a Company" onCta={() => navigate('home')} />
      ) : (
        <>
          {reviews.map(r => (
            <div key={r.id} style={{ background: card, border: `1px solid ${line}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.companies?.name || 'Company'}</div>
                  <div style={{ fontSize: 11, color: t3 }}>{r.companies?.category}{r.companies?.area ? ` · ${r.companies.area}` : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, marginLeft: 10 }}>
                  <div style={{ display: 'flex', gap: 2 }}>{[0, 1, 2, 3, 4].map(j => <span key={j} style={{ fontSize: 13, color: j < r.rating ? '#f5a623' : line }}>★</span>)}</div>
                  <span style={{ fontSize: 10, color: t3 }}>{new Date(r.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: t2, lineHeight: 1.5, margin: 0 }}>{r.review_text}</p>
              {r.is_approved === false && <div style={{ marginTop: 8, fontSize: 10, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-clock" style={{ fontSize: 11 }} /> Pending approval</div>}
            </div>
          ))}
          <button onClick={() => navigate('add-review', {})} style={{ width: '100%', padding: '11px', background: soft, color: '#0099cc', border: '0.5px solid rgba(0,153,204,0.3)', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> Write Another Review
          </button>
        </>
      )
    }
    if (section === 'profile') {
      return (
        <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 14, padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            {customer?.avatar_url
              ? <img src={customer.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#0099cc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>{initials}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t1, marginBottom: 2 }}>{customer?.full_name || 'Customer'}</div>
              <div style={{ fontSize: 12, color: t3, marginBottom: 4 }}>{customer?.email}</div>
              <div style={{ fontSize: 11, color: t3 }}><i className="ti ti-calendar" style={{ fontSize: 11 }} /> Joined {joinDate}</div>
            </div>
            {!editMode && <button onClick={() => setEditMode(true)} style={{ background: soft, border: `0.5px solid ${line}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 11, color: t2, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit</button>}
          </div>
          {editMode ? (
            <div style={{ borderTop: `0.5px solid ${line}`, paddingTop: 14 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4 }}>Full Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${line}`, borderRadius: 8, fontSize: 13, outline: 'none', background: soft, color: t1, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: t2, display: 'block', marginBottom: 4 }}>Phone</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+971 50 123 4567" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${line}`, borderRadius: 8, fontSize: 13, outline: 'none', background: soft, color: t1, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveProfile} disabled={savingProfile} style={{ flex: 1, padding: '9px', background: '#0099cc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: savingProfile ? 0.7 : 1 }}>{savingProfile ? 'Saving...' : 'Save Changes'}</button>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '9px', background: soft, color: t2, border: `0.5px solid ${line}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, borderTop: `0.5px solid ${line}`, paddingTop: 14 }}>
              {[{ label: 'Requests', value: requests.length, icon: 'ti-clipboard-list' }, { label: 'Reviews', value: reviews.length, icon: 'ti-star' }, { label: 'Avg Rating', value: avgRating, icon: 'ti-chart-bar' }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: 14, color: '#0099cc', display: 'block', marginBottom: 3 }} />
                  <div style={{ fontSize: 16, fontWeight: 700, color: t1, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: t3, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    if (section === 'settings') {
      return (
        <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 12, overflow: 'hidden' }}>
          {[{ icon: 'ti-bell', label: 'Notifications', sub: 'Get notified on replies & quotes' }, { icon: 'ti-shield', label: 'Privacy', sub: 'Manage your data and visibility' }, { icon: 'ti-help', label: 'Help & Support', sub: 'Contact us or view FAQ' }].map((item, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: i < arr.length - 1 ? `0.5px solid ${line}` : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,153,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className={`ti ${item.icon}`} style={{ fontSize: 16, color: '#0099cc' }} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: t3 }}>{item.sub}</div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 14, color: t3 }} />
            </div>
          ))}
          <div style={{ padding: '13px 14px', borderTop: `0.5px solid ${line}` }}>
            <button onClick={handleSignOut} style={{ width: '100%', padding: '10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '0.5px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><i className="ti ti-logout" style={{ fontSize: 15 }} /> Sign Out</button>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: soft, fontFamily: "'Manrope',sans-serif" }}>
      <style>{``}</style>

      {/* Elegant gradient header */}
      <div style={{ background: 'linear-gradient(135deg,#0aa2cf 0%,#0883ad 100%)', padding: '16px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <button onClick={() => navigate('home')} style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(255,255,255,.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 17 }} />
          </button>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg,#fff,#e3f6fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#0883ad', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18, lineHeight: 1.1, letterSpacing: '-.3px' }}>My Account</div>
            <div style={{ fontSize: 11.5, opacity: .85, marginTop: 1 }}>{customer?.full_name ? 'Welcome back, ' + customer.full_name.split(' ')[0] : 'Welcome back'}</div>
          </div>
          <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <i className="ti ti-bell" style={{ fontSize: 18 }} />
            {totalUnread > 0 && <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%', background: '#d9a441', border: '1.5px solid #0883ad' }} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 15 }}>
          {[{ n: requests.length, l: 'REQUESTS' }, { n: requests.reduce((a, r) => a + r.companies.length, 0), l: 'COMPANIES' }, { n: totalUnread, l: 'UNREAD' }].map(o => (
            <div key={o.l} style={{ flex: 1, background: 'rgba(255,255,255,.14)', borderRadius: 13, padding: '9px 11px' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{o.n}</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.8)', marginTop: 3, fontWeight: 600, letterSpacing: '.2px' }}>{o.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top scrollable tabs — NO bottom tabs (App BottomNav handles bottom) */}
      <div style={{ background: card, borderBottom: `0.5px solid ${line}`, position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 6, padding: '12px 14px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {NAV.map(n => {
            const on = section === n.id
            return (
              <button key={n.id} onClick={() => setSection(n.id)}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 12.5, fontWeight: on ? 700 : 600, fontFamily: 'inherit', whiteSpace: 'nowrap', borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0, background: on ? 'linear-gradient(135deg,#0aa2cf,#0883ad)' : soft, color: on ? '#fff' : t2 }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: 15 }} /> {n.label.replace('My ', '')}
                {n.badge > 0 && <span style={{ minWidth: 16, height: 16, borderRadius: 99, background: on ? 'rgba(255,255,255,.25)' : '#ef5a6f', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{n.badge}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 14px 30px' }}>
        <Content />
      </div>

      <ChatDrawer open={!!chat} onClose={() => { setChat(null); if (customer) loadRequests(customer) }} company={chat?.company} leadId={chat?.leadId} customer={customer} mobile={mobile} />
    </div>
  )
}
