// trustdubai/src/pages/PublicLeadForm.jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'

function makeTheme(dark) {
  if (dark) return {
    dark: true,
    bg: 'radial-gradient(1100px 560px at 8% -8%, rgba(59,143,212,0.18), transparent 58%), radial-gradient(900px 600px at 102% 4%, rgba(167,139,250,0.16), transparent 55%), #070b15',
    card: 'rgba(17,24,40,0.78)', cardSolid: '#0f1626', line: 'rgba(255,255,255,0.09)', soft: 'rgba(255,255,255,0.04)',
    t1: '#eef3fb', t2: '#9aa7bd', t3: '#5d6b7e',
    accent: '#4f9fe0', green: '#2ee08a', red: '#ff5c6c', gold: '#e0b53e',
    grad: 'linear-gradient(135deg,#4f9fe0,#b69bff)',
    glow: '0 10px 34px rgba(59,143,212,0.20)', blur: 'blur(14px)',
    shadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 44px rgba(0,0,0,0.4)',
  }
  return {
    dark: false,
    bg: 'radial-gradient(1000px 520px at 8% -6%, rgba(29,111,184,0.10), transparent 60%), radial-gradient(900px 560px at 100% 0%, rgba(139,92,246,0.08), transparent 55%), #e7ecf3',
    card: 'rgba(255,255,255,0.9)', cardSolid: '#ffffff', line: '#e4e9f0', soft: '#f4f7fb',
    t1: '#16233a', t2: '#56657c', t3: '#94a3b8',
    accent: '#1d6fb8', green: '#1e9e63', red: '#dc3545', gold: '#c9a227',
    grad: 'linear-gradient(135deg,#1d6fb8,#8b5cf6)',
    glow: '0 12px 30px rgba(29,111,184,0.16)', blur: 'blur(12px)',
    shadow: '0 1px 2px rgba(20,40,80,0.05), 0 12px 38px rgba(20,40,80,0.09)',
  }
}

export default function PublicLeadForm() {
  const { formId } = useParams()
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('td_theme') === 'dark' } catch { return false } })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState(null)
  const [questions, setQuestions] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { fetchForm() }, [formId])
  useEffect(() => { try { localStorage.setItem('td_theme', dark ? 'dark' : 'light') } catch (e) {} }, [dark])

  async function fetchForm() {
    setLoading(true); setNotFound(false)
    const { data: f, error } = await supabase.from('lead_forms').select('*').eq('id', formId).maybeSingle()
    if (error || !f) { setNotFound(true); setLoading(false); return }
    setForm(f)
    const { data: c } = await supabase
      .from('companies')
      .select('id, name, logo_url, category, categories, is_verified, plan, location, slug')
      .eq('id', f.company_id).maybeSingle()
    setCompany(c || null)
    const { data: q } = await supabase.from('lead_form_questions').select('*').eq('form_id', f.id).order('order_num')
    setQuestions(q || [])
    document.title = (c?.name ? c.name + ' — ' : '') + (f.title || 'Get a Quote') + ' | TrustDubai'
    setLoading(false)
  }

  function setAns(q, v) { setAnswers(p => ({ ...p, [q]: v })) }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Please enter your name'); return }
    if (!phone.trim()) { setErr('Please enter your phone number'); return }
    setSubmitting(true)

    // Source clearly marked so it lands in the right bucket (company + admin)
    const fullAnswers = { ...answers, Source: 'QR / Public Form' }

    const { error } = await supabase.from('lead_submissions').insert({
      form_id: form.id,
      company_id: company?.id || form.company_id,
      customer_id: null,                 // no login — anonymous lead
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      answers: fullAnswers,
      status: 'new',
      status_updated_at: new Date().toISOString(),
      source: 'public_form',             // admin sourceBucket → "Public / QR"
      source_url: window.location.href,
    })

    setSubmitting(false)
    if (error) { console.error(error); setErr('Something went wrong. Please try again.'); return }
    setSubmitted(true)
  }

  const TH = makeTheme(dark)
  const F = "'Manrope',sans-serif"
  const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
    @keyframes pflspin{to{transform:rotate(360deg)}}
    @keyframes pflfade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes pflpop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
    .pfl-card{animation:pflfade .5s cubic-bezier(.2,.7,.2,1) both}
    .pfl-pop{animation:pflpop .5s ease both}
  `}</style>

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070b15' }}>
      <Fonts />
      <div style={{ width: 40, height: 40, border: '3px solid #4f9fe0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pflspin .8s linear infinite' }} />
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e7ecf3', fontFamily: F }}>
      <Fonts />
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52 }}>🔍</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", color: '#16233a', margin: '12px 0' }}>Form not found</h2>
        <p style={{ color: '#56657c', fontSize: 14, marginBottom: 16 }}>This form may have been removed or is no longer active.</p>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: '#1d6fb8', color: '#fff', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Go to TrustDubai</button>
      </div>
    </div>
  )

  const cats = Array.isArray(company?.categories) && company.categories.length ? company.categories : company?.category ? [company.category] : []
  const inp = { width: '100%', padding: '12px 14px', border: `1px solid ${TH.line}`, borderRadius: 11, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', background: TH.soft, color: TH.t1, outline: 'none' }
  const lbl = { fontSize: 12.5, fontWeight: 600, color: TH.t2, display: 'block', marginBottom: 6 }

  // normalize question type — supports text, textarea, select/dropdown, radio
  function renderQuestion(q) {
    const t = (q.type || 'text').toLowerCase()
    const val = answers[q.question] || ''
    if (t === 'textarea') {
      return <textarea required={q.required} value={val} onChange={e => setAns(q.question, e.target.value)} style={{ ...inp, minHeight: 90, resize: 'vertical' }} />
    }
    if (t === 'select' || t === 'dropdown') {
      return (
        <select required={q.required} value={val} onChange={e => setAns(q.question, e.target.value)} style={inp}>
          <option value="">Select an option</option>
          {(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      )
    }
    if (t === 'radio') {
      return (q.options || []).map((o, i) => (
        <label key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: TH.t2, marginBottom: 7, cursor: 'pointer', alignItems: 'center' }}>
          <input type="radio" name={q.id} value={o} required={q.required} checked={val === o} onChange={() => setAns(q.question, o)} />
          {o}
        </label>
      ))
    }
    // default → text
    return <input required={q.required} value={val} onChange={e => setAns(q.question, e.target.value)} style={inp} />
  }

  return (
    <div style={{ background: TH.bg, minHeight: '100vh', fontFamily: F, color: TH.t1, padding: '20px 14px 60px' }}>
      <Fonts />

      {/* top bar */}
      <div style={{ maxWidth: 560, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => window.location.href = '/'} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: TH.t1 }}>
          🛡️ Trust<span style={{ background: TH.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dubai</span>
        </button>
        <button onClick={() => setDark(d => !d)} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${TH.line}`, background: TH.soft, color: TH.t2, cursor: 'pointer', fontSize: 15 }}>{dark ? '☀️' : '🌙'}</button>
      </div>

      <div className="pfl-card" style={{ maxWidth: 560, margin: '0 auto', background: TH.card, backdropFilter: TH.blur, WebkitBackdropFilter: TH.blur, border: `1px solid ${TH.line}`, borderRadius: 20, boxShadow: TH.shadow, overflow: 'hidden' }}>

        {/* company header */}
        <div style={{ padding: '22px 22px 18px', borderBottom: `1px solid ${TH.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', background: company?.logo_url ? 'transparent' : TH.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
            {company?.logo_url ? <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (company?.name?.[0]?.toUpperCase() || '?')}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: TH.t1 }}>{company?.name || 'Business'}</span>
              {company?.is_verified && <span style={{ fontSize: 9, color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'linear-gradient(135deg,#1e9e63,#22c55e)', padding: '3px 9px', borderRadius: 20 }}>✓ Verified</span>}
            </div>
            <div style={{ fontSize: 12, color: TH.t3, marginTop: 2 }}>{cats[0] || ''}{company?.location ? ' · 📍 ' + company.location : ''}</div>
          </div>
        </div>

        {/* body */}
        {submitted ? (
          <div style={{ padding: '46px 24px', textAlign: 'center' }}>
            <div className="pfl-pop" style={{ fontSize: 58 }}>✅</div>
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: TH.t1, margin: '14px 0 8px' }}>Request Sent!</h2>
            <p style={{ fontSize: 14, color: TH.t2, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 22px' }}>
              Thank you, {name.split(' ')[0]}. <b style={{ color: TH.t1 }}>{company?.name}</b> has received your request and will contact you shortly{phone ? ' on ' + phone : ''}.
            </p>
            {company?.slug && (
              <button onClick={() => window.location.href = '/' + company.slug} style={{ padding: '11px 22px', background: TH.grad, color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: TH.glow }}>
                View {company.name} profile →
              </button>
            )}
            <div style={{ marginTop: 18, fontSize: 11, color: TH.t3 }}>Powered by 🛡️ TrustDubai</div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: 22 }}>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: TH.t1, margin: '0 0 4px' }}>{form?.title || 'Request a Quote'}</h1>
            <p style={{ fontSize: 13, color: TH.t2, margin: '0 0 18px' }}>Fill in your details and we'll get back to you fast.</p>

            <div style={{ marginBottom: 13 }}>
              <label style={lbl}>Your Name <span style={{ color: TH.red }}>*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ankit Sharma" style={inp} />
            </div>
            <div style={{ marginBottom: 13 }}>
              <label style={lbl}>Phone / WhatsApp <span style={{ color: TH.red }}>*</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+971 50 000 0000" inputMode="tel" style={inp} />
            </div>
            <div style={{ marginBottom: 13 }}>
              <label style={lbl}>Email <span style={{ color: TH.t3, fontWeight: 400 }}>(optional)</span></label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" inputMode="email" style={inp} />
            </div>

            {questions.map(q => (
              <div key={q.id} style={{ marginBottom: 13 }}>
                <label style={lbl}>{q.question}{q.required && <span style={{ color: TH.red }}> *</span>}</label>
                {renderQuestion(q)}
              </div>
            ))}

            {err && <div style={{ background: 'rgba(220,53,69,0.12)', border: `1px solid ${TH.red}55`, borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: TH.red, marginBottom: 13 }}>{err}</div>}

            <button type="submit" disabled={submitting} style={{ width: '100%', padding: 14, background: submitting ? '#94a3b8' : TH.grad, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14.5, fontWeight: 800, cursor: submitting ? 'default' : 'pointer', boxShadow: submitting ? 'none' : TH.glow }}>
              {submitting ? 'Sending…' : 'Submit Request'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: TH.t3, lineHeight: 1.6 }}>
              🔒 Your details are shared only with {company?.name || 'this business'}.<br />Powered by 🛡️ TrustDubai
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
