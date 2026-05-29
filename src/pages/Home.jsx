function RightPanel({ recentReviews }) {
  const [email,           setEmail]           = useState('')
  const [subscribed,      setSubscribed]       = useState(false)
  const [sponsoredCos,    setSponsoredCos]     = useState([])
  const [quoteModal,      setQuoteModal]       = useState(null)
  const [quoteForm,       setQuoteForm]        = useState({ name:'', phone:'', message:'' })
  const [quoteSubmitting, setQuoteSubmitting]  = useState(false)
  const [quoteDone,       setQuoteDone]        = useState(false)

  const fallbackReviews = [
    { id:1, reviewer_name:'M. Ahmed',     rating:5, review_text:'Incredible job! Highly recommend their services.' },
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
        // Track views
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

  // Fallback static if no real sponsors
  const fallbackSponsors = [
    { id:'f1', slot_number:1, company_id:'f1', companies:{ name:'Jaguar Interiors',  category:'Luxury Interior Design',   avg_rating:'4.9', plan:'platinum' }},
    { id:'f2', slot_number:2, company_id:'f2', companies:{ name:'RenoFix Plus',      category:'Construction & Renovation', avg_rating:'4.8', plan:'gold'     }},
    { id:'f3', slot_number:3, company_id:'f3', companies:{ name:'AirCool Dubai',     category:'AC Service & Maintenance',  avg_rating:'4.6', plan:'silver'   }},
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
                style={{ width:'100%', background:'#0099cc', border:'none', borderRadius:5, padding:'5px 0', fontSize:9.5, color:'#fff', fontWeight:700, cursor: isRealData?'pointer':'default' }}>
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

      {/* Quote Modal */}
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
