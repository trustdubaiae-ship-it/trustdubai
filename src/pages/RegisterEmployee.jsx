import { useState } from 'react'
import { supabase } from '../supabase'

export default function RegisterEmployee({ navigate, params }) {
  const company = params.company
  const [form, setForm] = useState({ name: '', designation: '', current_company: company?.name || '', years_experience: '', phone: '' })
  const [emiratesId, setEmiratesId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name || !form.designation) return setError('Please fill required fields')
    setLoading(true)

    let emiratesIdUrl = null
    if (emiratesId) {
      const fileName = `eid_${Date.now()}_${emiratesId.name}`
      const { data } = await supabase.storage.from('employee-docs').upload(fileName, emiratesId)
      if (data) {
        const { data: urlData } = supabase.storage.from('employee-docs').getPublicUrl(fileName)
        emiratesIdUrl = urlData.publicUrl
      }
    }

    const { data: emp, error: e } = await supabase.from('employees').insert({
      name: form.name,
      designation: form.designation,
      current_company_id: company?.id || null,
      phone: form.phone,
      years_experience: form.years_experience,
      emirates_id_url: emiratesIdUrl,
      is_verified: false
    }).select().single()

    if (!e && emp && company) {
      await supabase.from('employment_history').insert({
        employee_id: emp.id,
        company_id: company.id,
        company_name: company.name,
        designation: form.designation,
        start_date: new Date().toISOString().split('T')[0],
        is_current: true
      })
    }

    setLoading(false)
    if (e) return setError('Failed to submit. Please try again.')
    setSuccess(true)
  }

  if (success) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ fontSize: 52, color: 'var(--green)', marginBottom: 16 }}><i className="ti ti-circle-check" /></div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Profile created!</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Welcome {form.name}! Your portable profile is live.</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>Share your review link with clients to start building your reputation.</p>
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
        <button onClick={() => company ? navigate('company', { company }) : navigate('home')} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <i className="ti ti-arrow-left" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Create Employee Profile</span>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--primary)', lineHeight: 1.5 }}>
            Your profile is <strong>fully portable</strong> — your ratings and reviews stay with YOU, not the company. Change jobs anytime and your reputation moves with you.
          </p>
        </div>

        {[
          { key: 'name', label: 'Full name *', placeholder: 'Your full name' },
          { key: 'designation', label: 'Your speciality / designation *', placeholder: 'e.g. Gypsum Specialist, AC Technician, Tiling Expert' },
          { key: 'current_company', label: 'Current company', placeholder: company?.name || 'Company you currently work at' },
          { key: 'phone', label: 'WhatsApp number', placeholder: '+971 50 XXX XXXX' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Years of experience</label>
          <select value={form.years_experience} onChange={e => set('years_experience', e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', fontSize: 13, outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <option value="">Select</option>
            {['Less than 1 year','1–2 years','3–5 years','5–10 years','10+ years'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Emirates ID / Work Permit <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(for verification)</span>
          </label>
          <label style={{ display: 'block', border: '1.5px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 16, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}>
            <i className="ti ti-id" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{emiratesId ? `✓ ${emiratesId.name}` : 'Upload Emirates ID or Work Permit'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verified badge will be added after manual review</p>
            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setEmiratesId(e.target.files[0])} />
          </label>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: 12, background: loading ? 'var(--text-muted)' : 'var(--primary)',
          color: '#fff', border: 'none', borderRadius: 24, fontSize: 14, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}>{loading ? 'Creating...' : 'Create My Portable Profile'}</button>
      </div>
    </div>
  )
}
