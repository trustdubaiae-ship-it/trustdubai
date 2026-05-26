import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CompanyCard from '../components/CompanyCard'

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
  const [query, setQuery] = useState('')
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
    <div>
      {/* Top Nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: '#fff', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--primary)' }}>
          Trust<span style={{ color: 'var(--text)' }}>Dubai</span>
        </div>
        <button onClick={() => navigate('register-company')} style={{
          fontSize: 12, padding: '6px 14px', borderRadius: 20,
          border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer'
        }}>List Free</button>
      </div>

      {/* Hero */}
      <div style={{ padding: '28px 16px 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: 'var(--primary)', marginBottom: 4 }}>
          Trust<span style={{ color: 'var(--text)' }}>Dubai</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
          Honest reviews for Dubai home services
        </p>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)', fontSize: 16
          }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigate('search', { query })}
            placeholder="Search company or service..."
            style={{
              width: '100%', padding: '12px 80px 12px 42px',
              border: '1.5px solid var(--border)', borderRadius: 24,
              fontSize: 14, outline: 'none'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => navigate('search', { query })}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'var(--primary)', color: '#fff', border: 'none',
              borderRadius: 16, padding: '5px 14px', fontSize: 12, cursor: 'pointer'
            }}>Search</button>
        </div>
      </div>

      {/* Categories */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', padding: '0 16px', marginBottom: 10 }}>
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
              gap: 5, padding: '10px 4px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = '#fff' }}
          >
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'center' }}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Top Rated */}
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', padding: '0 16px', marginBottom: 10 }}>
        Top rated companies
      </p>
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 24 }}>Loading...</p>
        ) : topCompanies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12 }}>
              No companies yet — be the first to list yours!
            </p>
            <button onClick={() => navigate('register-company')} style={{
              background: 'var(--primary)', color: '#fff', border: 'none',
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
