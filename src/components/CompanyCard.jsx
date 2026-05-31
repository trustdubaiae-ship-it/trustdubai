function Stars({ rating }) {
  return (
    <span style={{ color: 'var(--amber)', fontSize: 13 }}>
      {[1,2,3,4,5].map(i => i <= Math.round(rating) ? '★' : '☆').join('')}
    </span>
  )
}

function PlanBadge({ plan }) {
  const config = {
    free:     { label: 'Free',     color: '#6b7280', bg: '#f3f4f6' },
    silver:   { label: 'Silver',   color: '#64748b', bg: '#f1f5f9' },
    gold:     { label: '🥇 Gold',   color: '#d97706', bg: '#fffbeb' },
    platinum: { label: '💎 Platinum', color: '#7c3aed', bg: '#f5f3ff' },
  }
  const p = config[plan] || config.free
  if (plan === 'free') return null
  return (
    <span style={{ background: p.bg, color: p.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
      {p.label}
    </span>
  )
}

function CredibilityScore({ company }) {
  let score = 0
  if (company.is_verified)              score += 25
  if (company.avg_rating >= 4)          score += 20
  else if (company.avg_rating >= 3)     score += 10
  if (company.total_reviews >= 10)      score += 20
  else if (company.total_reviews >= 5)  score += 15
  else if (company.total_reviews >= 1)  score += 8
  if (company.logo_url)                 score += 10
  if (company.description)              score += 10
  if (company.phone)                    score += 5
  if (company.instagram || company.facebook || company.linkedin) score += 10

  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#6b7280'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 32, height: 4, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: score + '%', height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>{score}</span>
    </div>
  )
}

export default function CompanyCard({ company, onClick }) {
  const plan = company.plan || 'free'

  // Location: area > location > city > 'Dubai' fallback (never blank)
  const locationText = company.area || company.location || company.city || 'Dubai'
  const hasEmployees = Number(company.employee_count) > 0

  // Logo initials fallback
  const initials = (company.name || company.company_name || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  // WhatsApp contact (predefined message)
  const waNumber = (company.whatsapp || company.phone || '').replace(/[^0-9]/g, '')
  const waMsg = encodeURIComponent("Hi, I saw your profile on TrustDubai and I'm interested in your services. Can we discuss?")
  function openWhatsApp(e) {
    e.stopPropagation()
    if (!waNumber) return
    window.open('https://wa.me/' + waNumber + '?text=' + waMsg, '_blank')
  }

  return (
    <div onClick={onClick} style={{
      border: '1px solid ' + (plan === 'gold' ? '#fcd34d' : plan === 'platinum' ? 'rgba(139,92,246,0.3)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-lg)',
      padding: 12, marginBottom: 10, cursor: 'pointer',
      background: plan === 'platinum' ? 'linear-gradient(135deg, #1e1b4b, #2d1b69)' : plan === 'gold' ? '#fffdf7' : 'var(--bg-card)',
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
          {/* Logo / initials */}
          <div style={{
            width: 40, height: 40, borderRadius: 9, flexShrink: 0, overflow: 'hidden',
            background: plan === 'platinum' ? 'rgba(255,255,255,0.1)' : '#eef4f9',
            color: '#0099cc', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>
            {company.logo_url
              ? <img src={company.logo_url} alt={company.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: plan === 'platinum' ? '#f1f5f9' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {company.name || company.company_name}
              </div>
              <PlanBadge plan={plan} />
            </div>
            <div style={{ fontSize: 11, color: plan === 'platinum' ? '#a78bfa' : 'var(--text-secondary)' }}>{company.category || 'Business'}</div>
          </div>
        </div>
        {company.is_verified && (
          <span style={{ background: plan === 'platinum' ? 'rgba(16,185,129,0.2)' : 'var(--verified-bg)', color: plan === 'platinum' ? '#34d399' : 'var(--verified-text)', fontSize: 10, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap', flexShrink: 0 }}>
            ✓ Verified
          </span>
        )}
      </div>

      {/* Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Stars rating={company.avg_rating || 0} />
        <span style={{ fontSize: 13, fontWeight: 500, color: plan === 'platinum' ? '#f1f5f9' : 'var(--text-primary)' }}>{company.avg_rating || '0.0'}</span>
        <span style={{ fontSize: 12, color: plan === 'platinum' ? '#94a3b8' : 'var(--text-muted)' }}>({company.total_reviews || 0} reviews)</span>
        <span style={{ marginLeft: 'auto' }}>
          <CredibilityScore company={company} />
        </span>
      </div>

      {/* Location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: plan === 'platinum' ? '#94a3b8' : 'var(--text-secondary)', marginBottom: 10 }}>
        <span style={{ fontSize: 11 }}>📍</span>
        <span>{locationText}</span>
        {hasEmployees && <span> · {company.employee_count} employees</span>}
      </div>

      {/* Action Row: WhatsApp + View Profile */}
      <div style={{ display: 'flex', gap: 8 }}>
        {waNumber && (
          <button onClick={openWhatsApp} style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 10px', background: '#25D366', color: '#fff', border: 'none',
            borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M17.47 14.38c-.3-.15-1.74-.86-2.01-.96-.27-.1-.46-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.91-2.19-.24-.57-.48-.49-.66-.5-.17-.01-.37-.01-.56-.01-.2 0-.51.07-.78.37-.27.3-1.02 1-1.02 2.43 0 1.43 1.04 2.82 1.19 3.01.15.2 2.05 3.13 4.97 4.39.69.3 1.24.48 1.66.61.7.22 1.33.19 1.83.12.56-.08 1.74-.71 1.98-1.4.24-.69.24-1.28.17-1.4-.07-.12-.27-.2-.56-.34z M12 2a10 10 0 0 0-8.6 15.06L2 22l5.07-1.33A10 10 0 1 0 12 2zm0 18.2a8.18 8.18 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31A8.2 8.2 0 1 1 12 20.2z"/></svg>
            WhatsApp
          </button>
        )}
        <button onClick={onClick} style={{
          flex: waNumber ? '0 0 auto' : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '9px 14px', background: 'transparent', color: '#0099cc',
          border: '1px solid #0099cc', borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          View Profile
        </button>
      </div>
    </div>
  )
}
