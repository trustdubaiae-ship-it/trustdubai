// v2 - company_applications
import { useState } from 'react'
import { supabase } from '../supabase'

export default function RegisterCompany({ navigate }) {
  const [form, setForm] = useState({ name: '', category: '', area: '', phone: '', email: '', description: '', whatsapp: '' })
  const [tlFile, setTlFile] = useState(null)
  const [tlNumber, setTlNumber] = useState('')
  const [tlExpiry, setTlExpiry] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function uploadTradeLicense(applicationId) {
    if (!tlFile) return null
    const ext = tlFile.name.split('.').pop()
    const path = `${applicationId}/trade-license.${ext}`
    const { error } = await supabase.storage
      .from('trade-licenses')
      .upload(path, tlFile, { upsert: true })
    if (error) return null
    return path
  }

  async function handleSubmit() {
    if (!form.name || !form.category || !form.area || !form.phone) return setError('Please fill required fields')
    setLoading(true)
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data: app, error: e } = await supabase.from('company_applications').insert({
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
    }).select('id').single()

    if (e || !app) { setLoading(false); return setError('Failed to submit. Please try again.') }

    // Upload TL PDF
    const tlPdfUrl = await uploadTradeLicense(app.id)

    // Update with TL fields
    await supabase.from('company_applications').update({
      tl_pdf_url: tlPdfUrl,
      tl_number: tlNumber || null,
      tl_expiry_date: tlExpiry || null,
    }).eq('id', app.id)

    setLoading(false)
    setSuccess(true)
  }

  if (success) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ fontSize: 52, color: 'var(--green)', marginBottom: 16 }}>
        <i className="ti ti-circle-check" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Listing submitted!</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
        We'll contact you on {form.phone} within 24 hours.
      </p>
      <button onClick={() => navigate('home')} style={{
        background: 'var(--primary)', color: '#fff', border: 'none',
        borderRadius: 24, padding: '12px 32px', fontSize: 14, cursor: 'pointer'
      }}>Back to Home</button>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>List Your Business</span>
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
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{b.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* Basic Fields */}
        {[
          { key: 'name', label: 'Company name *', placeholder: 'Your company name' },
          { key: 'area', label: 'Area / Location *', placeholder: 'e.g. Business Bay, JVC, Marina' },
          { key: 'phone', label: 'WhatsApp number *', placeholder: '+971 50 XXX XXXX' },
          { key: 'email', label: 'Email address', placeholder: 'your@email.com' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>About your company</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description of your services..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', minHeight: 70, resize: 'vertical', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Service category *</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="">Select category</option>
            {['Interior Design','Renovation','AC Service','Plumbing','Cleaning','Painting','Electrical','Handyman'].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Trade License Section */}
        <div style={{ marginTop: 20, marginBottom: 8, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Trade License</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Optional but helps faster approval</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Trade License PDF</label>
          <label style={{ display: 'block', border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 14, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}>
            <i className="ti ti-file-text" style={{ fontSize: 22, color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
              {tlFile ? `✓ ${tlFile.name}` : 'Tap to upload PDF'}
            </p>
            <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => setTlFile(e.target.files[0])} />
          </label>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Trade License Number</label>
          <input
            value={tlNumber}
            onChange={e => setTlNumber(e.target.value)}
            placeholder="e.g. 1234567"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Trade License Expiry Date</label>
          <input
            type="date"
            value={tlExpiry}
            onChange={e => setTlExpiry(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: 12,
            background: loading ? 'var(--text-muted)' : 'var(--primary)',
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
