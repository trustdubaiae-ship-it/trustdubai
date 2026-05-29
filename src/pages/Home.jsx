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
  { name: 'Flooring',   icon: '🏠', cat: 'Flooring' },
  { name: 'Bathroom',   icon: '🛁', cat: 'Bathroom' },
  { name: 'Windows',    icon: '🪟', cat: 'Windows' },
  { name: 'Landscape',  icon: '🌿', cat: 'Landscaping' },
]

const MAP_PINS = [
  { top: '30%', left: '34%' }, { top: '44%', left: '52%' },
  { top: '56%', left: '22%' }, { top: '22%', left: '66%' },
  { top: '60%', left: '70%' }, { top: '34%', left: '80%' },
  { top: '50%', left: '42%' },
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

// ── Company Card (horizontal layout) ─────────────────
function CoCard({ company, badge, extra, onClick }) {
  const plan = company.plan || 'free'
  const initials = company.name?.slice(0, 2).toUpperCase()
  const avColors = [
    { bg: '#ede9fe', color: '#5b21b6' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#d1fae5', color: '#065f46' },
    { bg: '#e0f9ff', color: '#0077aa' },
    { bg: '#fce7f3', color: '#9d174d' },
  ]
  const av = avColors[company.name?.charCodeAt(0) % avColors.length]
  return (
    <div onClick={onClick}
      style={{
        background: plan === 'gold' ? '#fffef8' : plan === 'platinum' ? '#fdfbff' : 'var(--bg-card)',
        border: `0.5px solid ${plan === 'gold' ? 'rgba(232,184,75,0.5)' : plan === 'platinum' ? 'rgba(139,92,246,0.35)' : 'var(--border-default)'}`,
        borderRadius: 10, padding: '9px 10px', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,153,204,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Top row: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</div>
          <div style={{ fontSize: 7.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.category || company.categories?.[0] || '—'}</div>
        </div>
      </div>
      {/* Bottom row: rating/badge + extra */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {badge}
      </div>
      {extra && <div style={{ fontSize: 7.5, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 2 }}>{extra}</div>}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────
function Section({ icon, title, subtitle, viewAll, children, style = {} }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: '9px 11px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 12, color: '#0099cc' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</span>
          {subtitle && <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>{subtitle}</span>}
        </div>
        {viewAll && <span style={{ fontSize: 8, color: '#0099cc', fontWeight: 600, cursor: 'pointer' }}>{viewAll}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Trust Wave ────────────────────────────────────────
function TrustWave({ score }) {
  const bars = [4,8,12,6,10,14,8,5,11,7,9,13,6,10,8,12,5,9,11,7,8,11,7,13]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, padding: '5px 10px', marginBottom: 8 }}>
      <i className="ti ti-heart-rate-monitor" style={{ fontSize: 11, color: '#0099cc' }} />
      <span style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Platform Trust Score</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, height: 14 }}>
        {bars.map((h, i) => <div key={i} style={{ width: 2, height: h, background: '#0099cc', borderRadius: 1, opacity: 0.6 }} />)}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#0099cc' }}>{score}/100</span>
    </div>
  )
}

// ── City Map ──────────────────────────────────────────
function CityMap({ height = 100 }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #e8f4fd, #dbeafe)', borderRadius: 8, position: 'relative', overflow: 'hidden', height }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(#0099cc 1px, transparent 1px), linear-gradient(90deg, #0099cc 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      <div style={{ position: 'relative', fontSize: 8, fontWeight: 700, color: '#0077aa', padding: '8px 10px 0' }}>🗺️ Dubai Service Heatmap</div>
      {MAP_PINS.map((pin, i) => (
        <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left, width: 8, height: 8, background: '#0099cc', borderRadius: '50%', border: '1.5px solid #fff' }} />
      ))}
    </div>
  )
}

// ── Review Graph ──────────────────────────────────────
function ReviewGraph({ data }) {
  const bars = [4,8,12,6,10,14,8,5,11,7,9,13,6,10,8,12,5,9,11,7]
  return (
    <Section icon="ti-chart-line" title="Reviews This Month"
      subtitle="— star-wise trend"
      viewAll={`${new Date().toLocaleString('en-AE',{month:'long',year:'numeric'})} · ${data.total} total`}
    >
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
        {[['#10b981','5★'],['#0099cc','4★'],['#f5a623','3★'],['#f97316','2★'],['#ef4444','1★']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, color: 'var(--text-muted)' }}>
            <div style={{ width: 12, height: 3, background: c, borderRadius: 99 }} />{l}
          </div>
        ))}
      </div>
      {/* Chart */}
      <div style={{ position: 'relative', height: 80 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 22 }}>
          {['30','15','0'].map(l => <span key={l} style={{ fontSize: 7, color: 'var(--text-muted)' }}>{l}</span>)}
        </div>
        <div style={{ position: 'absolute', left: 24, right: 0, top: 0, bottom: 16 }}>
          <svg width="100%" height="100%" viewBox="0 0 540 64" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g5fin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0,21,43,64].map(y => <line key={y} x1="0" y1={y} x2="540" y2={y} stroke="var(--border-default)" strokeWidth="0.5"/>)}
            <path d="M0,56 27,51 54,46 81,41 108,36 135,30 162,24 189,19 216,15 243,11 270,9 297,7 324,5 351,4 378,3 405,2 432,2 459,1 486,1 513,1 540,1 L540,64 L0,64 Z" fill="url(#g5fin)"/>
            <polyline points="0,56 27,51 54,46 81,41 108,36 135,30 162,24 189,19 216,15 243,11 270,9 297,7 324,5 351,4 378,3 405,2 432,2 459,1 486,1 513,1 540,1" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <polyline points="0,58 27,57 54,55 81,53 108,51 135,49 162,47 189,45 216,43 243,42 270,40 297,38 324,36 351,35 378,33 405,32 432,31 459,30 486,29 513,29 540,28" fill="none" stroke="#0099cc" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <polyline points="0,61 27,61 54,60 81,60 108,60 135,60 162,61 189,60 216,59 243,60 270,59 297,60 324,59 351,60 378,61 405,60 432,59 459,60 486,61 513,60 540,60" fill="none" stroke="#f5a623" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3,2"/>
            <polyline points="0,62 27,62 54,63 81,62 108,63 135,62 156,63 189,62 208,63 243,62 270,63 297,62 324,63 351,62 378,63 405,62 432,63 459,62 486,63 513,62 540,63" fill="none" stroke="#f97316" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2,3"/>
            <polyline points="0,63 27,64 54,63 81,62 104,64 130,63 156,62 182,64 208,63 234,62 260,64 286,63 312,62 338,64 364,63 390,62 416,64 442,63 468,62 494,64 520,63" fill="none" stroke="#ef4444" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1,3"/>
            <circle cx="540" cy="1" r="2.5" fill="#10b981"/>
            <circle cx="540" cy="28" r="2" fill="#0099cc"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 24, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between' }}>
          {['1','7','14','21','30'].map(l => <span key={l} style={{ fontSize: 7, color: 'var(--text-muted)' }}>{l}</span>)}
        </div>
      </div>
      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
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
    </Section>
  )
}

// ── Right Panel ───────────────────────────────────────
function RightPanel({ recentReviews }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  return (
    <div style={{ width: 230, flexShrink: 0, background: 'var(--bg-card)', borderLeft: '0.5px solid var(--border-default)', padding: 12, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

      {/* Sponsored */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-ad-2" style={{ fontSize: 11, color: '#0099cc' }} /> Sponsored
        </div>
        {[
          { init:'JI', bg:'#ede9fe', color:'#5b21b6', name:'Jaguar Interiors', cat:'Luxury Interior Design', rat:'★★★★★ 4.9' },
          { init:'RF', bg:'#fef3c7', color:'#92400e', name:'RenoFix Plus', cat:'Construction & Renovation', rat:'★★★★½ 4.8' },
          { init:'AC', bg:'#d1fae5', color:'#065f46', name:'AirCool Dubai', cat:'AC Service & Maintenance', rat:'★★★★★ 4.6' },
        ].map(s => (
          <div key={s.name} style={{ background: '#f0faff', border: '0.5px solid #b3d9f0', borderRadius: 8, padding: '8px 10px', marginBottom: 6, position: 'relative' }}>
            <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 7, color: '#7a9ab5', background: '#e8f4fd', padding: '1px 4px', borderRadius: 3 }}>Ad</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{s.init}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>{s.cat}</div>
              </div>
            </div>
            <div style={{ fontSize: 8.5, color: '#f5a623', marginBottom: 5 }}>{s.rat}</div>
            <button style={{ width: '100%', background: '#0099cc', border: 'none', borderRadius: 5, padding: '4px 0', fontSize: 9, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>View Profile</button>
          </div>
        ))}
      </div>

      {/* Trending */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-trending-up" style={{ fontSize: 11, color: '#0099cc' }} /> Trending
        </div>
        {[
          { r:'1', name:'RenoFix Plus',    cat:'Construction',   hot:true },
          { r:'2', name:'Jaguar Interiors', cat:'Interior Design', hot:true },
          { r:'3', name:'AirCool Dubai',    cat:'AC Service' },
          { r:'4', name:'CleanPro Dubai',   cat:'Cleaning' },
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
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-message-circle" style={{ fontSize: 11, color: '#0099cc' }} /> Recent Reviews
        </div>
        {(recentReviews.length > 0 ? recentReviews : [
          { id:1, reviewer_name:'M. Ahmed',     rating:5, review_text:'Incredible job! Highly recommend.' },
          { id:2, reviewer_name:'S. Hassan',    rating:4, review_text:'Amazing design, professional team.' },
          { id:3, reviewer_name:'F. Al Rashid', rating:5, review_text:'Fast service, great response time!' },
        ]).slice(0,3).map((r, i) => (
          <div key={r.id || i} style={{ display: 'flex', gap: 7, padding: '5px 0', borderBottom: i < 2 ? '0.5px solid var(--border-default)' : 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: ['#0099cc','#7c3aed','#059669'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(r.reviewer_name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reviewer_name}</div>
              <div style={{ fontSize: 7.5, color: 'var(--text-muted)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(r.review_text||'').slice(0,42)}...</div>
              <div style={{ fontSize: 8, color: '#f5a623' }}>{'★'.repeat(r.rating||5)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Newsletter */}
      <div style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-mail" style={{ fontSize: 11, color: '#0099cc' }} /> Service Deals
        </div>
        <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>Weekly deals & top-rated alerts in Dubai.</div>
        {subscribed ? (
          <div style={{ background: '#f0fdf4', border: '0.5px solid #a7f3d0', borderRadius: 6, padding: '5px 8px', fontSize: 9, color: '#065f46', fontWeight: 600, textAlign: 'center' }}>✓ Subscribed!</div>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex: 1, padding: '5px 8px', border: '0.5px solid var(--border-default)', borderRadius: 6, fontSize: 9, background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }} />
            <button onClick={() => { if (email.includes('@')) setSubscribed(true) }}
              style={{ padding: '5px 9px', background: '#0099cc', border: 'none', borderRadius: 6, fontSize: 9, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Join</button>
          </div>
        )}
      </div>

      {/* App Download */}
      <div style={{ background: '#1a2744', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-device-mobile" style={{ fontSize: 11, color: '#0099cc' }} /> Download App
        </div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 8, lineHeight: 1.5 }}>Find trusted services on the go.</div>
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

// ── Sidebar ───────────────────────────────────────────
function Sidebar() {
  const items = [
    { label:'Browse', items:[
      { icon:'ti-home',    name:'Home',           active:true },
      { icon:'ti-search',  name:'Search' },
      { icon:'ti-star',    name:'Top Rated' },
      { icon:'ti-map-pin', name:'Near Me' },
      { icon:'ti-clock',   name:'Recently Added' },
    ]},
    { label:'Services', items:[
      { icon:'ti-snowflake', name:'AC Service' },
      { icon:'ti-tool',      name:'Plumbing' },
      { icon:'ti-brush',     name:'Painting' },
      { icon:'ti-bolt',      name:'Electrical' },
      { icon:'ti-sofa',      name:'Interior' },
      { icon:'ti-building',  name:'Renovation' },
    ]},
    { label:'Explore', items:[
      { icon:'ti-map-2',      name:'City Map' },
      { icon:'ti-chart-line', name:'Review Trends' },
      { icon:'ti-users',      name:'Community' },
    ]},
  ]
  return (
    <div style={{ width: 190, flexShrink: 0, background: 'var(--bg-card)', borderRight: '0.5px solid var(--border-default)', padding: '10px 0' }}>
      {items.map(section => (
        <div key={section.label}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px 3px' }}>{section.label}</div>
          {section.items.map(item => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', fontSize: 11, color: item.active ? '#0099cc' : 'var(--text-secondary)', background: item.active ? '#f0faff' : 'transparent', borderRight: item.active ? '2px solid #0099cc' : 'none', fontWeight: item.active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 13, flexShrink: 0 }} />
              {item.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function Home({ navigate }) {
  const [topCos,       setTopCos]       = useState([])
  const [nearCos,      setNearCos]      = useState([])
  const [newCos,       setNewCos]       = useState([])
  const [recentReviews,setRecentReviews]= useState([])
  const [stats,        setStats]        = useState({ companies:0, reviews:0, avgRating:'0.0', verified:0 })
  const [reviewData,   setReviewData]   = useState({ total:0, s5:0, s4:0, s3:0, s2:0, s1:0, s5_pct:0, s4_pct:0 })
  const [trustScore,   setTrustScore]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [customer,     setCustomer]     = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const device = useDevice()
  const isMobile  = device === 'mobile'
  const isTablet  = device === 'tablet'
  const isDesktop = device === 'desktop'

  useEffect(() => {
    fetchAll()
    checkCustomer()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) { setCustomer(await upsertCustomer(session.user)) }
      else if (event === 'SIGNED_OUT') { setCustomer(null) }
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
        supabase.from('companies').select('*', { count:'exact', head:true }).eq('status','approved'),
        supabase.from('reviews').select('*', { count:'exact', head:true }).eq('is_approved',true),
        supabase.from('companies').select('*', { count:'exact', head:true }).eq('status','approved').eq('is_verified',true),
        supabase.from('reviews').select('rating').eq('is_approved',true),
        supabase.from('companies').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(20),
        supabase.from('reviews').select('rating,created_at').eq('is_approved',true),
        supabase.from('reviews').select('id,reviewer_name,rating,review_text,created_at').eq('is_approved',true).order('created_at',{ascending:false}).limit(5),
      ])

      const avg = ratData?.length > 0 ? (ratData.reduce((s,r)=>s+r.rating,0)/ratData.length).toFixed(1) : '0.0'
      setStats({ companies: totalCo||0, reviews: totalRev||0, avgRating: avg, verified: verifiedCo||0 })

      const approved = allCo || []
      setTopCos([...approved].sort((a,b)=>(b.avg_rating||0)-(a.avg_rating||0)).slice(0,4))
      setNearCos([...approved].slice(0,4))
      setNewCos([...approved].slice(0,4))
      setRecentReviews(recentRev || [])

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const thisMonth = (revData||[]).filter(r=>r.created_at >= monthStart)
      const s5=thisMonth.filter(r=>r.rating===5).length, s4=thisMonth.filter(r=>r.rating===4).length
      const s3=thisMonth.filter(r=>r.rating===3).length, s2=thisMonth.filter(r=>r.rating===2).length
      const s1=thisMonth.filter(r=>r.rating===1).length, total=thisMonth.length
      setReviewData({ total, s5, s4, s3, s2, s1, s5_pct: total>0?Math.round(s5/total*100):0, s4_pct: total>0?Math.round(s4/total*100):0 })

      setTrustScore(Math.min(100, Math.round(
        (verifiedCo/Math.max(totalCo,1))*40 + (parseFloat(avg)/5)*40 + Math.min((totalRev||0)/100,1)*20
      )))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function checkCustomer() {
    const cust = await getCustomer()
    setCustomer(cust)
  }

  function goTo(c) {
    if (c.slug) window.location.href = '/' + c.slug
    else navigate('company', { company: c })
  }

  function fmt(n) {
    if (n >= 1000) return Math.floor(n/1000)+'K+'
    if (n >= 100) return n+'+'
    return String(n)
  }

  // ── Topbar ──────────────────────────────────────────
  function Topbar() {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:isMobile?8:12, padding:isMobile?'10px 14px':'0 20px', height:isMobile?'auto':48, background:'var(--bg-card)', borderBottom:'0.5px solid var(--border-default)', position:'sticky', top:0, zIndex:100, overflowX:'hidden' }}>
        <Logo size={isMobile?13:15} />
        {isDesktop && (
          <nav style={{ display:'flex', gap:14, marginLeft:8 }}>
            {['Home','Categories','Top Rated','Near Me','City Map'].map((l,i)=>(
              <button key={l} style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, fontWeight:i===0?700:500, color:i===0?'#0099cc':'var(--text-muted)', borderBottom:i===0?'1.5px solid #0099cc':'none', paddingBottom:2, height:48 }}>{l}</button>
            ))}
          </nav>
        )}
        {!isMobile && (
          <div style={{ flex:1, maxWidth:200, background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:20, padding:'5px 10px', display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-search" style={{ fontSize:10, color:'#0099cc' }} />
            <input placeholder="Search companies..." onKeyDown={e=>e.key==='Enter'&&navigate('search',{query:e.target.value})}
              style={{ border:'none', background:'none', outline:'none', fontSize:9, color:'var(--text-primary)', width:'100%' }} />
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:isMobile?5:7, marginLeft:'auto' }}>
          <ThemeToggle />
          <button onClick={()=>window.open('https://business.trustdubai.ae','_blank')}
            style={{ display:'flex', alignItems:'center', gap:4, padding:isMobile?'4px 8px':'5px 10px', border:'0.5px solid #b3d9f0', borderRadius:99, background:'#f0faff', color:'#0099cc', fontSize:isMobile?9:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
            <i className="ti ti-briefcase" style={{ fontSize:9 }} />
            {isMobile?'My Biz':'My Business'}
          </button>
          {customer ? (
            <div style={{ position:'relative' }}>
              <button onClick={()=>setShowUserMenu(!showUserMenu)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', border:'0.5px solid var(--border-default)', borderRadius:99, background:'var(--bg-card)', cursor:'pointer' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'#1a2744', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff' }}>
                  {(customer.full_name||customer.email)[0].toUpperCase()}
                </div>
                {!isMobile && <span style={{ fontSize:10, color:'var(--text-primary)', fontWeight:600 }}>{(customer.full_name||customer.email.split('@')[0]).slice(0,12)}</span>}
              </button>
              {showUserMenu && (
                <div style={{ position:'absolute', right:0, top:34, background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:8, minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.1)', zIndex:200 }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', padding:'4px 8px', borderBottom:'0.5px solid var(--border-default)', marginBottom:4 }}>{customer.email}</div>
                  <button onClick={()=>{signOut();setCustomer(null);setShowUserMenu(false)}}
                    style={{ width:'100%', padding:'7px 8px', background:'#fff0f0', color:'#dc2626', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', textAlign:'left' }}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={()=>signInWithGoogle()}
              style={{ display:'flex', alignItems:'center', gap:4, padding:isMobile?'4px 8px':'5px 10px', border:'none', borderRadius:99, background:'#fff', color:'#374151', fontSize:isMobile?9:10, fontWeight:600, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.12)', whiteSpace:'nowrap' }}>
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

  // ── Hero ────────────────────────────────────────────
  function Hero() {
    return (
      <div style={{ background:'var(--bg-card)', padding:isMobile?'18px 14px 14px':'16px 20px 14px', borderBottom:'0.5px solid var(--border-default)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,153,204,0.05) 0%, transparent 70%)', top:-50, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'relative', maxWidth:520, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'var(--bg-secondary)', border:'0.5px solid var(--border-default)', borderRadius:99, padding:'3px 10px', marginBottom:9 }}>
            <i className="ti ti-shield-check" style={{ fontSize:10, color:'#0099cc' }} />
            <span style={{ fontSize:9, color:'#0099cc', fontWeight:600 }}>Dubai's Most Trusted Review Platform</span>
          </div>
          <h1 style={{ fontSize:isMobile?22:isTablet?26:28, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-1px', lineHeight:1.1, marginBottom:5 }}>
            Find Trusted <span style={{ color:'#0099cc' }}>Services</span> in Dubai
          </h1>
          <p style={{ fontSize:isMobile?11:12, color:'var(--text-muted)', marginBottom:12, lineHeight:1.6 }}>
            Verified companies · Real reviews from real customers
          </p>
          <div style={{ maxWidth:420, margin:'0 auto 12px' }}>
            <SearchBar placeholder="AC repair, plumbing, interiors..." onSearch={q=>navigate('search',{query:q})} />
          </div>
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

  // ── Services scroll ─────────────────────────────────
  function ServicesRow() {
    return (
      <div style={{ background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, padding:'9px 11px', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-category" style={{ fontSize:12, color:'#0099cc' }} />
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Top Services</span>
          </div>
          <span style={{ fontSize:8, color:'var(--text-muted)' }}>← swipe →</span>
        </div>
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:3 }}>
          {CATEGORIES.map((c,i)=>(
            <div key={c.cat} onClick={()=>navigate('search',{category:c.cat})}
              style={{ flexShrink:0, width:52, height:52, background:i===0?'#f0faff':'var(--bg-secondary)', border:`0.5px solid ${i===0?'#0099cc':'var(--border-default)'}`, borderRadius:9, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#0099cc';e.currentTarget.style.background='#f0faff'}}
              onMouseLeave={e=>{if(i!==0){e.currentTarget.style.borderColor='var(--border-default)';e.currentTarget.style.background='var(--bg-secondary)'}}}
            >
              <span style={{ fontSize:17, lineHeight:1 }}>{c.icon}</span>
              <span style={{ fontSize:7, color:i===0?'#0099cc':'var(--text-muted)', fontWeight:i===0?600:400, textAlign:'center' }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Plan tag ─────────────────────────────────────────
  function PlanTag({ plan }) {
    if (plan === 'gold') return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#fef3c7', color:'#92400e' }}>Gold</span>
    if (plan === 'platinum') return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#ede9fe', color:'#5b21b6' }}>Platinum</span>
    return <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, fontWeight:700, background:'#d1fae5', color:'#065f46' }}>✓</span>
  }

  // ── Desktop Main Content ─────────────────────────────
  function MainContent() {
    const fallback = Array(4).fill(null).map((_,i)=>({ id:i, name:'Loading...', category:'—', plan:'free' }))
    const top  = loading ? fallback : (topCos.length  > 0 ? topCos  : fallback)
    const near = loading ? fallback : (nearCos.length > 0 ? nearCos : fallback)
    const novo = loading ? fallback : (newCos.length  > 0 ? newCos  : fallback)

    return (
      <div style={{ flex:1, minWidth:0, padding:'10px 14px', background:'var(--bg-secondary)', overflowX:'hidden' }}>

        <ServicesRow />
        <TrustWave score={trustScore} />

        {/* ROW 1: Top Rated + Near Me side by side */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>

          <Section icon="ti-star" title="Top Rated Companies" viewAll="View all →">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {top.map((c,i)=>(
                <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                  badge={
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{c.avg_rating||'—'}★</span>
                      <PlanTag plan={c.plan} />
                    </div>
                  }
                  extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                />
              ))}
            </div>
          </Section>

          <Section icon="ti-map-pin" title="Near Me" subtitle="· Dubai" viewAll="View all →">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {near.map((c,i)=>(
                <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                  badge={
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{c.avg_rating||'—'}★</span>
                      <span style={{ fontSize:7.5, color:'#0099cc', fontWeight:600 }}>{((i+1)*0.7).toFixed(1)}km</span>
                    </div>
                  }
                  extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                />
              ))}
            </div>
          </Section>

        </div>

        {/* ROW 2: Recently Added + City Network side by side */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>

          <Section icon="ti-clock" title="Recently Added" viewAll="View all →">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {novo.map((c,i)=>(
                <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                  badge={
                    <span style={{ fontSize:7, background:'#e0f9ff', color:'#0077aa', padding:'2px 6px', borderRadius:4, fontWeight:700 }}>New</span>
                  }
                  extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                />
              ))}
            </div>
          </Section>

          <Section icon="ti-map-2" title="City Network">
            <CityMap height={120} />
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:7 }}>
              {['Downtown','Business Bay','JBR','DIFC','Marina','Jumeirah','+6 more'].map(a=>(
                <span key={a} style={{ fontSize:7.5, background:'#e0f9ff', color:'#0077aa', padding:'2px 7px', borderRadius:4, fontWeight:600 }}>{a}</span>
              ))}
            </div>
          </Section>

        </div>

        {/* Review Graph — full width */}
        <ReviewGraph data={reviewData} />

      </div>
    )
  }

  // ── Bottom Nav ──────────────────────────────────────
  function BottomNav() {
    return (
      <div style={{ position:'fixed', bottom:0, left:0, right:0, maxWidth:480, margin:'0 auto', background:'var(--bg-card)', borderTop:'0.5px solid var(--border-default)', padding:'8px 0 10px', display:'flex', justifyContent:'space-around', zIndex:100 }}>
        {[
          { icon:'ti-home',           label:'Home',     active:true },
          { icon:'ti-search',         label:'Search',   action:()=>navigate('search',{}) },
          { icon:'ti-building-store', label:'List Biz', action:()=>window.open('https://business.trustdubai.ae','_blank') },
          { icon:'ti-star',           label:'Reviews' },
        ].map(item=>(
          <button key={item.label} onClick={item.action} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'0 8px' }}>
            <i className={`ti ${item.icon}`} style={{ fontSize:18, color:item.active?'#0099cc':'var(--text-muted)' }} />
            {item.active && <div style={{ width:4, height:4, background:'#0099cc', borderRadius:'50%' }} />}
            <span style={{ fontSize:8, color:item.active?'#0099cc':'var(--text-muted)', fontWeight:item.active?600:400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    )
  }

  // ── Mobile layout ───────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh', paddingBottom:70, overflowX:'hidden' }}>
        <Topbar />
        <Hero />
        {/* Mobile categories — 4x2 grid */}
        <div style={{ padding:'10px 14px 6px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {CATEGORIES.slice(0,8).map(c=>(
              <div key={c.cat} onClick={()=>navigate('search',{category:c.cat})} style={{ cursor:'pointer' }}>
                <div style={{ position:'relative', width:'100%', paddingTop:'100%', background:'var(--bg-card)', border:'0.5px solid var(--border-default)', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
                    <span style={{ fontSize:20, lineHeight:1 }}>{c.icon}</span>
                    <span style={{ fontSize:8, color:'var(--text-muted)', textAlign:'center', fontWeight:500 }}>{c.name}</span>
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
            topCos.map(c => <CompanyCard key={c.id} company={c} onClick={()=>goTo(c)} />)
          }
          <div style={{ marginTop:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:7 }}>
              <i className="ti ti-map-2" style={{ fontSize:12, color:'#0099cc' }} />
              <span style={{ fontSize:9, fontWeight:700, color:'var(--text-primary)', letterSpacing:'0.05em', textTransform:'uppercase' }}>City Network</span>
            </div>
            <CityMap height={90} />
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // ── Tablet layout ───────────────────────────────────
  if (isTablet) {
    return (
      <div style={{ background:'var(--bg-primary)', minHeight:'100vh', overflowX:'hidden' }}>
        <Topbar />
        <Hero />
        <div style={{ display:'flex' }}>
          <Sidebar />
          <div style={{ flex:1, minWidth:0, padding:'10px 16px' }}>
            <ServicesRow />
            <TrustWave score={trustScore} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <Section icon="ti-star" title="Top Rated" viewAll="View all →">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                  {topCos.slice(0,4).map((c,i)=>(
                    <CoCard key={c.id||i} company={c} onClick={()=>goTo(c)}
                      badge={<span style={{ fontSize:9, fontWeight:700, color:'#f5a623' }}>{c.avg_rating||'—'}★</span>}
                      extra={<><i className="ti ti-map-pin" style={{ fontSize:7 }}/> {c.area||c.location||'Dubai'}</>}
                    />
                  ))}
                </div>
              </Section>
              <Section icon="ti-map-2" title="City Network">
                <CityMap height={110} />
              </Section>
            </div>
            <ReviewGraph data={reviewData} />
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop layout ──────────────────────────────────
  return (
    <div style={{ background:'var(--bg-primary)', minHeight:'100vh', overflowX:'hidden' }}>
      <Topbar />
      <Hero />
      <div style={{ display:'flex', alignItems:'stretch', minHeight:'calc(100vh - 48px - 150px)' }}>
        <Sidebar />
        <MainContent />
        <RightPanel recentReviews={recentReviews} />
      </div>
    </div>
  )
}
