import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { signOut, getCustomer } from '../customerAuth'

export default function CustomerProfile({ navigate }) {
  const [customer, setCustomer] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reviews')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const cust = await getCustomer()
    if (!cust) { navigate('home'); return }
    setCustomer(cust)
    setEditName(cust.full_name || '')
    setEditPhone(cust.phone || '')
    const { data: revs } = await supabase
      .from('reviews')
      .select('*, companies(name, category, area, avg_rating)')
      .eq('customer_id', cust.id)
      .order('created_at', { ascending: false })
    setReviews(revs || [])
    setLoading(false)
  }

  async function saveProfile() {
    if (!editName.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('customers')
      .update({ full_name: editName, phone: editPhone, updated_at: new Date().toISOString() })
      .eq('id', customer.id)
      .select()
      .single()
    if (data) setCustomer(data)
    setSaving(false)
    setEditMode(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('home')
  }

  if (loading) return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:28, height:28, border:'2.5px solid var(--primary)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const initials = (customer?.full_name || customer?.email || 'U').slice(0,2).toUpperCase()
  const joinDate = customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-AE',{month:'long', year:'numeric'}) : '—'
  const avgRating = reviews.length > 0 ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'

  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border-default)', background:'var(--bg-primary)', position:'sticky', top:0, zIndex:100 }}>
        <button onClick={() => navigate('home')} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left"/>
        </button>
        <span style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>My Profile</span>
        <button onClick={handleSignOut} style={{ background:'none', border:'none', fontSize:12, cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-logout" style={{ fontSize:14 }}/>
        </button>
      </div>

      <div style={{ padding:'20px 16px' }}>

        {/* Profile card */}
        <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:14, padding:'20px 16px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            {/* Avatar */}
            <div style={{ flexShrink:0 }}>
              {customer?.avatar_url ? (
                <img src={customer.avatar_url} alt="" style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover' }}/>
              ) : (
                <div style={{ width:56, height:56, borderRadius:'50%', background:'#0099cc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff' }}>
                  {initials}
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{customer?.full_name || 'Customer'}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{customer?.email}</div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-calendar" style={{ fontSize:11, color:'var(--text-muted)' }}/>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>Joined {joinDate}</span>
              </div>
            </div>
            <button onClick={() => setEditMode(!editMode)} style={{ background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:11, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
              <i className="ti ti-edit" style={{ fontSize:13 }}/> Edit
            </button>
          </div>

          {/* Edit form */}
          {editMode && (
            <div style={{ borderTop:'0.5px solid var(--border-default)', paddingTop:14, marginTop:4 }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:'var(--text-secondary)', display:'block', marginBottom:4 }}>Full Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border-default)', borderRadius:8, fontSize:13, outline:'none', background:'var(--bg-secondary)', color:'var(--text-primary)' }}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, color:'var(--text-secondary)', display:'block', marginBottom:4 }}>Phone (optional)</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+971 50 123 4567"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border-default)', borderRadius:8, fontSize:13, outline:'none', background:'var(--bg-secondary)', color:'var(--text-primary)' }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={saveProfile} disabled={saving}
                  style={{ flex:1, padding:'9px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', opacity:saving?0.7:1 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditMode(false)}
                  style={{ flex:1, padding:'9px', background:'var(--bg-secondary)', color:'var(--text-secondary)', border:'0.5px solid var(--border-default)', borderRadius:8, fontSize:13, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stats row */}
          {!editMode && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, borderTop:'0.5px solid var(--border-default)', paddingTop:14 }}>
              {[
                { label:'Reviews',    value:reviews.length, icon:'ti-star' },
                { label:'Avg Rating', value:avgRating,      icon:'ti-chart-bar' },
                { label:'Verified',   value:'Yes',          icon:'ti-shield-check' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize:14, color:'#0099cc', display:'block', marginBottom:3 }}/>
                  <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--bg-secondary)', borderRadius:10, padding:3, marginBottom:16 }}>
          {[
            { id:'reviews', label:'My Reviews', icon:'ti-star' },
            { id:'settings', label:'Settings', icon:'ti-settings' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:activeTab===tab.id?600:400, background:activeTab===tab.id?'var(--bg-card)':'transparent', color:activeTab===tab.id?'var(--text-primary)':'var(--text-muted)', transition:'all 0.15s' }}>
              <i className={`ti ${tab.icon}`} style={{ fontSize:13 }}/>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: My Reviews */}
        {activeTab === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <i className="ti ti-star-off" style={{ fontSize:40, color:'var(--text-muted)', display:'block', marginBottom:12 }}/>
                <div style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)', marginBottom:6 }}>No reviews yet</div>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>Share your experience with Dubai service companies</p>
                <button onClick={() => navigate('home')}
                  style={{ padding:'10px 24px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:24, fontSize:13, cursor:'pointer' }}>
                  Find a Company
                </button>
              </div>
            ) : reviews.map((r, i) => (
              <div key={r.id} style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:12, padding:'12px 14px', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.companies?.name || 'Unknown Company'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {r.companies?.category} {r.companies?.area ? `· ${r.companies.area}` : ''}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0, marginLeft:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                      {'★★★★★'.split('').map((_,j) => (
                        <span key={j} style={{ fontSize:13, color:j < r.rating ? 'var(--amber)' : 'var(--border-default)' }}>★</span>
                      ))}
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'})}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5, margin:0 }}>{r.review_text}</p>
                {r.service_type && (
                  <span style={{ display:'inline-block', marginTop:8, fontSize:10, background:'rgba(0,153,204,0.1)', color:'#0099cc', padding:'2px 8px', borderRadius:99, fontWeight:500 }}>
                    {r.service_type}
                  </span>
                )}
                {r.is_approved === false && (
                  <div style={{ marginTop:8, fontSize:10, color:'var(--amber)', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-clock" style={{ fontSize:11 }}/> Pending approval
                  </div>
                )}
              </div>
            ))}

            {reviews.length > 0 && (
              <button onClick={() => navigate('add-review', {})}
                style={{ width:'100%', padding:'11px', background:'var(--bg-secondary)', color:'#0099cc', border:'0.5px solid rgba(0,153,204,0.3)', borderRadius:12, fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:4 }}>
                <i className="ti ti-plus" style={{ fontSize:14 }}/> Write Another Review
              </button>
            )}
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:12, overflow:'hidden' }}>
            {[
              { icon:'ti-bell', label:'Review notifications', sub:'Get notified when business replies', action:null },
              { icon:'ti-shield', label:'Privacy settings', sub:'Manage your data and visibility', action:null },
              { icon:'ti-help', label:'Help & Support', sub:'Contact us or view FAQ', action:null },
            ].map((item, i, arr) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderBottom:i<arr.length-1?'0.5px solid var(--border-default)':'none', cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ width:34, height:34, borderRadius:9, background:'rgba(0,153,204,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:16, color:'#0099cc' }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{item.sub}</div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'var(--text-muted)' }}/>
              </div>
            ))}

            {/* Sign out */}
            <div style={{ padding:'13px 14px', borderTop:'0.5px solid var(--border-default)' }}>
              <button onClick={handleSignOut}
                style={{ width:'100%', padding:'10px', background:'rgba(239,68,68,0.08)', color:'#ef4444', border:'0.5px solid rgba(239,68,68,0.2)', borderRadius:10, fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <i className="ti ti-logout" style={{ fontSize:15 }}/> Sign Out
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
