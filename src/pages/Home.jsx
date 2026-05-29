import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { signInWithGoogle, signOut, getCustomer, upsertCustomer } from '../customerAuth'
import CompanyCard from '../components/CompanyCard'
import { SearchBar } from '../components/SearchBar'
import { ThemeToggle } from '../components/ThemeToggle'

const CATEGORIES = [
  { name: 'Interior', icon: '🛋️', cat: 'Interior Design' },
  { name: 'AC Service', icon: '❄️', cat: 'AC Service' },
  { name: 'Plumbing', icon: '🔧', cat: 'Plumbing' },
  { name: 'Cleaning', icon: '🧹', cat: 'Cleaning' },
  { name: 'Painting', icon: '🎨', cat: 'Painting' },
  { name: 'Renovation', icon: '🏗️', cat: 'Renovation' },
  { name: 'Electrical', icon: '⚡', cat: 'Electrical' },
  { name: 'Handyman', icon: '🔨', cat: 'Handyman' },
]

export default function Home({ navigate }) {
  const [topCompanies, setTopCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    supabase
      .from('companies')
      .select('*')
      .eq('status', 'approved')
      .order('avg_rating', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTopCompanies(data || [])
        setLoading(false)
      })

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
    await signOut()
    setCustomer(null)
    setShowUserMenu(false)
  }

  function goToCompany(company) {
    if (company.slug) {
      window.location.href = '/' + company.slug
    } else {
      navigate('company', { company })
    }
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Top Nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#03C1F5' }}>
          Trust<span style={{ color: 'var(--text-primary)' }}>Dubai</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />

          <button
            onClick={() => window.open('https://business.trustdubai.ae', '_blank')}
            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: '1px solid #03C1F5', background: 'transparent', color: '#03C1F5', cursor: 'pointer', fontWeight: 500 }}>
            My Biz
          </button>

          {customer ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, border: '1px solid var(--border-default)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#03C1F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {(customer.full_name || customer.email)[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-primary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {customer.full_name || customer.email.split('@')[0]}
                </span>
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, top: 36, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 8, minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 200 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 8px', marginBottom: 4 }}>{customer.email}</div>
                  <button onClick={handleSignOut} style={{ width: '100%', padding: '7px 8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '5px 12px', borderRadius: 20, border: 'none', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: '#03C1F5', padding: '32px 16px 28px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: '#fff', marginBottom: 6 }}>
          TrustDubai
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
          Honest reviews for Dubai home services
        </p>
        <SearchBar
          placeholder="Search company or service..."
          onSearch={(slugOrQuery) => navigate('search', { query: slugOrQuery })}
        />
      </div>

      {/* Categories */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', padding: '16px 16px 10px' }}>
        Browse by category
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '0 16px 20px' }}>
        {CATEGORIES.map(c => (
          <div key={c.cat}
            onClick={() => navigate('search', { category: c.cat })}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', border: '1px solid var(--border-default)', borderRadius: '12px', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#03C1F5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
          >
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Top Rated */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', padding: '0 16px', marginBottom: 10 }}>
        Top rated companies
      </p>
      <div style={{ padding: '0 16px 100px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 24 }}>Loading...</p>
        ) : topCompanies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>No companies yet — be the first to list yours!</p>
            <button onClick={() => navigate('register-company')} style={{ background: '#03C1F5', color: '#ffffff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
              List Your Business Free
            </button>
          </div>
        ) : (
          topCompanies.map(c => (
            <CompanyCard
              key={c.id}
              company={c}
              onClick={() => goToCompany(c)}
            />
          ))
        )}
      </div>
    </div>
  )
}
