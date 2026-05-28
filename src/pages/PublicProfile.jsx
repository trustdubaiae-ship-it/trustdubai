import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function PublicProfile() {
  const { slug } = useParams()
  const [company, setCompany] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [slug])

  async function fetchCompany() {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'approved')
      .single()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setCompany(data)

    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('company_id', data.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(10)

    setReviews(reviewData || [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>Loading...</div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#111827' }}>Company not found</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>The profile you are looking for does not exist.</p>
        <a href="/" style={{ display: 'inline-block', padding: '10px 24px', background: '#03C1F5', color: '#fff', borderRadius: 20, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
          Go to TrustDubai
        </a>
      </div>
    </div>
  )

  const initials = company.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = ['#1a73e8', '#1e8e3e', '#d93025', '#f9a825', '#9c27b0', '#00897b']
  const color = colors[company.name?.charCodeAt(0) % colors.length]

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{ background: '#03C1F5', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#fff"/>
            <path d="M16 4L26 8L26 17C26 22.5 21.5 27 16 28C10.5 27 6 22.5 6 17L6 8Z" fill="#03C1F5" opacity="0.3"/>
            <polyline points="11.5,16 14.5,19.5 20.5,13" fill="none" stroke="#03C1F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>TrustDubai</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#fff', textDecoration: 'none', opacity: 0.8 }}>
          Browse all companies
        </a>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '32px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, flexShrink: 0,
              background: color + '22', color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700
            }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{company.name}</h1>
                {company.is_verified && (
                  <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, border: '1px solid #a7f3d0' }}>
                    Verified
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {company.category && (
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>{company.category}</span>
                )}
                {company.location && (
                  <span style={{ background: '#f3f4f6', color: '#374151', fontSize: 12, padding: '3px 10px', borderRadius: 99 }}>📍 {company.location}</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{company.avg_rating || '0.0'}</div>
              <div style={{ color: '#f9a825', fontSize: 16, marginTop: 2 }}>
                {'★'.repeat(Math.round(company.avg_rating || 0))}
                {'☆'.repeat(5 - Math.round(company.avg_rating || 0))}
              </div>
            </div>
            <div style={{ width: 1, height: 40, background: '#e5e7eb' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{company.total_reviews || 0} Reviews</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>From verified customers</div>
            </div>
            {company.whatsapp && (
              <>
                <div style={{ width: 1, height: 40, background: '#e5e7eb', marginLeft: 'auto' }} />
                <button
                  onClick={() => window.open('https://wa.me/' + company.whatsapp.replace(/[^0-9]/g, ''), '_blank')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#25D366', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                >
                  💬 WhatsApp
                </button>
              </>
            )}
          </div>

          {company.description && (
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{company.description}</p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Customer Reviews</h2>
        </div>

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
            <p style={{ fontSize: 14, color: '#6b7280' }}>No reviews yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                      {(r.reviewer_name || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{r.reviewer_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(r.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric', day: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ color: '#f9a825', fontSize: 14 }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{r.rating}.0</span>
                  </div>
                </div>
                {r.review_text && (
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{r.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: '32px 24px', color: '#9ca3af', fontSize: 12 }}>
        <a href="/" style={{ color: '#03C1F5', textDecoration: 'none', fontWeight: 500 }}>TrustDubai</a>
        {' — Building trust in Dubai\'s business community'}
      </div>
    </div>
  )
}
