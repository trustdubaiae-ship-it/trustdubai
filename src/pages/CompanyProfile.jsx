import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Stars({ rating, size = 13 }) {
  return <span style={{ color: 'var(--amber)', fontSize: size }}>{[1,2,3,4,5].map(i => i <= Math.round(rating||0) ? '★' : '☆').join('')}</span>
}

export default function CompanyProfile({ navigate, params }) {
  const company = params.company
  const [tab, setTab] = useState('overview')
  const [reviews, setReviews] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!company) return
    Promise.all([
      supabase.from('reviews').select('*, review_photos(*)').eq('company_id', company.id).eq('is_approved', true).order('created_at', { ascending: false }),
      supabase.from('portfolio').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('*, employment_history(*)').eq('current_company_id', company.id)
    ]).then(([r, p, e]) => {
      setReviews(r.data || [])
      setPortfolio(p.data || [])
      setEmployees(e.data || [])
      setLoading(false)
    })
  }, [company?.id])

  if (!company) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-primary)' }}>Company not found</div>

  const initials = company.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['#1a73e8','#1e8e3e','#d93025','#f9a825','#9c27b0','#00897b','#ff6d00','#5d4037']
  const color = colors[company.name.charCodeAt(0) % colors.length]
  const TABS = ['overview', 'reviews', 'portfolio', 'team']

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => navigate('search', {})} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{company.name}</span>
        <button onClick={() => navigate('add-review', { company })} style={{
          fontSize: 12, padding: '5px 12px', borderRadius: 16,
          border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer'
        }}>+ Review</button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 57, zIndex: 99
      }}>
        {TABS.map(t => (
          <div key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 4px', textAlign: 'center',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            textTransform: 'capitalize'
          }}>{t}</div>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div>
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                background: color + '22', color, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600
              }}>{initials}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{company.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{company.category}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="ti ti-map-pin" style={{ fontSize: 11 }} />{company.area}, Dubai
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
              padding: '10px 14px', border: '1px solid var(--border-default)', marginBottom: 10
            }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)' }}>{company.avg_rating || '0.0'}</div>
              <div style={{ flex: 1 }}>
                <Stars rating={company.avg_rating} size={16} />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{company.total_reviews || 0} reviews</div>
              </div>
              {company.is_verified && (
                <span style={{ background: 'var(--verified-bg)', color: 'var(--verified-text)', fontSize: 11, padding: '3px 10px', borderRadius: 10 }}>✓ Verified</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {company.whatsapp && (
                <button onClick={() => window.open(`https://wa.me/${company.whatsapp.replace(/[^0-9]/g,'')}`)}
                  style={{ flex: 1, padding: 9, borderRadius: 20, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  WhatsApp
                </button>
              )}
              <button onClick={() => navigate('add-review', { company })}
                style={{ flex: 1, padding: 9, borderRadius: 20, background: 'var(--bg-card)', color: 'var(--primary)', border: '1.5px solid var(--primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Write Review
              </button>
            </div>
          </div>
          {company.description && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{company.description}</p>
            </div>
          )}
          <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--border-default)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            Recent Reviews
          </div>
          {loading ? <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
            : reviews.slice(0,2).map(r => <ReviewItem key={r.id} review={r} />)}
          {reviews.length > 2 && (
            <div style={{ padding: '12px 16px' }}>
              <button onClick={() => setTab('reviews')} style={{
                width: '100%', padding: 10, border: '1px solid var(--primary)',
                borderRadius: 20, background: 'var(--bg-card)', color: 'var(--primary)',
                fontSize: 13, cursor: 'pointer'
              }}>View all {reviews.length} reviews</button>
            </div>
          )}
        </div>
      )}

      {/* REVIEWS TAB */}
      {tab === 'reviews' && (
        <div>
          {loading ? <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
            : reviews.length === 0
              ? <div style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>No reviews yet.</p>
                  <button onClick={() => navigate('add-review', { company })} style={{
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    borderRadius: 20, padding: '8px 20px', fontSize: 13, cursor: 'pointer'
                  }}>Be the first to review</button>
                </div>
              : reviews.map(r => <ReviewItem key={r.id} review={r} />)}
        </div>
      )}

      {/* PORTFOLIO TAB */}
      {tab === 'portfolio' && (
        <div>
          <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--border-default)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
            Projects
          </div>
          {portfolio.length === 0
            ? <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No portfolio yet.</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, padding: 12 }}>
                {portfolio.map(p => (
                  <div key={p.id} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ height: 90, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {p.photo_url ? <img src={p.photo_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏠'}
                    </div>
                    <div style={{ padding: '7px 9px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{p.area} · {p.project_year}</div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {/* TEAM TAB */}
      {tab === 'team' && (
        <div>
          <div style={{ background: 'var(--primary-light)', padding: '10px 16px', borderBottom: '1px solid var(--border-default)' }}>
            <p style={{ fontSize: 12, color: 'var(--primary)' }}>
              ⭐ Employee ratings are portable — they stay with the employee even when they change companies.
            </p>
          </div>
          <div style={{ padding: '0 16px' }}>
            {employees.length === 0
              ? <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No team profiles yet.</p>
              : employees.map(emp => <EmployeeCard key={emp.id} emp={emp} onClick={() => navigate('employee', { employee: emp, company })} />)}
          </div>
          <div style={{ padding: 16 }}>
            <button onClick={() => navigate('register-employee', { company })} style={{
              width: '100%', padding: 10, border: '1px solid var(--border-default)',
              borderRadius: 20, background: 'var(--bg-card)', color: 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer'
            }}>Are you an employee? Create your portable profile →</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewItem({ review }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{review.reviewer_name || 'Anonymous'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })}</span>
      </div>
      <div style={{ color: 'var(--amber)', fontSize: 12, marginBottom: 5 }}>
        {'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{review.rating}.0</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{review.review_text}</div>
      {review.review_photos?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {review.review_photos.map(p => (
            <img key={p.id} src={p.photo_url} alt="review" style={{ width: 64, height: 64, borderRadius: 6, objectFit: 'cover' }} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmployeeCard({ emp, onClick }) {
  const colors = ['#1a73e8','#1e8e3e','#9c27b0','#00897b','#d93025']
  const color = colors[emp.name.charCodeAt(0) % colors.length]
  const initials = emp.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  return (
    <div onClick={onClick} style={{
      border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
      padding: 12, marginTop: 10, cursor: 'pointer', background: 'var(--bg-card)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: color + '22', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 600
        }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{emp.designation}</div>
        </div>
        <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--text-muted)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <span style={{ color: 'var(--amber)', fontSize: 12 }}>
          {'★'.repeat(Math.round(emp.avg_rating||0))}{'☆'.repeat(5-Math.round(emp.avg_rating||0))}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{emp.avg_rating || '0.0'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({emp.total_reviews || 0} reviews)</span>
      </div>
      {emp.is_verified && (
        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 10, padding: '2px 8px', borderRadius: 10, display: 'inline-block', marginTop: 6 }}>
          ⭐ Portable Profile
        </span>
      )}
    </div>
  )
}
