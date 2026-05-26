import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CompanyCard from '../components/CompanyCard'

const CATS = ['All','Interior Design','AC Service','Plumbing','Cleaning','Painting','Renovation','Electrical','Handyman']

export default function SearchResults({ navigate, params }) {
  const [query, setQuery] = useState(params.query || '')
  const [category, setCategory] = useState(params.category || '')
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCompanies() }, [query, category])

  async function fetchCompanies() {
    setLoading(true)
    let q = supabase.from('companies').select('*').eq('status', 'approved')
    if (category) q = q.eq('category', category)
    if (query) q = q.or(`name.ilike.%${query}%,category.ilike.%${query}%,area.ilike.%${query}%`)
    const { data } = await q.order('avg_rating', { ascending: false })
    setCompanies(data || [])
    setLoading(false)
  }

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: '1px solid var(--border)', background: '#fff',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text2)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search companies..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, outline: 'none' }}
          />
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
        {CATS.map(c => (
          <button key={c}
            onClick={() => setCategory(c === 'All' ? '' : c)}
            style={{
              whiteSpace: 'nowrap', fontSize: 12, padding: '5px 12px',
              borderRadius: 16, border: '1px solid var(--border)', cursor: 'pointer',
              background: (c === 'All' && !category) || c === category ? 'var(--primary)' : '#fff',
              color: (c === 'All' && !category) || c === category ? '#fff' : 'var(--text2)'
            }}>{c}</button>
        ))}
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{companies.length} companies found</span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: 24 }}>Searching...</p>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12 }}>No companies found.</p>
            <span onClick={() => navigate('register-company')} style={{ color: 'var(--primary)', fontSize: 13, cursor: 'pointer' }}>
              Be the first to list yours!
            </span>
          </div>
        ) : (
          companies.map(c => (
            <CompanyCard key={c.id} company={c} onClick={() => navigate('company', { company: c })} />
          ))
        )}
      </div>
    </div>
  )
}
