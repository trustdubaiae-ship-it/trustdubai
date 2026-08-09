import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getCustomer, signInWithGoogle } from '../customerAuth'

/* ---------- Chat drawer (customer side) ---------- */
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
    const optimistic = { id: 'tmp' + Date.now(), sender_type: 'customer', body, created_at: new Date().toISOString() }
    setMessages(m => [...m, optimistic])
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
  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 4000, display: 'flex',
    alignItems: mobile ? 'stretch' : 'center', justifyContent: mobile ? 'stretch' : 'flex-end' }
  const panel = { background: 'var(--bg-card)', display: 'flex', flexDirection: 'column',
    width: mobile ? '100%' : 400, height: mobile ? '100%' : '88vh', maxHeight: mobile ? '100%' : '88vh',
    borderRadius: mobile ? 0 : '14px 0 0 14px', overflow: 'hidden' }

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
                <div style={{ background: mine ? '#0099cc' : 'var(--bg-card)', color: mine ? '#fff' : 'var(--text-primary)', border: mine ? 'none' : '0.5px solid var(--border-default)', padding: '9px 12px', borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {m.body}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textAlign: mine ? 'right' : 'left', marginTop: 3 }}>
                  {new Date(m.created_at).toLocaleTimeString('en-AE', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '0.5px solid var(--border-default)', flexShrink: 0 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Type a message…"
            style={{ flex: 1, height: 38, border: '0.5px solid var(--border-default)', borderRadius: 99, padding: '0 14px', fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }} />
          <button onClick={send} disabled={sending || !text.trim()}
            style={{ width: 38, height: 38, borderRadius: '50%', background: '#0099cc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, cursor: 'pointer', opacity: (sending || !text.trim()) ? 0.6 : 1 }}>
            <i className="ti ti-send" style={{ fontSize: 17 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Company row (inside a request) ---------- */
function StatusBadge({ status, unread }) {
  // Phase 3 will add 'quote' (Quote ready). For now: chatting / awaiting / new.
  if (status === 'chatting') {
    return (
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#0077aa', background: '#e0f9ff', padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
        <i className="ti ti-message-2" style={{ fontSize: 13 }} /> Chatting
        {unread > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 99, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unread}</span>
        }
      </span>
    )
  }
  if (status === 'awaiting') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
        Awaiting reply
      </span>
    )
  }
  // new — invite to chat
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#fff', background: '#0099cc', padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
      <i className="ti ti-message-2" style={{ fontSize: 13 }} /> Message
    </span>
  )
}

function CompanyRow({ co, unread, status, onMessage }) {
  const name = co?.name || 'Company'
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div onClick={onMessage} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderTop: '0.5px solid var(--border-default)', cursor: 'pointer' }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: '#e0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {co?.logo_url ? <img src={co.logo_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#0077aa' }}>{initials}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          {co?.is_verified && <i className="ti ti-rosette-discount-check-filled" style={{ fontSize: 12, color: '#1e9e63', flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ color: '#f5a623', fontWeight: 700 }}>★ {co?.avg_rating ? Number(co.avg_rating).toFixed(1) : 'New'}</span>
          <span>{co?.total_reviews || 0} reviews</span>
          {co?.trust_score != null && <span style={{ color: '#0099cc', fontWeight: 600 }}>Trust {Math.round(co.trust_score)}</span>}
        </div>
      </div>
      <StatusBadge status={status} unread={unread} />
    </div>
  )
}

export default function MyRequests({ navigate }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [requests, setRequests] = useState([])
  const [chat, setChat] = useState(null) // { company, leadId }
  const [mobile, setMobile] = useState(() => document.documentElement.clientWidth < 481)

  useEffect(() => {
    function onR() { setMobile(document.documentElement.clientWidth < 481) }
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  useEffect(() => {
    (async () => {
      const c = await getCustomer()
      if (!c || c.blocked) { setCustomer(null); setLoading(false); return }
      setCustomer(c)
      await loadRequests(c)
      setLoading(false)
    })()
  }, [])

  async function loadRequests(c) {
    try {
      // leads submitted by this customer
      const { data: leads } = await supabase
        .from('lead_submissions')
        .select('id, answers, created_at, status')
        .eq('customer_id', c.id)
        .order('created_at', { ascending: false })
      const leadRows = leads || []
      if (leadRows.length === 0) { setRequests([]); return }

      const leadIds = leadRows.map(l => l.id)

      // distributions (matched companies) for these leads
      const { data: dists } = await supabase
        .from('lead_distributions')
        .select('lead_id, rank, companies(id,name,slug,logo_url,avg_rating,total_reviews,trust_score,is_verified,category,plan)')
        .in('lead_id', leadIds)
        .order('rank', { ascending: true })

      // chat messages for unread badges
      const { data: chats } = await supabase
        .from('lead_chat')
        .select('lead_id, company_id, sender_type, read_by_customer')
        .in('lead_id', leadIds)

      const built = leadRows.map(l => {
        const cos = (dists || []).filter(d => d.lead_id === l.id).map(d => d.companies).filter(Boolean)
        const unreadByCompany = {}
        const statusByCompany = {}
        cos.forEach(co => {
          const msgs = (chats || []).filter(m => m.lead_id === l.id && m.company_id === co.id)
          const hasCustomer = msgs.some(m => m.sender_type === 'customer')
          const hasCompany = msgs.some(m => m.sender_type === 'company')
          let st = 'new'                       // no chat yet
          if (hasCompany) st = 'chatting'      // company has replied
          else if (hasCustomer) st = 'awaiting' // customer sent, company not replied
          statusByCompany[co.id] = st
          const unread = msgs.filter(m => m.sender_type === 'company' && !m.read_by_customer).length
          if (unread) unreadByCompany[co.id] = unread
        })
        const service = l.answers?.['Service Category'] || l.answers?.category || l.answers?.['Project Type'] || 'Service request'
        const area = l.answers?._area || l.answers?.['Area'] || l.answers?.area || ''
        const hasAnyChat = (chats || []).some(m => m.lead_id === l.id)
        return { id: l.id, created_at: l.created_at, service, area, companies: cos, unreadByCompany, statusByCompany, hasAnyChat }
      })
      setRequests(built)
    } catch (e) { console.error(e) }
  }

  function openChat(leadId, company) {
    setChat({ leadId, company })
    // optimistic: clear unread badge for this company+lead
    setRequests(prev => prev.map(r => {
      if (r.id !== leadId) return r
      const u = { ...r.unreadByCompany }; delete u[company.id]
      return { ...r, unreadByCompany: u }
    }))
  }

  const t1 = 'var(--text-primary)', t2 = 'var(--text-secondary)', t3 = 'var(--text-muted)'
  const card = 'var(--bg-card)', line = 'var(--border-default)', soft = 'var(--bg-secondary)'

  const TABS = [
    { id: 'active',   label: 'Active',   icon: 'ti-clipboard-list' },
    { id: 'messages', label: 'Messages', icon: 'ti-message-2' },
    { id: 'quotes',   label: 'Quotes',   icon: 'ti-file-invoice' },
    { id: 'projects', label: 'Projects', icon: 'ti-clipboard-check' },
  ]

  // requests that have at least one chat thread (for Messages tab)
  const msgRequests = requests.filter(r => r.hasAnyChat || Object.keys(r.unreadByCompany).length > 0)
  const totalUnread = requests.reduce((sum, r) => sum + Object.values(r.unreadByCompany || {}).reduce((a, b) => a + b, 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: soft, fontFamily: "'Manrope',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap');`}</style>

      {/* Top bar */}
      <div style={{ background: card, borderBottom: `1px solid ${line}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate && navigate('home')} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${line}`, background: soft, color: t2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 17 }} />
        </button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#e0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#0077aa', flexShrink: 0 }}>
          {((customer?.full_name || customer?.email || 'U')[0] || 'U').toUpperCase()}{((customer?.full_name || '').split(' ')[1]?.[0] || '').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 17, color: t1, lineHeight: 1.1 }}>My Requests</div>
          <div style={{ fontSize: 11.5, color: t3 }}>{customer?.full_name ? customer.full_name.split(' ')[0] + ' · ' : ''}your quotes &amp; projects</div>
        </div>
        <div style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', border: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t2, flexShrink: 0 }}>
          <i className="ti ti-bell" style={{ fontSize: 18 }} />
          {totalUnread > 0 && <span style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: `1.5px solid ${card}` }} />}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 14px 60px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${line}`, overflowX: 'auto' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontWeight: tab === tb.id ? 700 : 500, color: tab === tb.id ? '#0099cc' : t2, borderBottom: tab === tb.id ? '2px solid #0099cc' : '2px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              <i className={`ti ${tb.icon}`} style={{ fontSize: 15 }} /> {tb.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <div style={{ width: 30, height: 30, border: '3px solid #0099cc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : !customer ? (
          <div style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '40px 22px', textAlign: 'center' }}>
            <i className="ti ti-user-circle" style={{ fontSize: 42, color: '#0099cc' }} />
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: t1, margin: '12px 0 6px' }}>Sign in to see your requests</h2>
            <p style={{ fontSize: 13, color: t2, marginBottom: 18 }}>Your quote requests, matched companies and chats appear here.</p>
            <button onClick={() => signInWithGoogle()} style={{ padding: '11px 24px', background: '#0099cc', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Sign in</button>
          </div>
        ) : (
          <>
            {/* ACTIVE TAB */}
            {tab === 'active' && (
              requests.length === 0 ? (
                <EmptyState icon="ti-clipboard-list" title="No requests yet"
                  text="Request free quotes from the home page — your matched companies will appear here."
                  cta="Get 3 Quotes" onCta={() => navigate && navigate('home')} />
              ) : (
                requests.map(r => (
                  <div key={r.id} style={{ background: card, border: `1px solid ${line}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '13px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{r.service}{r.area ? ` · ${r.area}` : ''}</div>
                      <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>
                        Requested {new Date(r.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.companies.length} {r.companies.length === 1 ? 'company' : 'companies'} matched
                      </div>
                    </div>
                    {r.companies.length === 0 ? (
                      <div style={{ padding: '0 14px 14px', fontSize: 12, color: t3 }}>Matching you with companies — check back shortly.</div>
                    ) : r.companies.map(co => (
                      <CompanyRow key={co.id} co={co} unread={r.unreadByCompany[co.id] || 0}
                        status={r.statusByCompany?.[co.id] || 'new'}
                        onMessage={() => openChat(r.id, co)} />
                    ))}
                  </div>
                ))
              )
            )}

            {/* MESSAGES TAB */}
            {tab === 'messages' && (
              msgRequests.length === 0 ? (
                <EmptyState icon="ti-message-2" title="No messages yet"
                  text="Start a chat with a matched company from the Active tab. Your conversations show up here."
                  cta="Go to Active" onCta={() => setTab('active')} />
              ) : (
                msgRequests.map(r => (
                  <div key={r.id} style={{ background: card, border: `1px solid ${line}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: t2, background: soft }}>{r.service}{r.area ? ` · ${r.area}` : ''}</div>
                    {r.companies.map(co => (
                      <CompanyRow key={co.id} co={co} unread={r.unreadByCompany[co.id] || 0}
                        status={r.statusByCompany?.[co.id] || 'new'}
                        onMessage={() => openChat(r.id, co)} />
                    ))}
                  </div>
                ))
              )
            )}

            {/* QUOTES TAB (coming soon) */}
            {tab === 'quotes' && (
              <ComingSoon icon="ti-file-invoice" title="Quotes coming soon"
                text="Soon companies will send you detailed quotations right here — you'll be able to compare, negotiate and accept them in one place." />
            )}

            {/* PROJECTS TAB (coming soon) */}
            {tab === 'projects' && (
              <ComingSoon icon="ti-clipboard-check" title="Project tracking coming soon"
                text="Once you accept a quote, you'll track your project here — milestones, updates and photos from your company." />
            )}
          </>
        )}
        {customer && (
          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11.5, color: t3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="ti ti-shield-check" style={{ fontSize: 14, color: '#0099cc' }} /> Sab kuch ek jagah — companies, chat, quote, deal, project
          </div>
        )}
      </div>

      <ChatDrawer open={!!chat} onClose={() => { setChat(null); if (customer) loadRequests(customer) }}
        company={chat?.company} leadId={chat?.leadId} customer={customer} mobile={mobile} />
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
