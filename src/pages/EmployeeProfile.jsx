import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function EmployeeProfile({ navigate, params }) {
  const emp = params.employee
  const company = params.company
  const [reviews, setReviews] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!emp) return
    Promise.all([
      supabase.from('employee_reviews').select('*').eq('employee_id', emp.id).eq('is_approved', true).order('created_at', { ascending: false }),
      supabase.from('employment_history').select('*').eq('employee_id', emp.id).order('start_date', { ascending: false })
    ]).then(([r, h]) => {
      setReviews(r.data || [])
      setHistory(h.data || [])
      setLoading(false)
    })
  }, [emp?.id])

  if (!emp) return <div style={{ padding: 20, textAlign: 'center' }}>Employee not found</div>

  const colors = ['#1a73e8','#1e8e3e','#9c27b0','#00897b','#d93025']
  const color = colors[emp.name.charCodeAt(0) % colors.length]
  const initials = emp.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: '#fff', position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => navigate('company', { company })} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text2)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Employee Profile</span>
        <button onClick={() => navigate('add-emp-review', { employee: emp, company })} style={{
          fontSize: 12, padding: '5px 12px', borderRadius: 16,
          border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer'
        }}>+ Review</button>
      </div>

      {/* Hero */}
      <div style={{ background: 'var(--bg)', padding: 16, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px',
          background: color + '22', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 600
        }}>{initials}</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{emp.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3 }}>{emp.designation}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6 }}>
          <i className="ti ti-building" style={{ fontSize: 12, color: 'var(--text3)' }} />
          <span style={{ fontSize: 12, color: 'var(--primary)' }}>{company?.name || 'Independent'}</span>
        </div>
        {emp.is_verified && (
          <div style={{ marginTop: 8 }}>
            <span style={{ background: 'var(--green-light)', color: 'var(--green)', fontSize: 11, padding: '3px 10px', borderRadius: 10 }}>✓ Verified Identity</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        {[
          { val: emp.avg_rating || '0.0', label: 'Rating' },
          { val: emp.total_reviews || 0, label: 'Reviews' },
          { val: emp.years_experience || '—', label: 'Experience' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: 8, background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Employment History */}
      {history.length > 0 && (
        <>
          <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 500 }}>
            Employment History
          </div>
          {history.map((h, i) => (
            <div key={h.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: h.is_current ? 'var(--primary)' : 'var(--border)', marginTop: 3 }} />
                {i < history.length - 1 && <div style={{ width: 2, height: 30, background: 'var(--border)' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{h.company_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{h.designation}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {h.start_date ? new Date(h.start_date).getFullYear() : ''}
                  {' — '}
                  {h.is_current ? 'Present' : h.end_date ? new Date(h.end_date).getFullYear() : ''}
                </div>
              </div>
              {h.is_current && (
                <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 10, padding: '2px 7px', borderRadius: 10 }}>Current</span>
              )}
            </div>
          ))}
        </>
      )}

      {/* Client Reviews */}
      <div style={{ padding: '14px 16px 8px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 500 }}>
        Client Reviews
      </div>
      {loading ? (
        <p style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading...</p>
      ) : reviews.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12 }}>No reviews yet.</p>
          <button onClick={() => navigate('add-emp-review', { employee: emp, company })} style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 20, padding: '8px 20px', fontSize: 13, cursor: 'pointer'
          }}>Be the first to review</button>
        </div>
      ) : (
        reviews.map(r => (
          <div key={r.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.reviewer_name || 'Anonymous'}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(r.created_at).toLocaleDateString('en-AE', { month: 'short', year: 'numeric' })}</span>
            </div>
            <div style={{ color: 'var(--amber)', fontSize: 12, marginBottom: 5 }}>
              {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{r.review_text}</div>
          </div>
        ))
      )}
    </div>
  )
}
