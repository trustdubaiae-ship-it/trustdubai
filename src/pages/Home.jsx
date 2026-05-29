import { useState, useEffect, useRef } from 'react'
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
  { top: '30%', left: '38%', label: 'Downtown' },
  { top: '45%', left: '58%', label: 'Business Bay' },
  { top: '55%', left: '24%', label: 'JBR' },
  { top: '20%', left: '70%', label: 'DIFC' },
  { top: '60%', left: '72%', label: 'Deira' },
  { top: '35%', left: '82%', label: 'Mirdif' },
]

function useDevice() {
  const [device, setDevice] = useState('mobile')
  useEffect(() => {
    function detect() {
      const w = window.innerWidth
      if (w >= 1025)     setDevice('desktop')
      else if (w >= 481) setDevice('tablet')
      else               setDevice('mobile')
    }
    detect()
    window.addEventListener('resize', detect)
    return () => window.removeEventListener('resize', detect)
  }, [])
  return device
}

// ── Logo Component ─────────────────────────────────────
function Logo({ size = 16 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, lineHeight: 1 }}>
      <span style={{ fontSize: size, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', fontFamily: "'DM Sans', sans-serif" }}>
        Trust
      </span>
      <span style={{ fontSize: size, fontWeight: 700, color: '#0099cc', letterSpacing: '-0.3px', fontFamily: "'DM Sans', sans-serif" }}>
        Dubai
      </span>
      <span style={{ fontSize: size * 0.4, color: '#0099cc', marginLeft: 1, marginBottom: size * 0.5, lineHeight: 1 }}>●</span>
    </div>
  )
}

// ── Map Component ──────────────────────────────────────
function CityMap({ height = 100 }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #e8f4fd 0%, #dbeafe 100%)',
      borderRadius: 10, padding: 10,
      position: 'relative', overflow: 'hidden', height,
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.12,
        backgroundImage: 'linear-gradient(#0099cc 1px, transparent 1px), linear-gradient(90deg, #0099cc 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      <div style={{ position: 'relative', fontSize: 9, fontWeight: 700, color: '#0077aa', marginBottom: 6 }}>
        🗺️ Dubai Service Map
      </div>
      {MAP_PINS.map((pin, i) => (
        <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left }}>
          <div style={{ width: 8, height: 8, background: '#0099cc', borderRadius: '50%', border: '1.5px solid #fff', position: 'relative' }}>
            <div style={{
              position: 'absolute', width: 16, height: 16,
              border: '1px solid rgba(0,153,204,0.4)', borderRadius: '50%',
              top: -4, left: -4,
              animation: 'pulse-ring 2s ease infinite',
              animationDelay: i * 0.3 + 's',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Trust Waveform ─────────────────────────────────────
function TrustWave({ score = 88 }) {
  const bars = [4, 8, 12, 6, 10, 14, 8, 5, 11, 7, 9, 13, 6, 10, 8, 12, 5, 9, 11, 7]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-card)', border: '0.5px solid var(--border-default)',
      borderRadius: 8, padding: '6px 10px', marginBottom: 8,
    }}>
      <i className="ti ti-heart-rate-monitor" style={{ fontSize: 11, color: '#0099cc' }} />
      <span style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Platform Trust</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, height: 14 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ width: 2, height: h, background: '#0099cc', borderRadius: 1, opacity: 0.65 }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#0099cc' }}>{score}</span>
    </div>
  )
}

// ── Community Feed ─────────────────────────────────────
function CommunityFeed({ reviews }) {
  if (!reviews.length) return null
  return (
    <div>
      {reviews.slice(0, 3).map((r, i) => (
        <div key={r.id || i} style={{
          display: 'flex', gap: 8, padding: '8px 0',
          borderBottom: i < 2 ? '0.5px solid var(--border-default)' : 'none',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: ['#0099cc', '#7c3aed', '#059669'][i % 3],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
          }}>
            {(r.reviewer_name || 'A')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>
              {r.reviewer_name || 'Anonymous'}
            </div>
            {r.review_text && (
              <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 1 }}>
                {r.review_text.slice(0, 60)}{r.review_text.length > 60 ? '...' : ''}
              </div>
            )}
            <div style={{ color: '#f5a623', fontSize: 9, marginTop: 2 }}>
              {'★'.repeat(r.rating || 5)}{'☆'.repeat(5 - (r.rating || 5))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Concierge Panel ────────────────────────────────────
function ConciergPanel() {
  return (
    <div style={{ background: '#1a2744', borderRadius: 12, padding: 12, marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
        TrustDubai Premium Concierge
      </div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
        Get instant expert help from our team
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.open('https://wa.me/971503856786', '_blank')}
          style={{ flex: 1, background: 'rgba(0,153,204,0.2)', border: 'none', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', textAlign: 'center' }}>
          <i className="ti ti-diamond" style={{ fontSize: 18, color: '#0099cc', display: 'block', marginBottom: 3 }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)' }}>Sapphire</span>
        </button>
        <button
          onClick={() => window.open('tel:+971503856786')}
          style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '8px 4px', cursor: 'pointer', textAlign: 'center' }}>
          <i className="ti ti-phone" style={{ fontSize: 18, color: '#fff', display: 'block', marginBottom: 3 }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)' }}>Call Now</span>
        </button>
      </div>
    </div>
  )
}

export default function Home({ navigate }) {
  const [companies, setCompanies]         = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [loading, setLoading]             = useState(true)
  const [customer, setCustomer]           = useState(null)
  const [showUserMenu, setShowUserMenu]   = useState(false)
  const device = useDevice()

  const isMobile  = device === 'mobile'
  const isTablet  = device === 'tablet'
  const isDesktop = device === 'desktop'

  useEffect(() => {
    fetchData()
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

  async function fetchData() {
    const [compRes, revRes] = await Promise.all([
      supabase.from('companies').select('*').eq('status', 'approved')
        .order('created_at', { ascending: false }).limit(10),
      supabase.from('reviews').select('id, reviewer_name, rating, review_text, created_at')
        .eq('is_approved', true).order('created_at', { ascending: false }).limit(5),
    ])
    setCompanies(compRes.data || [])
    setRecentReviews(revRes.data || [])
    setLoading(false)
  }

  async function checkCustomer() {
    const cust = await getCustomer()
    setCustomer(cust)
  }

  function goToCompany(company) {
    if (company.slug) window.location.href = '/' + company.slug
    else navigate('company', { company })
  }

  // ── TOPBAR ────────────────────────────────────────────
  const Topbar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
      padding: isMobile ? '10px 14px' : isTablet ? '10px 16px' : '10px 20px',
      background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-default)',
      position: 'sticky', top: 0, zIndex: 100,
      width: '100%', maxWidth: '100%', overflowX: 'hidden',
    }}>
      <Logo size={isMobile ? 14 : 16} />

      {/* Desktop nav links */}
      {isDesktop && (
        <nav style={{ display: 'flex', gap: 16, marginLeft: 8 }}>
          {['Home', 'Categories', 'Top Rated', 'City Map', 'Community'].map((l, i) => (
            <button key={l} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? '#0099cc' : 'var(--text-muted)',
              borderBottom: i === 0 ? '1.5px solid #0099cc' : 'none',
              paddingBottom: 1,
            }}>{l}</button>
          ))}
        </nav>
      )}

      {/* Tablet/Desktop search in nav */}
      {!isMobile && (
        <div style={{ flex: 1, maxWidth: isDesktop ? 240 : 200, background: 'var(--bg-secondary)', border: '0.5px solid var(--border-default)', borderRadius: 20, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-search" style={{ fontSize: 10, color: '#0099cc' }} />
          <input
            placeholder="Search companies..."
            onKeyDown={e => e.key === 'Enter' && navigate('search', { query: e.target.value })}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 9, color: 'var(--text-primary)', width: '100%' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 7, marginLeft: 'auto' }}>
        <ThemeToggle />

        {/* My Biz */}
        <button
          onClick={() => window.open('https://business.trustdubai.ae', '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '4px 8px' : '5px 10px', border: '0.5px solid #b3d9f0', borderRadius: 99, background: '#f0faff', color: '#0099cc', fontSize: isMobile ? 9 : 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <i className="ti ti-briefcase" style={{ fontSize: 9 }} />
          {isMobile ? 'My Biz' : 'My Business'}
        </button>

        {/* User */}
        {customer ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: '0.5px solid var(--border-default)', borderRadius: 99, background: 'var(--bg-card)', cursor: 'pointer' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                {(customer.full_name || customer.email)[0].toUpperCase()}
              </div>
              {!isMobile && <span style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 600 }}>
                {(customer.full_name || customer.email.split('@')[0]).slice(0, 10)}
              </span>}
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 34, background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 8, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200 }}>
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

  // ── HERO ──────────────────────────────────────────────
  const Hero = () => (
    <div style={{
      background: 'linear-gradient(160deg, var(--bg-card) 0%, var(--bg-tertiary) 100%)',
      padding: isMobile ? '20px 14px 18px' : isTablet ? '24px 20px' : '28px 20px',
      borderBottom: '0.5px solid var(--border-default)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,153,204,0.06) 0%, transparent 70%)', top: -60, right: -40, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.04) 0%, transparent 70%)', bottom: -40, left: 20, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: isDesktop ? 'flex' : 'block', alignItems: isDesktop ? 'center' : undefined, gap: isDesktop ? 24 : 0 }}>
        <div style={{ flex: isDesktop ? 1 : undefined }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--bg-tertiary)', border: '0.5px solid var(--border-default)', borderRadius: 99, padding: '4px 10px', marginBottom: 10 }}>
            <i className="ti ti-shield-check" style={{ fontSize: 10, color: '#0099cc' }} />
            <span style={{ fontSize: 9, color: '#0099cc', fontWeight: 600 }}>500+ Verified Companies</span>
          </div>
          <h1 style={{ fontSize: isMobile ? 26 : isTablet ? 30 : 34, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 6 }}>
            Find Trusted{' '}
            <span style={{ color: '#0099cc' }}>Services</span>
          </h1>
          <p style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6, maxWidth: 400 }}>
            Real reviews from real customers in Dubai
          </p>
          <div style={{ maxWidth: isDesktop ? 400 : '100%' }}>
            <SearchBar
              placeholder="AC repair, plumbing, interiors..."
              onSearch={(q) => navigate('search', { query: q })}
            />
          </div>
        </div>

        {/* Desktop stats */}
        {isDesktop && (
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {[['500+', 'Companies'], ['10K+', 'Reviews'], ['4.8★', 'Avg Rating']].map(([num, lbl]) => (
              <div key={lbl} style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 12, padding: '12px 16px', textAlign: 'center', minWidth: 72 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0099cc', lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── STATS ROW (mobile/tablet) ─────────────────────────
  const StatsRow = () => (
    <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 14px', background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-default)' }}>
      {[['500+', 'Companies'], ['4.8★', 'Avg Rating'], ['10K+', 'Reviews']].map(([num, lbl]) => (
        <div key={lbl} style={{ width: 52, height: 52, borderRadius: '50%', border: '1.5px solid var(--border-default)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0099cc', lineHeight: 1 }}>{num}</span>
          <span style={{ fontSize: 7, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2, marginTop: 2 }}>{lbl}</span>
        </div>
      ))}
    </div>
  )

  // ── CATEGORIES ────────────────────────────────────────
  const Categories = () => (
    <div style={{ padding: isMobile ? '10px 14px' : '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Services</span>
        <button onClick={() => navigate('search', {})} style={{ background: 'none', border: 'none', fontSize: 9, color: '#0099cc', cursor: 'pointer', fontWeight: 600 }}>See all</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {CATEGORIES.map(c => (
          <div key={c.cat} onClick={() => navigate('search', { category: c.cat })}
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: isMobile ? '8px 3px' : '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0099cc'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'none' }}
          >
            <span style={{ fontSize: isMobile ? 18 : 20 }}>{c.icon}</span>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── COMPANIES ─────────────────────────────────────────
  const Companies = () => (
    <div style={{ padding: isMobile ? '0 14px 10px' : '0 16px 12px' }}>
      <TrustWave score={88} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Top Rated</span>
        <button onClick={() => navigate('search', {})} style={{ background: 'none', border: 'none', fontSize: 9, color: '#0099cc', cursor: 'pointer', fontWeight: 600 }}>View all</button>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 60, background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 10 }} />
          ))}
          <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
        </div>
      ) : companies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-card)', borderRadius: 12, border: '0.5px solid var(--border-default)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>No companies yet!</p>
          <button onClick={() => navigate('register-company')} style={{ background: '#0099cc', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            List Your Business Free
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr', gap: isDesktop ? 10 : 0 }}>
          {companies.map(c => (
            <CompanyCard key={c.id} company={c} onClick={() => goToCompany(c)} />
          ))}
        </div>
      )}
    </div>
  )

  // ── CITY NETWORK ──────────────────────────────────────
  const CitySection = () => (
    <div style={{ padding: isMobile ? '0 14px 10px' : '0 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        <i className="ti ti-map-2" style={{ fontSize: 12, color: '#0099cc' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>City Network</span>
      </div>
      <CityMap height={isMobile ? 90 : 110} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, padding: '6px 10px' }}>
        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Platform Trust Heatmap</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, height: 14 }}>
          {[4,8,12,6,10,14,8,5,11,7,9,13,6,10,8,12,5,9,11,7].map((h,i) => (
            <div key={i} style={{ width: 2, height: h, background: '#0099cc', borderRadius: 1, opacity: 0.6 }} />
          ))}
        </div>
      </div>
    </div>
  )

  // ── SIDEBAR (Tablet/Desktop) ──────────────────────────
  const Sidebar = () => (
    <div style={{ width: isDesktop ? 180 : 140, background: 'var(--bg-card)', borderRight: '0.5px solid var(--border-default)', padding: '12px 0', flexShrink: 0 }}>
      {[
        { label: 'Browse', items: [
          { icon: 'ti-home', name: 'Home', active: true },
          { icon: 'ti-search', name: 'Search' },
          { icon: 'ti-star', name: 'Top Rated' },
          { icon: 'ti-map-pin', name: 'Near Me' },
        ]},
        { label: 'Services', items: [
          { icon: 'ti-snowflake', name: 'AC Service' },
          { icon: 'ti-tool', name: 'Plumbing' },
          { icon: 'ti-brush', name: 'Painting' },
          { icon: 'ti-bolt', name: 'Electrical' },
          { icon: 'ti-sofa', name: 'Interior' },
        ]},
        { label: 'Premium', items: [
          { icon: 'ti-diamond', name: 'Concierge', special: true },
          { icon: 'ti-map-2', name: 'City Network' },
          { icon: 'ti-users', name: 'Community' },
        ]},
      ].map(section => (
        <div key={section.label}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px 4px' }}>
            {section.label}
          </div>
          {section.items.map(item => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', fontSize: isDesktop ? 11 : 10, color: item.active ? '#0099cc' : item.special ? '#0099cc' : 'var(--text-muted)', background: item.active ? '#f0faff' : 'transparent', borderRight: item.active ? '2px solid #0099cc' : 'none', fontWeight: item.active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 13 }} />
              {item.name}
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  // ── BOTTOM NAV (Mobile) ────────────────────────────────
  const BottomNav = () => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-default)', padding: '8px 0 10px', display: 'flex', justifyContent: 'space-around', zIndex: 100 }}>
      {[
        { icon: 'ti-home', label: 'Home', active: true },
        { icon: 'ti-search', label: 'Search', action: () => navigate('search', {}) },
        { icon: 'ti-building-store', label: 'List Biz', action: () => window.open('https://business.trustdubai.ae', '_blank') },
        { icon: 'ti-star', label: 'Reviews' },
      ].map(item => (
        <button key={item.label} onClick={item.action}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px' }}>
          <i className={`ti ${item.icon}`} style={{ fontSize: 18, color: item.active ? '#0099cc' : 'var(--text-muted)' }} />
          {item.active && <div style={{ width: 4, height: 4, background: '#0099cc', borderRadius: '50%' }} />}
          <span style={{ fontSize: 8, color: item.active ? '#0099cc' : 'var(--text-muted)', fontWeight: item.active ? 600 : 400 }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )

  // ── MAIN RENDER ───────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 70, overflowX: 'hidden' }} className="td-animate">
        <Topbar />
        <Hero />
        <StatsRow />
        <div style={{ padding: '0' }}>
          <Categories />
          <Companies />
          <CitySection />
          <div style={{ padding: '0 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <i className="ti ti-users" style={{ fontSize: 12, color: '#0099cc' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Community Feed</span>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 12, padding: '8px 12px' }}>
              <CommunityFeed reviews={recentReviews} />
            </div>
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <ConciergPanel />
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (isTablet) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }} className="td-animate">
        <Topbar />
        <Hero />
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <Sidebar />
          <div style={{ flex: 1, minWidth: 0 }}>
            <StatsRow />
            <Categories />
            <Companies />
            <CitySection />
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <i className="ti ti-users" style={{ fontSize: 12, color: '#0099cc' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Community Feed</span>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 12, padding: '10px 14px' }}>
                <CommunityFeed reviews={recentReviews} />
              </div>
              <ConciergPanel />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }} className="td-animate">
      <Topbar />
      <Hero />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
            <div>
              <Categories />
              <Companies />
              <CitySection />
            </div>
            <div>
              <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-default)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                  <i className="ti ti-users" style={{ fontSize: 12, color: '#0099cc' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Community Feed</span>
                </div>
                <CommunityFeed reviews={recentReviews} />
              </div>
              <ConciergPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
