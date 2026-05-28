import { useState } from 'react'
import { supabase } from '../supabase'

export default function AddReview({ navigate, params }) {
  const company = params.company
  const [rating, setRating] = useState(0)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [service, setService] = useState('')
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const labels = ['','Poor','Below average','Average','Good','Excellent']

  async function handleSubmit() {
    if (!rating) return setError('Please select a rating')
    if (!text.trim()) return setError('Please write your review')
    setLoading(true)
    setError('')

    let companyId = company?.id
    if (!companyId && companyName) {
      const { data } = await supabase.from('companies').select('id').ilike('name', companyName).single()
      companyId = data?.id
    }

    if (!companyId) {
      setLoading(false)
      return setError('Company not found. Please register it first.')
    }

    const { data: reviewData, error: reviewError } = await supabase.from('reviews').insert({
      company_id: companyId,
      reviewer_name: name || 'Anonymous',
      rating,
      review_text: text,
      service_type: service,
    }).select().single()

    if (reviewError) { setLoading(false); return setError('Failed to submit. Please try again.') }

    for (const photo of photos) {
      const fileName = `${reviewData.id}_${Date.now()}_${photo.name}`
      const { data: uploadData } = await supabase.storage.from('review-photos').upload(fileName, photo)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('review-photos').getPublicUrl(fileName)
        await supabase.from('review_photos').insert({ review_id: reviewData.id, photo_url: urlData.publicUrl })
      }
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <i className="ti ti-arrow-left" />
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, color: 'var(--green)', marginBottom: 16 }}>
            <i className="ti ti-circle-check" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Review submitted!</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Thank you for your honest review. It helps others make better decisions.</p>
          <button onClick={() => navigate('home')} style={{
            background: 'var(--primary)', color: '#fff', border: 'none',
            borderRadius: 24, padding: '12px 32px', fontSize: 14, cursor: 'pointer'
          }}>Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => company ? navigate('company', { company }) : navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Write a Review</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>
        {company && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '10px 12px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Reviewing</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{company.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{company.category} · {company.area}</p>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your rating *</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} onClick={() => setRating(i)} style={{
                fontSize: 30, cursor: 'pointer',
                color: i <= rating ? 'var(--amber)' : 'var(--border-default)',
                transition: 'color 0.15s'
              }}>★</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rating ? labels[rating] : 'Tap to rate'}</p>
        </div>

        {!company && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Company name *</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="Which company are you reviewing?"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Your review *</label>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Quality of work, timeline, communication, value for money..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', minHeight: 80, resize: 'vertical', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Add photos <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <label style={{
            display: 'block', border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
            padding: 16, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)'
          }}>
            <i className="ti ti-camera" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>Tap to add photos</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Before/after, finished work, etc.</p>
            <input type="file" multiple accept="image/*" style={{ display: 'none' }}
              onChange={e => setPhotos([...photos, ...e.target.files])} />
          </label>
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {photos.map((f, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover' }} />
                  <span onClick={() => setPhotos(photos.filter((_,j) => j !== i))} style={{
                    position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                    borderRadius: '50%', background: 'var(--red)', color: '#fff',
                    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Service type</label>
          <select value={service} onChange={e => setService(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <option value="">Select service</option>
            {['Interior Design','Renovation','AC Service','Plumbing','Cleaning','Painting','Electrical','Handyman'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: 12, background: loading ? 'var(--text-muted)' : 'var(--primary)',
          color: '#fff', border: 'none', borderRadius: 24,
          fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer'
        }}>{loading ? 'Submitting...' : 'Submit Review'}</button>
      </div>
    </div>
  )
}
