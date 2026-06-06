// trustdubai/src/pages/Partner.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/* ============================================================================
   TrustDubai — Become a Partner (Reseller Program)
   Public page. Recruits partners who refer businesses via a referral link.
   Commission accrues automatically once the payment gateway is live.
   Responsive (phone/tablet/desktop) · Light + Dark.
============================================================================ */

function makeTheme(dark) {
  return dark ? {
    bg: '#0a0f1a', bg2: '#0f1626', card: '#121a2b', cardSoft: 'rgba(255,255,255,0.025)',
    line: 'rgba(255,255,255,0.08)', t1: '#f0f5ff', t2: '#9fb0c8', t3: '#5d6b85',
    green: '#4ade80', greenDeep: '#16a34a', gold: '#e8c45a',
    accentBg: 'rgba(74,222,128,0.10)', heroGlow: 'rgba(74,222,128,0.12)',
  } : {
    bg: '#f5f8fc', bg2: '#ffffff', card: '#ffffff', cardSoft: '#f4f8fb',
    line: '#e3ebf3', t1: '#0c1424', t2: '#51607a', t3: '#9aa8bf',
    green: '#16a34a', greenDeep: '#0f7a37', gold: '#b8860b',
    accentBg: 'rgba(22,163,74,0.07)', heroGlow: 'rgba(22,163,74,0.10)',
  }
}

const PLAN_PRESETS = [
  { name: 'Silver', price: 149 },
  { name: 'Gold', price: 349 },
  { name: 'Platinum', price: 699 },
]

const TIERS = [
  { key: 'bronze', name: 'Bronze', rate: 20, range: '1 – 5 active clients', color: '#cd7f32' },
  { key: 'silver', name: 'Silver', rate: 25, range: '6 – 15 active clients', color: '#9aa8bf' },
  { key: 'gold', name: 'Gold', rate: 30, range: '16+ active clients', color: '#e8c45a' },
]

const FAQS = [
  ['Is there any joining fee?', 'No. Becoming a TrustDubai Partner is completely free. You only earn — you never pay to join.'],
  ['How do I get paid?', 'Once a business you referred subscribes to a paid plan and the payment clears, your commission is recorded in your partner account and paid out monthly. Commission tracking activates automatically when our online payment gateway goes live.'],
  ['How long do I earn commission?', 'You earn a recurring commission every month for as long as the business you referred stays on a paid plan. The more active clients you keep, the higher your tier and rate.'],
  ['How is a referral tracked to me?', 'You get a unique referral link. Any business that signs up and subscribes through your link is automatically credited to you.'],
  ['Who can become a partner?', 'Marketing agencies, business-setup consultants, freelancers, and anyone with access to Dubai home-service businesses. Applications are reviewed to protect the TrustDubai brand.'],
  ['What happens if a client cancels or refunds early?', 'Commission is paid only on verified, paid and retained accounts. If a client refunds within the protection window, that commission is reversed — this keeps the platform fair and trusted.'],
]

export default function Partner() {
  const [dark, setDark] = useState(true)
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const saved = localStorage.getItem('td_theme')
    if (saved) setDark(saved !== 'light')
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('td_theme', next ? 'dark' : 'light')
  }

  const C = makeTheme(dark)
  const mobile = vw < 720
  const tablet = vw >= 720 && vw < 1040
  const cols3 = mobile ? '1fr' : tablet ? '1fr 1fr' : '1fr 1fr 1fr'
  const F = "'Inter','Manrope',system-ui,-apple-system,sans-serif"
  const maxW = 1080

  // ---- Earnings calculator ----
  const [clients, setClients] = useState(10)
  const [plan, setPlan] = useState(349)
  const tier = clients <= 5 ? TIERS[0] : clients <= 15 ? TIERS[1] : TIERS[2]
  const monthly = Math.round(clients * plan * tier.rate / 100)
  const yearly = monthly * 12

  // ---- Apply form ----
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', partner_type: '', company_name: '', message: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function upd(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    setError('')
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in your name, email and phone number.')
      return
    }
    if (!form.partner_type) { setError('Please select what best describes you.'); return }
    setSending(true)
    try {
      const { error: e } = await supabase.from('partners').insert({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        partner_type: form.partner_type,
        company_name: form.company_name.trim() || null,
        experience: form.message.trim() || null,
      })
      if (e) {
        if ((e.message || '').toLowerCase().includes('duplicate')) {
          setError('An application with this email already exists. We will be in touch.')
        } else {
          setError('Something went wrong. Please try again or email partners@trustdubai.ae')
        }
        setSending(false)
        return
      }
      setDone(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // ---- shared styles ----
  const section = { maxWidth: maxW, margin: '0 auto', padding: mobile ? '44px 18px' : '64px 24px' }
  const h2 = { fontSize: mobile ? 24 : 32, fontWeight: 800, letterSpacing: '-0.6px', color: C.t1, lineHeight: 1.15 }
  const kicker = { fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: C.green, textTransform: 'uppercase', marginBottom: 10 }
  const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: mobile ? 20 : 26 }
  const input = { width: '100%', padding: '12px 14px', borderRadius: 11, border: `1px solid ${C.line}`, background: C.cardSoft, color: C.t1, fontSize: 14, fontFamily: F, outline: 'none', boxSizing: 'border-box' }
  const label = { fontSize: 12.5, fontWeight: 700, color: C.t2, marginBottom: 6, display: 'block' }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: F, color: C.t1 }}>
      <style>{`
        .pt-btn{transition:transform .15s, box-shadow .15s, opacity .15s}
        .pt-btn:hover{transform:translateY(-1px)}
        .pt-slider{-webkit-appearance:none;appearance:none;height:6px;border-radius:99px;outline:none;width:100%}
        .pt-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:${C.green};cursor:pointer;border:3px solid ${C.bg2};box-shadow:0 2px 8px rgba(0,0,0,.25)}
        .pt-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:${C.green};cursor:pointer;border:3px solid ${C.bg2}}
        a{color:inherit}
      `}</style>

      {/* NAV */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: dark ? 'rgba(10,15,26,0.82)' : 'rgba(245,248,252,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: mobile ? '12px 18px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#0f6e56,#1d9e75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" fill="rgba(255,255,255,0.15)" stroke="#4ade80" strokeWidth="1.5" />
                <polyline points="8.5,12 11,14.5 15.5,10" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', color: C.t1 }}>TRUST<span style={{ color: C.green }}>DUBAI</span></span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/" className="pt-btn" style={{ fontSize: 13, fontWeight: 600, color: C.t2, textDecoration: 'none', padding: '8px 12px' }}>Home</a>
            <button onClick={toggleTheme} aria-label="Toggle theme" className="pt-btn" style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.line}`, background: C.cardSoft, color: C.t1, cursor: 'pointer', fontSize: 15 }}>{dark ? '☀️' : '🌙'}</button>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 620, height: 320, background: C.heroGlow, filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ ...section, position: 'relative', textAlign: 'center', paddingTop: mobile ? 50 : 80, paddingBottom: mobile ? 30 : 40 }}>
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: C.green, background: C.accentBg, border: `1px solid ${C.green}44`, borderRadius: 99, padding: '6px 14px', marginBottom: 18 }}>TrustDubai Partner Program</span>
          <h1 style={{ fontSize: mobile ? 30 : 48, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.08, color: C.t1, maxWidth: 760, margin: '0 auto' }}>
            Earn recurring income.<br />Partner with <span style={{ color: C.green }}>TrustDubai</span>.
          </h1>
          <p style={{ fontSize: mobile ? 15 : 17, color: C.t2, lineHeight: 1.6, maxWidth: 600, margin: '18px auto 0' }}>
            Refer Dubai businesses to the platform that verifies trust. They subscribe, you earn up to <b style={{ color: C.t1 }}>30% recurring commission</b> — every single month.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <a href="#apply" className="pt-btn" style={{ background: `linear-gradient(135deg,${C.greenDeep},${C.green})`, color: '#04140c', fontWeight: 800, fontSize: 15, padding: '13px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: `0 8px 24px ${C.green}33` }}>Become a Partner</a>
            <a href="#calculator" className="pt-btn" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.t1, fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 12, textDecoration: 'none' }}>See your earnings</a>
          </div>
        </div>

        {/* stats strip */}
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: mobile ? '0 18px 20px' : '0 24px 30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12 }}>
            {[
              ['Up to 30%', 'Recurring commission'],
              ['Monthly', 'Paid every month'],
              ['AED 0', 'Cost to join'],
              ['Lifetime', 'Earn while client stays'],
            ].map((s, i) => (
              <div key={i} style={{ ...card, textAlign: 'center', padding: mobile ? 16 : 20 }}>
                <div style={{ fontSize: mobile ? 20 : 24, fontWeight: 800, color: C.green, letterSpacing: '-0.5px' }}>{s[0]}</div>
                <div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={section}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={kicker}>How it works</div>
          <h2 style={h2}>Three steps to recurring income</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols3, gap: 16 }}>
          {[
            ['01', 'Join & get your link', 'Apply in 2 minutes. Once approved, you get a unique referral link to share with businesses.'],
            ['02', 'Refer businesses', 'Share your link with Dubai home-service businesses. They sign up and choose a plan through it.'],
            ['03', 'Earn every month', 'When they pay, your commission is recorded automatically and paid out monthly — for as long as they stay.'],
          ].map((s, i) => (
            <div key={i} style={card}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentBg, border: `1px solid ${C.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.green, marginBottom: 14 }}>{s[0]}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{s[1]}</div>
              <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.6 }}>{s[2]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* EARNINGS CALCULATOR */}
      <div id="calculator" style={{ background: C.bg2, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={section}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={kicker}>Earnings calculator</div>
            <h2 style={h2}>See what you could earn</h2>
          </div>
          <div style={{ ...card, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: mobile ? 26 : 40, alignItems: 'center', padding: mobile ? 22 : 34 }}>
            {/* sliders */}
            <div>
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={label}>Active clients</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{clients}</span>
                </div>
                <input type="range" min="1" max="50" value={clients} onChange={e => setClients(+e.target.value)} className="pt-slider" style={{ background: `linear-gradient(90deg,${C.green} ${(clients - 1) / 49 * 100}%, ${C.line} ${(clients - 1) / 49 * 100}%)` }} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={label}>Average plan (AED / month)</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{plan}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PLAN_PRESETS.map(p => (
                    <button key={p.name} onClick={() => setPlan(p.price)} className="pt-btn"
                      style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                        border: `1px solid ${plan === p.price ? C.green : C.line}`,
                        background: plan === p.price ? C.accentBg : C.cardSoft,
                        color: plan === p.price ? C.green : C.t2 }}>
                      {p.name}<br /><span style={{ fontSize: 11, fontWeight: 600 }}>AED {p.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* result */}
            <div style={{ textAlign: 'center', background: `linear-gradient(160deg,${C.accentBg},transparent)`, border: `1px solid ${C.green}33`, borderRadius: 16, padding: mobile ? 22 : 30 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t2 }}>Your tier: <span style={{ color: tier.color, fontWeight: 800 }}>{tier.name}</span> · {tier.rate}% commission</div>
              <div style={{ fontSize: mobile ? 38 : 46, fontWeight: 800, color: C.green, letterSpacing: '-1px', margin: '10px 0 2px' }}>AED {monthly.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: C.t2 }}>estimated per month</div>
              <div style={{ height: 1, background: C.line, margin: '18px 0' }} />
              <div style={{ fontSize: 13, color: C.t2 }}>≈ <b style={{ color: C.t1, fontSize: 16 }}>AED {yearly.toLocaleString()}</b> per year recurring</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 12, lineHeight: 1.5 }}>Estimate only. Actual earnings depend on retained, paid clients.</div>
            </div>
          </div>
        </div>
      </div>

      {/* TIERS */}
      <div style={section}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={kicker}>Commission tiers</div>
          <h2 style={h2}>The more you grow, the more you earn</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols3, gap: 16 }}>
          {TIERS.map((t, i) => (
            <div key={i} style={{ ...card, position: 'relative', borderColor: t.key === 'gold' ? `${C.gold}66` : C.line, textAlign: 'center' }}>
              {t.key === 'gold' && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: C.gold, color: '#1a1300', fontSize: 10.5, fontWeight: 800, padding: '3px 12px', borderRadius: 99, letterSpacing: '0.04em' }}>TOP TIER</div>}
              <div style={{ fontSize: 13, fontWeight: 800, color: t.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t.name}</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: C.t1, letterSpacing: '-1.5px', margin: '6px 0 2px' }}>{t.rate}<span style={{ fontSize: 22, color: C.t2 }}>%</span></div>
              <div style={{ fontSize: 13, color: C.t2 }}>recurring commission</div>
              <div style={{ height: 1, background: C.line, margin: '16px 0' }} />
              <div style={{ fontSize: 13.5, color: C.t1, fontWeight: 600 }}>{t.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHO SHOULD JOIN */}
      <div style={{ background: C.bg2, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={section}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={kicker}>Who should join</div>
            <h2 style={h2}>Built for people with business networks</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: cols3, gap: 16 }}>
            {[
              ['🏢', 'Marketing agencies', 'Add a recurring revenue line on top of the services you already sell to local businesses.'],
              ['📋', 'Business-setup consultants', 'You already help companies launch in Dubai — add TrustDubai verification to your offering.'],
              ['💼', 'Freelancers & connectors', 'Know contractors, interior firms, or home-service businesses? Refer and earn monthly.'],
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s[0]}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{s[1]}</div>
                <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.6 }}>{s[2]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* APPLY FORM */}
      <div id="apply" style={section}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={kicker}>Apply now</div>
            <h2 style={h2}>Become a TrustDubai Partner</h2>
            <p style={{ fontSize: 14.5, color: C.t2, marginTop: 10 }}>Free to join. We review every application to protect the platform's trust.</p>
          </div>

          {done ? (
            <div style={{ ...card, textAlign: 'center', padding: mobile ? 30 : 44 }}>
              <div style={{ fontSize: 46, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.t1 }}>Application received!</div>
              <p style={{ fontSize: 14.5, color: C.t2, lineHeight: 1.6, marginTop: 12, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                Thank you for applying to the TrustDubai Partner Program. Our team will review your application and reach out by email. Once approved, you'll receive your unique referral link to start earning.
              </p>
              <a href="/" className="pt-btn" style={{ display: 'inline-block', marginTop: 22, background: C.cardSoft, border: `1px solid ${C.line}`, color: C.t1, fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 11, textDecoration: 'none' }}>Back to Home</a>
            </div>
          ) : (
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={label}>Full name *</label>
                  <input style={input} value={form.full_name} onChange={e => upd('full_name', e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label style={label}>Phone / WhatsApp *</label>
                  <input style={input} value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="+971 5X XXX XXXX" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={label}>Email *</label>
                <input style={input} type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="you@email.com" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div>
                  <label style={label}>What best describes you? *</label>
                  <select style={{ ...input, appearance: 'none' }} value={form.partner_type} onChange={e => upd('partner_type', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="agency">Marketing agency</option>
                    <option value="consultant">Business-setup consultant</option>
                    <option value="freelancer">Freelancer / connector</option>
                    <option value="business-setup">Existing business owner</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Company name (optional)</label>
                  <input style={input} value={form.company_name} onChange={e => upd('company_name', e.target.value)} placeholder="Company / brand" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={label}>Tell us about your network (optional)</label>
                <textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} value={form.message} onChange={e => upd('message', e.target.value)} placeholder="What kind of businesses can you refer?" />
              </div>

              {error && <div style={{ marginTop: 14, fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}

              <button onClick={submit} disabled={sending} className="pt-btn"
                style={{ width: '100%', marginTop: 18, background: sending ? C.t3 : `linear-gradient(135deg,${C.greenDeep},${C.green})`, color: '#04140c', fontWeight: 800, fontSize: 15.5, padding: '14px 0', borderRadius: 12, border: 'none', cursor: sending ? 'default' : 'pointer', boxShadow: sending ? 'none' : `0 8px 24px ${C.green}33` }}>
                {sending ? 'Submitting…' : 'Submit application'}
              </button>
              <p style={{ fontSize: 11.5, color: C.t3, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                By applying you agree to our <a href="/terms" style={{ color: C.green, textDecoration: 'none' }}>Terms</a> and <a href="/privacy" style={{ color: C.green, textDecoration: 'none' }}>Privacy Policy</a>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: C.bg2, borderTop: `1px solid ${C.line}` }}>
        <div style={{ ...section, maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={kicker}>FAQ</div>
            <h2 style={h2}>Questions, answered</h2>
          </div>
          {FAQS.map((f, i) => <Faq key={i} q={f[0]} a={f[1]} C={C} />)}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: `1px solid ${C.line}`, background: C.bg }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: mobile ? '26px 18px' : '32px 24px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#0f6e56,#1d9e75)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>TRUST<span style={{ color: C.green }}>DUBAI</span></span>
            <span style={{ fontSize: 12, color: C.t3, marginLeft: 6 }}>© 2026</span>
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 13, color: C.t2 }}>
            <a href="/" style={{ textDecoration: 'none', color: C.t2 }}>Home</a>
            <a href="/terms" style={{ textDecoration: 'none', color: C.t2 }}>Terms</a>
            <a href="/privacy" style={{ textDecoration: 'none', color: C.t2 }}>Privacy</a>
            <a href="/refund" style={{ textDecoration: 'none', color: C.t2 }}>Refund</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Faq({ q, a, C }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${C.line}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '17px 4px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{q}</span>
        <span style={{ fontSize: 20, color: C.green, flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
      </button>
      {open && <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.65, padding: '0 4px 18px' }}>{a}</div>}
    </div>
  )
}
