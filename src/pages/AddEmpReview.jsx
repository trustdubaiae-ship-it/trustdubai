import { useState } from 'react'
import { supabase } from '../supabase'

export default function AddEmpReview({ navigate, params }) {
  const { employee, company } = params
  const [rating, setRating] = useState(0)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const labels = ['','Poor','Below average','Average','Good','Excellent']

  async function handleSubmit() {
    if (!rating) return setError('Please select a rating')
    if (!text.trim()) return setError('Please write your review')
    setLoading(true)
    const { error: e } = await supabase.from('employee_reviews').insert({
      employee_id: employee.id,
      company_id: company?.id,
      reviewer_name: name || 'Anonymous',
      rating, review_text: text
    })
    setLoading(false)
    if (e) return setError('Failed to submit. Please try again.')
    setSuccess(true)
  }

  if (success) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ fontSize: 52, color: 'var(--green)', marginBottom: 16 }}><i className="ti ti-circle-check" /></div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Review submitted!</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>This employee's rating has been updated.</p>
      <button onClick={() => navigate('employee', { employee, company })} style={{
        background: 'var(--primary)', color: '#fff', border: 'none',
        borderRadius: 24, padding: '12px 32px', fontSize: 14, cursor: 'pointer'
      }}>Back to Profile</button>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => navigate('employee', { employee, company })} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Review Employee</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '10px 12px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Reviewing employee</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{employee?.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{employee?.designation}</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your rating *</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} onClick={() => setRating(i)} style={{ fontSize: 30, cursor: 'pointer', color: i <= rating ? 'var(--amber)' : 'var(--border-default)' }}>★</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rating ? labels[rating] : 'Tap to rate'}</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your review *</label>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Skills, professionalism, work quality, punctuality..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', minHeight: 80, resize: 'vertical', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: 12, background: loading ? 'var(--text-muted)' : 'var(--primary)',
          color: '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}>{loading ? 'Submitting...' : 'Submit Review'}</button>
      </div>
    </div>
  )
}
