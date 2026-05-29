import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'
import CompanyCard from '../components/CompanyCard'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'

const CATEGORIES = [
  { name: 'Interior',   icon: '🛋️', cat: 'Interior Design' },
  { name: 'AC Service', icon: '❄️', cat: 'AC Service' },
  { name: 'Plumbing',   icon: '🔧', cat: 'Plumbing' },
  { name: 'Cleaning',   icon: '🧹', cat: 'Cleaning' },
  { name: 'Painting',   icon: '🎨', cat: 'Painting' },
  { name: 'Renovation', icon: '🏗️', cat: 'Renovation' },
  { name: 'Electrical', icon: '⚡', cat: 'Electrical' },
  { name: 'Handyman',   icon: '🔨', cat: 'Handyman' },
]

const MAP_PINS = [
  { top: '30%', left: '38%' }, { top: '45%', left: '58%' },
  { top: '55%', left: '24%' }, { top: '20%', left: '70%' },
  { top: '60%', left: '72%' }, { top: '35%', left: '82%' },
]

function useDevice() {
  const [device, setDevice] = useState('mobile')
  useEffect(() => {
    function detect() {
      const w = window.innerWidth
      if (w >= 1025) setDevice('desktop')
      else if (w >= 481) setDevice('tablet')
      else setDevice('mobile')
    }
    detect()
    window.addEventListener('resize', detect)
    return () => window.removeEventListener('resize', detect)
  }, [])
  return device
}

function Logo({ size = 15 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
      <span style={{ fontSize: size, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Trust</span>
      <span style={{ fontSize: size, fontWeight: 700, color: '#0099cc', letterSpacing: '-0.3px' }}>Dubai</span>
      <span style={{ fontSize: size * 0.4, color: '#0099cc', marginLeft: 1, marginBottom: size * 0.5, lineHeight: 1 }}>●</span>
    </div>
  )
}

function TrustWave({ score = 0 }) {
  const bars = [4,8,12,6,10,14,8,5,11,7,9,13,6,10,8,12,5,9,11,7]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
      <i className="ti ti-heart-rate-monitor" style={{ fontSize: 11, color: '#0099cc' }} />
      <span style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Platform Trust Score</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, height: 14 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ width: 2, height: h, background: '#0099cc', borderRadius: 1, opacity: 0.65 }} />
        ))}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#0099cc' }}>{score}/100</span>
    </div>
  )
}

function CityMap({ height = 90 }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #e8f4fd 0%, #dbeafe 100%)', borderRadius: 10, padding: 8, position: 'relative', overflow: 'hidden', height }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(#0099cc 1px, transparent 1px), linear-gradient(90deg, #0099cc 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      <div style={{ position: 'relative', fontSize: 8, fontWeight: 700, color: '#0077aa', marginBottom: 4 }}>🗺️ Dubai Service Map</div>
      {MAP_PINS.map((pin, i) => (
        <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left, width: 8, height: 8, background: '#0099cc', borderRadius: '50%', border: '1.5px solid #fff' }} />
      ))}
    </div>
  )
}

function ReviewGraph({ data }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-chart-line" style={{ fontSize: 11, color: '#0099cc' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Reviews This Month</span>
          <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 400 }}>— star-wise trend</span>
        </div>
        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
          {new Date().toLocaleString('en-AE', { month: 'long', year: 'numeric' })} · {data.total} total
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        {[
          { label: '5 Stars', color: '#10b981' },
          { label: '4 Stars', color: '#0099cc' },
          { label: '3 Stars', color: '#f5a623' },
          { label: '2 Stars', color: '#f97316' },
          { label: '1 Star',  color: '#ef4444' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 3, background: l.color, borderRadius: 99 }} /> {l.label}
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', height: 90 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 22 }}>
          {['30','20','10','0'].map(l => <span key={l} style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>{l}</span>)}
        </div>
        <div style={{ position: 'absolute', left: 24, right: 0, top: 0, bottom: 16 }}>
          <svg width="100%" height="100%" viewBox="0 0 520 74" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g5r" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.1"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0,24,49,74].map(y => <line key={y} x1="0" y1={y} x2="520" y2={y} stroke="var(--border-default)" strokeWidth="0.5"/>)}
            <path d="M0,60 26,55 52,49 78,43 104,37 130,32 156,27 182,22 208,18 234,14 260,11 286,9 312,6 338,5 364,4 390,3 416,2 442,2 468,1 494,1 520,1 L520,74 L0,74 Z" fill="url(#g5r)"/>
            <polyline points="0,60 26,55 52,49 78,43 104,37 130,32 156,27 182,22 208,18 234,14 260,11 286,9 312,6 338,5 364,4 390,3 416,2 442,2 468,1 494,1 520,1" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <polyline points="0,65 26,63 52,60 78,57 104,53 130,50 156,47 182,45 208,42 234,40 260,38 286,36 312,34 338,32 364,31 390,30 416,29 442,28 468,27 494,27 520,26" fill="none" stroke="#0099cc" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <polyline points="0,68 26,68 52,67 78,67 104,66 130,66 156,67 182,66 208,65 234,66 260,65 286,66 312,65 338,66 364,67 390,66 416,65 442,66 468,67 494,66 520,66" fill="none" stroke="#f5a623" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3,2"/>
            <polyline points="0,71 26,71 52,72 78,71 104,72 130,71 156,72 182,71 208,72 234,71 260,72 286,71 312,72 338,71 364,72 390,71 416,72 442,71 468,72 494,71 520,72" fill="none" stroke="#f97316" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2,3"/>
            <polyline points="0,73 26,74 52,73 78,72 104,74 130,73 156,72 182,74 208,73 234,72 260,74 286,73 312,72 338,74 364,73 390,72 416,74 442,73 468,72 494,74 520,73" fill="none" stroke="#ef4444" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1,3"/>
            <circle cx="520" cy="1" r="2.5" fill="#10b981"/>
            <circle cx="520" cy="26" r="2" fill="#0099cc"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 24, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between' }}>
          {['1','5','10','15','20','25','30'].map(l => <span key={l} style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>{l}</span>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { label: '★★★★★', count: data.s5, up: data.s5_pct, bg: '#f0fdf4', border: '#a7f3d0', color: '#065f46' },
          { label: '★★★★',  count: data.s4, up: data.s4_pct, bg: '#e0f9ff', border: '#b3d9f0', color: '#0077aa' },
          { label: '★★★',   count: data.s3, bg: '#fef9ed', border: '#fcd34d', color: '#92400e' },
          { label: '★★',    count: data.s2, bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' },
          { label: '★',     count: data.s1, bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
        ].map(p => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: p.bg, border: `0.5px solid ${p.border}`, borderRadius: 5, padding: '3px 7px' }}>
            <span style={{ fontSize: 8, color: p.color, fontWeight: 700 }}>{p.label}</span>
            <span style={{ fontSize: 8, color: p.color, fontWeight: 600 }}>{p.count}</span>
            {p.up > 0 && <span style={{ fontSize: 7.5, color: p.color }}>↑{p.up}%</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function RightPanel({ recentReviews, navigate }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  return (
    <div style={{ width: 240, flexShrink: 0, background: 'var(--bg-card)', borderLeft: '0.5px solid var(--border-default)', padding: 12, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

      {/* List Your Business CTA */}
      <div style={{ background: 'linear-gradient(135deg, #0099cc, #0077aa)', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 3 }}>🏢 List Your Business</div>
        <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.75)', marginBottom: 10, lineHeight: 1.5 }}>
          Join 500+ verified companies. Get leads, reviews & visibility in Dubai.
        </div>
        <button onClick={() => window.open('https://business.trustdubai.ae', '_blank')}
          style={{ width: '100%', background: '#fff', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 10, color: '#0099cc', fontWeight: 700, cursor: 'pointer' }}>
          Register Free →
        </button>
      </div>

      {/* Sponsored */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-ad-2" style={{ fontSize: 11, color: '#0099cc' }} /> Sponsored
        </div>
        {[
          { init: 'JI', bg: '#ede9fe', color: '#5b21b6', name: 'Jaguar Interiors', cat: 'Luxury Interior Design', rat: '★★★★★ 4.9' },
          { init: 'RF', bg: '#fef3c7', color: '#92400e', name: 'RenoFix Plus', cat: 'Construction & Renovation', rat: '★★★★½ 4.8' },
        ].map(s => (
          <div key={s.name} style={{ background: '#f0faff', border: '0.5px solid #b3d9f0', borderRadius: 8, padding: '8px 10px', marginBottom: 6, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 7, color: '#7a9ab5', background: '#e8f4fd', padding: '1px 4px', borderRadius: 3 }}>Ad</span>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{s.init}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
            <div style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>{s.cat}</div>
            <div style={{ fontSize: 8.5, color: '#f5a623', marginTop: 2 }}>{s.rat}</div>
            <button style={{ marginTop: 6, background: '#0099cc', border: 'none', borderRadius: 5, padding: '5px 0', fontSize: 9, color: '#fff', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              View Profile
            </button>
          </div>
        ))}
      </div>

      {/* Trending */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-trending-up" style={{ fontSize: 11, color: '#0099cc' }} /> Trending
        </div>
        {[
          { r: '1', name: 'RenoFix Plus',    cat: 'Construction',   hot: true },
          { r: '2', name: 'Jaguar Interiors', cat: 'Interior Design', hot: true },
          { r: '3', name: 'AirCool Dubai',    cat: 'AC Service' },
          { r: '4', name: 'CleanPro Dubai',   cat: 'Cleaning' },
        ].map((t, i) => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: i < 3 ? '0.5px solid var(--border-default)' : 'none' }}>
            <span style={{ fontSize: 10, fontWeight: 700, width: 14, color: t.hot ? '#f5a623' : 'var(--text-muted)', flexShrink: 0 }}>{t.r}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
              <div style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>{t.cat}</div>
            </div>
            <i className="ti ti-arrow-up-right" style={{ fontSize: 10, color: '#0099cc', flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Recent Reviews */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-message-circle" style={{ fontSize: 11, color: '#0099cc' }} /> Recent Reviews
        </div>
        {(recentReviews.length > 0 ? recentReviews : [
          { id: 1, reviewer_name: 'M. Ahmed',    rating: 5, review_text: 'Incredible job! Highly recommend their services.' },
          { id: 2, reviewer_name: 'S. Hassan',   rating: 4, review_text: 'Amazing interior design, very professional team.' },
          { id: 3, reviewer_name: 'F. Al Rashid',rating: 5, review_text: 'Fast AC service, great response time!' },
        ]).slice(0, 3).map((r, i) => (
          <div key={r.id || i} style={{ display: 'flex', gap: 7, padding: '5px 0', borderBottom: i < 2 ? '0.5px solid var(--border-default)' : 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: ['#0099cc','#7c3aed','#059669'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(r.reviewer_name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reviewer_name || 'Anonymous'}</div>
              <div style={{ fontSize: 7.5, color: 'var(--text-muted)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.review_text || '').slice(0, 45)}...</div>
              <div style={{ fontSize: 8, color: '#f5a623' }}>{'★'.repeat(r.rating || 5)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Newsletter */}
      <div style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-mail" style={{ fontSize: 11, color: '#0099cc' }} /> Dubai Service Deals
        </div>
        <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
          Weekly deals & top-rated service alerts in Dubai.
        </div>
        {subscribed ? (
          <div style={{ background: '#f0fdf4', border: '0.5px solid #a7f3d0', borderRadius: 6, padding: '6px 8px', fontSize: 9, color: '#065f46', fontWeight: 600, textAlign: 'center' }}>
            ✓ Subscribed! Welcome aboard.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex: 1, padding: '5px 8px', border: '0.5px solid var(--border-default)', borderRadius: 6, fontSize: 9, background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
            <button onClick={() => { if (email.includes('@')) setSubscribed(true) }}
              style={{ padding: '5px 10px', background: '#0099cc', border: 'none', borderRadius: 6, fontSize: 9, color: '#fff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Join
            </button>
          </div>
        )}
      </div>

      {/* App Download */}
      <div style={{ background: '#1a2744', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-device-mobile" style={{ fontSize: 11, color: '#0099cc' }} /> Download App
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 8, lineHeight: 1.5 }}>
          Find & book trusted Dubai services on the go.
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '6px 4px', cursor: 'pointer', textAlign: 'center' }}>
            <i className="ti ti-brand-apple" style={{ fontSize: 14, color: '#fff', display: 'block', marginBottom: 2 }} />
            <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)' }}>App Store</span>
          </button>
          <button style={{ flex: 1, background: 'rgba(0,153,204,0.2)', border: '0.5px solid rgba(0,153,204,0.3)', borderRadius: 7, padding: '6px 4px', cursor: 'pointer', textAlign: 'center' }}>
            <i className="ti ti-brand-android" style={{ fontSize: 14, color: '#0099cc', display: 'block', marginBottom: 2 }} />
            <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)' }}>Play Store</span>
          </button>
        </div>
      </div>

    </div>
  )
}

export default function Home({ navigate }) {
  const [companies, setCompanies]         = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [newCompanies, setNewCompanies]   = useState([])
  const [nearCompanies, setNearCompanies] = useState([])
  const [topCompanies, setTopCompanies]   = useState([])
  const [stats, setStats]                 = useState({ companies: 0, reviews: 0, avgRating: '0.0', verified: 0 })
  const [reviewData, setReviewData]       = useState({ total: 0, s5: 0, s4: 0, s3: 0, s2: 0, s1: 0, s5_pct: 0, s4_pct: 0 })
  const [trustScore, setTrustScore]       = useState(0)
  const [loading, setLoading]             = useState(true)
  const [customer, setCustomer]           = useState(null)
  const [showUserMenu, setShowUserMenu]   = useState(false)
  const device = useDevice()

  const isMobile  = device === 'mobile'
  const isTablet  = device === 'tablet'
  const isDesktop = device === 'desktop'

  useEffect(() => {
    fetchAll()
    checkCustomer()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const cust = await upsertCustomer(session.user)
        setCustomer(cust)
      } else if (event === 'SIGNED_OUT') {
        setCustomer(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_approved', true),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'approved').eq('is_verified', true),
        supabase.from('reviews').select('rating').eq('is_approved', true),
        supabase.from('companies').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(20),
        supabase.from('reviews').select('rating, created_at').eq('is_approved', true),
        supabase.from('reviews').select('id, reviewer_name, rating, review_text, created_at').eq('is_approved', true).order('created_at', { ascending: false }).limit(5),
      ])

      const avg = ratData?.length > 0
        ? (ratData.reduce((s, r) => s + r.rating, 0) / ratData.length).toFixed(1)
        : '0.0'

      setStats({ companies: totalCo || 0, reviews: totalRev || 0, avgRating: avg, verified: verifiedCo || 0 })

      const approved = allCo || []
      setCompanies(approved)
      setTopCompanies([...approved].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 4))
      setNearCompanies([...approved].slice(0, 4))
      setNewCompanies([...approved].slice(0, 4))
      setRecentReviews(recentRev || [])

      // Review graph — this month
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const thisMonth = (revData || []).filter(r => r.created_at >= monthStart)
      const s5 = thisMonth.filter(r => r.rating === 5).length
      const s4 = thisMonth.filter(r => r.rating === 4).length
      const s3 = thisMonth.filter(r => r.rating === 3).length
      const s2 = thisMonth.filter(r => r.rating === 2).length
      const s1 = thisMonth.filter(r => r.rating === 1).length
      const total = thisMonth.length
      setReviewData({ total, s5, s4, s3, s2, s1, s5_pct: total > 0 ? Math.round(s5/total*100) : 0, s4_pct: total > 0 ? Math.round(s4/total*100) : 0 })

      const score = Math.min(100, Math.round(
        (verifiedCo / Math.max(totalCo, 1)) * 40 +
        (parseFloat(avg) / 5) * 40 +
        Math.min((totalRev || 0) / 100, 1) * 20
      ))
      setTrustScore(score)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function checkCustomer() {
    const cust = await getCustomer()
    setCustomer(cust)
  }

  function goToCompany(c) {
    if (c.slug) window.location.href = '/' + c.slug
    else navigate('company', { company: c })
  }

  function formatStat(n) {
    if (n >= 1000) return Math.floor(n / 1000) + 'K+'
    if (n >= 100) return n + '+'
    return String(n)
  }

  // ─────────────────────────────────────────────────────
  // TOPBAR
  // ─────────────────────────────────────────────────────
  const Topbar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, padding: isMobile ? '10px 14px' : '0 20px', height: isMobile ? 'auto' : 48, background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-default)', position: 'sticky', top: 0, zIndex: 100, overflowX: 'hidden' }}>
      <Logo size={isMobile ? 13 : 15} />

      {isDesktop && (
        <nav style={{ display: 'flex', gap: 14, marginLeft: 8 }}>
          {['Home','Categories','Top Rated','Near Me','City Map'].map((l, i) => (
            <button key={l} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? '#0099cc' : 'var(--text-muted)', borderBottom: i === 0 ? '1.5px solid #0099cc' : 'none', paddingBottom: 2, height: 48 }}>
              {l}
            </button>
          ))}
        </nav>
      )}

      {!isMobile && (
        <div style={{ flex: 1, maxWidth: 200, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', borderRadius: 20, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-search" style={{ fontSize: 10, color: '#0099cc' }} />
          <input placeholder="Search companies..." onKeyDown={e => e.key === 'Enter' && navigate('search', { query: e.target.value })}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 9, color: 'var(--text-primary)', width: '100%' }} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 7, marginLeft: 'auto' }}>
        <ThemeToggle />
        <button onClick={() => window.open('https://business.trustdubai.ae', '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '4px 8px' : '5px 10px', border: '0.5px solid #b3d9f0', borderRadius: 99, background: '#f0faff', color: '#0099cc', fontSize: isMobile ? 9 : 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <i className="ti ti-briefcase" style={{ fontSize: 9 }} />
          {isMobile ? 'My Biz' : 'My Business'}
        </button>
        {customer ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: '0.5px solid var(--border-default)', borderRadius: 99, background: 'var(--bg-card)', cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                {(customer.full_name || customer.email)[0].toUpperCase()}
              </div>
              {!isMobile && <span style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 600 }}>
                {(customer.full_name || customer.email.split('@')[0]).slice(0, 12)}
              </span>}
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 36, background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 8, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 8px', borderBottom: '0.5px solid var(--border-default)', marginBottom: 4 }}>{customer.email}</div>
                <button onClick={() => { signOut(); setCustomer(null); setShowUserMenu(false) }}
                  style={{ width: '100%', padding: '7px 8px', background: '#fff0f0', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => signInWithGoogle()}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '4px 8px' : '5px 10px', border: 'none', borderRadius: 99, background: '#fff', color: '#374151', fontSize: isMobile ? 9 : 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
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

  // ─────────────────────────────────────────────────────
  // HERO
  // ─────────────────────────────────────────────────────
  const Hero = () => (
    <div style={{ background: 'var(--bg-card)', padding: isMobile ? '20px 14px 16px' : '24px 20px 20px', borderBottom: '0.5px solid var(--border-default)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,153,204,0.05) 0%, transparent 70%)', top: -60, right: -40, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', borderRadius: 99, padding: '3px 10px', marginBottom: 10 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 10, color: '#0099cc' }} />
          <span style={{ fontSize: 9, color: '#0099cc', fontWeight: 600 }}>Dubai's Most Trusted Review Platform</span>
        </div>
        <h1 style={{ fontSize: isMobile ? 22 : isTablet ? 26 : 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 6 }}>
          Find Trusted <span style={{ color: '#0099cc' }}>Services</span> in Dubai
        </h1>
        <p style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          Verified companies · Real reviews from real customers
        </p>
        <div style={{ maxWidth: 440, margin: '0 auto 14px' }}>
          <SearchBar placeholder="AC repair, plumbing, interiors..." onSearch={(q) => navigate('search', { query: q })} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            ['companies', 'Verified Companies'],
            ['reviews',   'Customer Reviews'],
            ['avgRating', 'Avg Rating'],
            ['verified',  'Verified Businesses'],
          ].map(([key, label]) => (
            <div key={key} style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', borderRadius: 8, padding: '7px 12px', textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: '#0099cc', lineHeight: 1 }}>
                {key === 'avgRating' ? stats.avgRating + '★' : formatStat(stats[key])}
              </div>
              <div style={{ fontSize: 7.5, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────
  // CATEGORIES — 1:1 square cards
  // ─────────────────────────────────────────────────────
  const Categories = () => (
    <div style={{ padding: isMobile ? '10px 14px 6px' : '10px 14px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Services</span>
        <button onClick={() => navigate('search', {})} style={{ background: 'none', border: 'none', fontSize: 9, color: '#0099cc', cursor: 'pointer', fontWeight: 600 }}>See all</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
        {CATEGORIES.map(c => (
          <div key={c.cat} onClick={() => navigate('search', { category: c.cat })}
            style={{ cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            {/* 1:1 square via paddingTop trick */}
            <div style={{ position: 'relative', width: '100%', paddingTop: '100%', background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{c.icon}</span>
                <span style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500, lineHeight: 1.2, padding: '0 2px' }}>{c.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────────────
  const Sidebar = () => (
    <div style={{ width: 200, flexShrink: 0, background: 'var(--bg-card)', borderRight: '0.5px solid var(--border-default)', padding: '10px 0' }}>
      {[
        { label: 'Browse', items: [
          { icon: 'ti-home',    name: 'Home',           active: true },
          { icon: 'ti-search',  name: 'Search' },
          { icon: 'ti-star',    name: 'Top Rated' },
          { icon: 'ti-map-pin', name: 'Near Me' },
          { icon: 'ti-clock',   name: 'Recently Added' },
        ]},
        { label: 'Services', items: [
          { icon: 'ti-snowflake', name: 'AC Service' },
          { icon: 'ti-tool',      name: 'Plumbing' },
          { icon: 'ti-brush',     name: 'Painting' },
          { icon: 'ti-bolt',      name: 'Electrical' },
          { icon: 'ti-sofa',      name: 'Interior' },
          { icon: 'ti-building',  name: 'Renovation' },
        ]},
        { label: 'Explore', items: [
          { icon: 'ti-map-2',      name: 'City Map' },
          { icon: 'ti-chart-line', name: 'Review Trends' },
          { icon: 'ti-users',      name: 'Community' },
        ]},
      ].map(section => (
        <div key={section.label}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px 3px' }}>{section.label}</div>
          {section.items.map(item => (
            <div key={item.name}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 11, color: item.active ? '#0099cc' : 'var(--text-secondary)', background: item.active ? '#f0faff' : 'transparent', borderRight: item.active ? '2px solid #0099cc' : 'none', fontWeight: item.active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 14, flexShrink: 0 }} />
              {item.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  // ─────────────────────────────────────────────────────
  // SECTION CARD — reusable
  // ─────────────────────────────────────────────────────
  function SectionCard({ icon, title, subtitle, children }) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 12, color: '#0099cc' }} />
          {title}
          {subtitle && <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>{subtitle}</span>}
        </div>
        {children}
      </div>
    )
  }

  function CoRow({ company, i, total, badge, extra }) {
    const colors = [
      { bg: '#fef3c7', color: '#92400e' },
      { bg: '#ede9fe', color: '#5b21b6' },
      { bg: '#d1fae5', color: '#065f46' },
      { bg: '#e0f9ff', color: '#0077aa' },
    ]
    const c = colors[i % colors.length]
    return (
      <div onClick={() => goToCompany(company)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: i < total - 1 ? '0.5px solid var(--border-default)' : 'none', cursor: 'pointer' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {company.name?.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
          <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{company.category || company.categories?.[0] || '—'}</div>
        </div>
        {badge}
        {extra}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────
  // MAIN CONTENT (Desktop)
  // ─────────────────────────────────────────────────────
  const MainContent = () => (
    <div style={{ flex: 1, minWidth: 0, maxWidth: 'calc(100vw - 440px)', padding: '10px 14px', background: 'var(--bg-secondary)', overflowX: 'hidden' }}>

      <Categories />

      <TrustWave score={trustScore} />

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>

        <SectionCard icon="ti-star" title="Top Rated">
          {(topCompanies.length > 0 ? topCompanies : companies).slice(0, 4).map((c, i, arr) => (
            <CoRow key={c.id} company={c} i={i} total={arr.length}
              badge={
                <div style={{ fontSize: 9, fontWeight: 700, color: '#f5a623', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {c.avg_rating || '—'}★
                  {c.plan === 'gold' && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#fef3c7', color: '#92400e' }}>G</span>}
                  {c.plan === 'platinum' && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#ede9fe', color: '#5b21b6' }}>P</span>}
                </div>
              }
            />
          ))}
        </SectionCard>

        <SectionCard icon="ti-map-pin" title="Near Me" subtitle="· Dubai">
          {(nearCompanies.length > 0 ? nearCompanies : companies).slice(0, 4).map((c, i, arr) => (
            <CoRow key={c.id} company={c} i={i} total={arr.length}
              badge={<span style={{ fontSize: 8, color: '#0099cc', fontWeight: 600, whiteSpace: 'nowrap' }}>{((i + 1) * 0.8).toFixed(1)} km</span>}
            />
          ))}
        </SectionCard>

        <SectionCard icon="ti-clock" title="Recently Added">
          {(newCompanies.length > 0 ? newCompanies : companies).slice(0, 4).map((c, i, arr) => (
            <CoRow key={c.id} company={c} i={i} total={arr.length}
              badge={<span style={{ fontSize: 7, background: '#e0f9ff', color: '#0077aa', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>New</span>}
            />
          ))}
        </SectionCard>

        <SectionCard icon="ti-map-2" title="City Network">
          <CityMap height={78} />
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 6 }}>
            {['Downtown','Business Bay','JBR','DIFC','+8 more'].map(a => (
              <span key={a} style={{ fontSize: 7.5, background: '#e0f9ff', color: '#0077aa', padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>{a}</span>
            ))}
          </div>
        </SectionCard>

      </div>

      {/* Review Graph — full width */}
      <ReviewGraph data={reviewData} />

    </div>
  )

  // ─────────────────────────────────────────────────────
  // BOTTOM NAV (Mobile)
  // ─────────────────────────────────────────────────────
  const BottomNav = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-default)', padding: '8px 0 10px', display: 'flex', justifyContent: 'space-around', zIndex: 100 }}>
      {[
        { icon: 'ti-home',           label: 'Home',     active: true },
        { icon: 'ti-search',         label: 'Search',   action: () => navigate('search', {}) },
        { icon: 'ti-building-store', label: 'List Biz', action: () => window.open('https://business.trustdubai.ae', '_blank') },
        { icon: 'ti-star',           label: 'Reviews' },
      ].map(item => (
        <button key={item.label} onClick={item.action}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px' }}>
          <i className={`ti ${item.icon}`} style={{ fontSize: 18, color: item.active ? '#0099cc' : 'var(--text-muted)' }} />
          {item.active && <div style={{ width: 4, height: 4, background: '#0099cc', borderRadius: '50%' }} />}
          <span style={{ fontSize: 8, color: item.active ? '#0099cc' : 'var(--text-muted)', fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
        </button>
      ))}
    </div>
  )

  // ─────────────────────────────────────────────────────
  // MOBILE / TABLET SECTIONS
  // ─────────────────────────────────────────────────────
  const SimpleSections = () => (
    <div style={{ padding: isMobile ? '8px 14px' : '10px 16px' }}>
      <TrustWave score={trustScore} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Top Rated</span>
        <button onClick={() => navigate('search', {})} style={{ background: 'none', border: 'none', fontSize: 9, color: '#0099cc', cursor: 'pointer', fontWeight: 600 }}>View all</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : '1fr', gap: isTablet ? 10 : 0 }}>
        {loading
          ? [1,2,3].map(i => <div key={i} style={{ height: 70, background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 6 }} />)
          : companies.map(c => <CompanyCard key={c.id} company={c} onClick={() => goToCompany(c)} />)
        }
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <i className="ti ti-map-2" style={{ fontSize: 12, color: '#0099cc' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>City Network</span>
        </div>
        <CityMap height={isMobile ? 90 : 120} />
      </div>
      {isTablet && (
        <div style={{ marginTop: 12 }}>
          <ReviewGraph data={reviewData} />
        </div>
      )}
    </div>
  )

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 70, overflowX: 'hidden' }}>
        <Topbar />
        <Hero />
        <div style={{ padding: '10px 14px 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CATEGORIES.map(c => (
              <div key={c.cat} onClick={() => navigate('search', { category: c.cat })}
                style={{ cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: '100%', paddingTop: '100%', background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{c.icon}</span>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{c.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <SimpleSections />
        <BottomNav />
      </div>
    )
  }

  if (isTablet) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
        <Topbar />
        <Hero />
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: '10px 16px 6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <div key={c.cat} onClick={() => navigate('search', { category: c.cat })} style={{ cursor: 'pointer' }}>
                    <div style={{ position: 'relative', width: '100%', paddingTop: '100%', background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{c.icon}</span>
                        <span style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <SimpleSections />
          </div>
        </div>
      </div>
    )
  }

  // Desktop
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      <Topbar />
      <Hero />
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - 48px - 160px)' }}>
        <Sidebar />
        <MainContent />
        <RightPanel recentReviews={recentReviews} navigate={navigate} />
      </div>
    </div>
  )
}
