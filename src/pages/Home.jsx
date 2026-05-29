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

// Responsive hook
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

export default function Home({ navigate }) {
  const [topCompanies, setTopCompanies]   = useState([])
  const [loading, setLoading]             = useState(true)
  const [customer, setCustomer]           = useState(null)
  const [showUserMenu, setShowUserMenu]   = useState(false)
  const device = useDevice()

  const isMobile  = device === 'mobile'
  const isTablet  = device === 'tablet'
  const isDesktop = device === 'desktop'

  useEffect(() => {
    supabase.from('companies').select('*').eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(isDesktop ? 12 : 10)
      .then(({ data }) => { setTopCompanies(data || []); setLoading(false) })
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

  async function checkCustomer() {
    const cust = await getCustomer()
    setCustomer(cust)
  }

  async function handleSignOut() {
    await signOut(); setCustomer(null); setShowUserMenu(false)
  }

  function goToCompany(company) {
    if (company.slug) window.location.href = '/' + company.slug
    else navigate('company', { company })
  }

  // ── TOPBAR ────────────────────────────────────────────
  const Topbar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '12px 16px' : isTablet ? '14px 24px' : '14px 48px',
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-primary)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 40 : 16 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 18 : 22, color: '#03C1F5', letterSpacing: '-0.5px' }}>
          Trust<span style={{ color: 'var(--text-primary)' }}>Dubai</span>
        </div>
        {/* Desktop nav links */}
        {isDesktop && (
          <nav style={{ display: 'flex', gap: 28 }}>
            {['Home', 'Categories', 'Top Rated', 'Add Business'].map(l => (
              <button key={l} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '4px 0', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#03C1F5'}
                onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
                onClick={() => l === 'Add Business' && window.open('https://business.trustdubai.ae', '_blank')}
              >{l}</button>
            ))}
          </nav>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
        <ThemeToggle />
        {/* Desktop Search */}
        {isDesktop && (
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Search companies..."
              onKeyDown={e => e.key === 'Enter' && navigate('search', { query: e.target.value })}
              style={{ padding: '8px 16px 8px 36px', border: '1px solid var(--border-default)', borderRadius: 20, fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', width: 220 }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          </div>
        )}
        <button
          onClick={() => window.open('https://business.trustdubai.ae', '_blank')}
          style={{ fontSize: isMobile ? 11 : 13, padding: isMobile ? '5px 10px' : '7px 14px', borderRadius: 20, border: '1.5px solid #03C1F5', background: 'transparent', color: '#03C1F5', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {isMobile ? 'My Biz' : '🏢 My Business'}
        </button>
        {customer ? (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, border: '1px solid var(--border-default)', background: 'var(--bg-card)', cursor: 'pointer' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#03C1F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                {(customer.full_name || customer.email)[0].toUpperCase()}
              </div>
              {!isMobile && <span style={{ fontSize: 12, color: 'var(--text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {customer.full_name || customer.email.split('@')[0]}
              </span>}
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 38, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 8, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 200 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', marginBottom: 4, borderBottom: '1px solid var(--border-default)' }}>{customer.email}</div>
                <button onClick={handleSignOut} style={{ width: '100%', padding: '8px 10px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', textAlign: 'left', marginTop: 4 }}>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => signInWithGoogle()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: isMobile ? 11 : 13, padding: isMobile ? '5px 10px' : '7px 14px', borderRadius: 20, border: 'none', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isMobile ? 'Sign in' : 'Sign in with Google'}
          </button>
        )}
      </div>
    </div>
  )

  // ── HERO ──────────────────────────────────────────────
  const Hero = () => (
    <div style={{
      background: 'linear-gradient(135deg, #03C1F5 0%, #0180b8 60%, #015d8a 100%)',
      padding: isMobile ? '36px 16px 32px' : isTablet ? '48px 24px 40px' : '72px 48px 60px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: isDesktop ? 680 : '100%', margin: '0 auto' }}>
        {!isMobile && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
            ✦ Dubai's Most Trusted Review Platform
          </div>
        )}
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 32 : isTablet ? 44 : 56, color: '#fff', marginBottom: 8, lineHeight: 1.1, letterSpacing: '-1px' }}>
          TrustDubai
        </div>
        <p style={{ fontSize: isMobile ? 13 : 16, color: 'rgba(255,255,255,0.8)', marginBottom: isMobile ? 20 : 28, lineHeight: 1.6, maxWidth: 480, margin: `0 auto ${isMobile ? 20 : 28}px` }}>
          {isMobile ? 'Honest reviews for Dubai home services' : 'Find verified, trusted home service companies in Dubai. Real reviews from real customers.'}
        </p>
        <div style={{ maxWidth: isDesktop ? 560 : '100%', margin: '0 auto' }}>
          <SearchBar
            placeholder={isMobile ? "Search company or service..." : "Search for AC repair, plumbing, renovation..."}
            onSearch={(q) => navigate('search', { query: q })}
          />
        </div>
        {isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
            {[['500+', 'Companies'], ['10K+', 'Reviews'], ['4.8★', 'Avg Rating']].map(([num, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{num}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── CATEGORIES ────────────────────────────────────────
  const Categories = () => (
    <div style={{ padding: isMobile ? '16px 16px 8px' : isTablet ? '24px 24px 12px' : '32px 48px 16px' }}>
      {!isMobile && <h2 style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Browse by category</h2>}
      {isMobile && <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10 }}>Browse by category</p>}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(4,1fr)' : isTablet ? 'repeat(8,1fr)' : 'repeat(8,1fr)',
        gap: isMobile ? 8 : 12,
      }}>
        {CATEGORIES.map(c => (
          <div key={c.cat} onClick={() => navigate('search', { category: c.cat })}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 5 : 8,
              padding: isMobile ? '10px 4px' : '14px 8px',
              border: '1px solid var(--border-default)', borderRadius: isMobile ? 12 : 16,
              cursor: 'pointer', background: 'var(--bg-card)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#03C1F5'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(3,193,245,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <span style={{ fontSize: isMobile ? 20 : 24 }}>{c.icon}</span>
            <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 500 }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── COMPANIES LIST ────────────────────────────────────
  const CompaniesList = () => (
    <div style={{ padding: isMobile ? '8px 16px 100px' : isTablet ? '16px 24px 40px' : '16px 48px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? 10 : 16 }}>
        {isMobile
          ? <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Top rated companies</p>
          : <h2 style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 700, color: 'var(--text-primary)' }}>Top Rated Companies</h2>
        }
        {!isMobile && (
          <button onClick={() => navigate('search', {})} style={{ fontSize: 13, color: '#03C1F5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            View all →
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} className="td-skeleton" style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>
      ) : topCompanies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏙️</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>No companies yet — be the first!</p>
          <button onClick={() => navigate('register-company')} className="td-btn-primary">
            List Your Business Free
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 0 : 16,
        }}>
          {topCompanies.map(c => (
            <CompanyCard key={c.id} company={c} onClick={() => goToCompany(c)} />
          ))}
        </div>
      )}
    </div>
  )

  // ── DESKTOP SIDEBAR ───────────────────────────────────
  const Sidebar = () => (
    <div style={{ width: 280, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-default)', padding: '24px 16px', position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quick Stats</div>
        {[
          { label: 'Companies', value: '500+', icon: '🏢' },
          { label: 'Reviews', value: '10K+', icon: '⭐' },
          { label: 'Verified', value: '350+', icon: '✓' },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Categories</div>
        {CATEGORIES.map(c => (
          <button key={c.cat} onClick={() => navigate('search', { category: c.cat })}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 2, transition: 'background 0.15s', color: 'var(--text-secondary)', fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span>{c.icon}</span> {c.name}
          </button>
        ))}
      </div>
    </div>
  )

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }} className="td-animate-in">
      <Topbar />
      {isDesktop ? (
        <>
          <Hero />
          <div style={{ display: 'flex' }}>
            <Sidebar />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Categories />
              <CompaniesList />
            </div>
          </div>
        </>
      ) : (
        <>
          <Hero />
          <Categories />
          <CompaniesList />
        </>
      )}
    </div>
  )
}
