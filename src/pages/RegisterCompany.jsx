import { useState } from 'react'
import { supabase } from '../supabase'

export default function RegisterCompany({ navigate }) {
  const [form, setForm] = useState({ name: '', category: '', area: '', phone: '', email: '', description: '', whatsapp: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name || !form.category || !form.area || !form.phone) return setError('Please fill required fields')
    setLoading(true)
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error: e } = await supabase.from('company_applications').insert({
      company_name: form.name,
      category: form.category,
      location: form.area,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      email: form.email,
      description: form.description,
      owner_name: '',
      slug,
      status: 'pending',
      applied_at: new Date().toISOString()
    })
    setLoading(false)
    if (e) return setError('Failed to submit. Please try again.')
    setSuccess(true)
  }

  if (success) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 52, color: 'var(--green)', marginBottom: 16 }}>
        <i className="ti ti-circle-check" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Listing submitted!</div>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
        We'll contact you on {form.phone} within 24 hours.
      </p>
      <button onClick={() => navigate('home')} style={{
        background: 'var(--primary)', color: '#fff', border: 'none',
        borderRadius: 24, padding: '12px 32px', fontSize: 14, cursor: 'pointer'
      }}>Back to Home</button>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text2)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500 }}>List Your Business</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ background: 'var(--primary)', padding: '20px 16px', color: '#fff', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, marginBottom: 6 }}>Get Found on TrustDubai</div>
        <p style={{ fontSize: 12, opacity: 0.85 }}>100% free — no credit card required</p>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {[
          { icon: 'ti-star', title: 'Collect verified reviews', desc: 'Share your unique link with clients' },
          { icon: 'ti-photo', title: 'Showcase your portfolio', desc: 'Upload project photos to win more clients' },
          { icon: 'ti-users', title: 'Team profiles', desc: 'Your staff gets individual ratings too' },
        ].map(b => (
          <div key={b.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <i className={`ti ${b.icon}`} style={{ fontSize: 18, color: 'var(--primary)', marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {[
          { key: 'name', label: 'Company name *', placeholder: 'Your company name' },
          { key: 'area', label: 'Area / Location *', placeholder: 'e.g. Business Bay, JVC, Marina' },
          { key: 'phone', label: 'WhatsApp number *', placeholder: '+971 50 XXX XXXX' },
          { key: 'email', label: 'Email address', placeholder: 'your@email.com' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>About your company</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description of your services..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', minHeight: 70, resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Service category *</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: '#fff' }}
          >
            <option value="">Select category</option>
            {['Interior Design','Renovation','AC Service','Plumbing','Cleaning','Painting','Electrical','Handyman'].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: 12,
            background: loading ? 'var(--text3)' : 'var(--primary)',
            color: '#fff', border: 'none', borderRadius: 24,
            fontSize: 14, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Submitting...' : 'Submit for Free Listing'}
        </button>
      </div>
    </div>
  )
}
