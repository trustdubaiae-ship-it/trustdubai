import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
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
  }, [])

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>

      {/* Top Nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--accent)' }}>
          Trust<span style={{ color: 'var(--text-primary)' }}>Dubai</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />
          <button onClick={() => navigate('register-company')} style={{
            fontSize: 12, padding: '6px 14px', borderRadius: 20,
            border: 'none', background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer'
          }}>List Free</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: '#0a1628', padding: '32px 16px 28px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: '#fff', marginBottom: 6 }}>
          TrustDubai
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
          Honest reviews for Dubai home services
        </p>

        {/* Auto-suggest SearchBar */}
        <SearchBar
          placeholder="Search company or service..."
          onSearch={(slugOrQuery) => navigate('search', { query: slugOrQuery })}
        />
      </div>

      {/* Categories */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', padding: '16px 16px 10px' }}>
        Browse by category
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8, padding: '0 16px 20px'
      }}>
        {CATEGORIES.map(c => (
          <div key={c.cat}
            onClick={() => navigate('search', { category: c.cat })}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 5, padding: '10px 4px',
              border: '1px solid var(--border-default)',
              borderRadius: '12px', cursor: 'pointer',
              background: 'var(--bg-card)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a1628' }}
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
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
              No companies yet — be the first to list yours!
            </p>
            <button onClick={() => navigate('register-company')} style={{
              background: 'var(--accent)', color: 'var(--accent-text)', border: 'none',
              borderRadius: 20, padding: '8px 20px', fontSize: 13, cursor: 'pointer'
            }}>List Your Business Free</button>
          </div>
        ) : (
          topCompanies.map(c => (
            <CompanyCard key={c.id} company={c} onClick={() => navigate('company', { company: c })} />
          ))
        )}
      </div>
    </div>
  )
}
