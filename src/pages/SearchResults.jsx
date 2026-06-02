import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CompanyCard from '../components/CompanyCard'

export default function SearchResults({ navigate, params }) {
  const [query, setQuery] = useState(params.query || '')
  const [category, setCategory] = useState(params.category || '')
  const [companies, setCompanies] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCategories() }, [])
  useEffect(() => { fetchCompanies() }, [query, category])

  async function fetchCategories() {
    try {
      const { data } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setCategories(data || [])
    } catch (e) { console.error(e) }
  }

  async function fetchCompanies() {
    setLoading(true)
    let q = supabase.from('companies').select('*').eq('status', 'approved')

    // category filter — match either text `category` OR array `categories`
    if (category) {
      q = q.or(`category.eq.${category},categories.cs.{"${category}"}`)
    }

    // text search — name / category / area
    if (query) {
      q = q.or(`name.ilike.%${query}%,category.ilike.%${query}%,area.ilike.%${query}%`)
    }

    const { data } = await q.order('created_at', { ascending: false })
    setCompanies(data || [])
    setLoading(false)
  }

  function goToCompany(company) {
    if (company.slug) {
      window.location.href = '/' + company.slug
    } else {
      navigate('company', { company })
    }
  }

  // chips: All + DB categories
  const chips = ['All', ...categories.map(c => c.name)]

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search companies..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              border: '1px solid var(--border-default)', borderRadius: 20,
              fontSize: 13, outline: 'none',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {/* Category filters — from DB */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border-default)' }}>
        {chips.map(c => {
          const active = (c === 'All' && !category) || c === category
          return (
            <button key={c}
              onClick={() => setCategory(c === 'All' ? '' : c)}
              style={{
                whiteSpace: 'nowrap', fontSize: 12, padding: '5px 12px',
                borderRadius: 16, border: '1px solid var(--border-default)', cursor: 'pointer',
                background: active ? '#03C1F5' : 'var(--bg-secondary)',
                color: active ? '#fff' : 'var(--text-secondary)'
              }}>{c}</button>
          )
        })}
      </div>

      <div style={{ padding: '8px 16px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{companies.length} companies found</span>
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 24 }}>Searching...</p>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>No companies found.</p>
            <span onClick={() => navigate('register-company')} style={{ color: '#03C1F5', fontSize: 13, cursor: 'pointer' }}>
              Be the first to list yours!
            </span>
          </div>
        ) : (
          companies.map(c => (
            <CompanyCard key={c.id} company={c} onClick={() => goToCompany(c)} />
          ))
        )}
      </div>
    </div>
  )
}
