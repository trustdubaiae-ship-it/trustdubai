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

function SocialLinks({ company }) {
  const links = []
  if (company.instagram) links.push({
    icon: '📸',
    url: company.instagram.startsWith('http') ? company.instagram : 'https://instagram.com/' + company.instagram.replace('@', ''),
    label: 'Instagram'
  })
  if (company.facebook) links.push({
    icon: '👍',
    url: company.facebook.startsWith('http') ? company.facebook : 'https://facebook.com/' + company.facebook,
    label: 'Facebook'
  })
  if (company.linkedin) links.push({
    icon: '💼',
    url: company.linkedin.startsWith('http') ? company.linkedin : 'https://linkedin.com/company/' + company.linkedin,
    label: 'LinkedIn'
  })
  if (company.website) links.push({
    icon: '🌐',
    url: company.website.startsWith('http') ? company.website : 'https://' + company.website,
    label: 'Website'
  })
  if (links.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      {links.map(l => (
        <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title={l.label}
          style={{ fontSize: 13, textDecoration: 'none', opacity: 0.8, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
        >
          {l.icon}
        </a>
      ))}
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

      {/* Location — emoji pin (font-independent), never blank */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: plan === 'platinum' ? '#94a3b8' : 'var(--text-secondary)' }}>
        <span style={{ fontSize: 11 }}>📍</span>
        <span>{locationText}</span>
        {hasEmployees && <span> · {company.employee_count} employees</span>}
      </div>

      {/* Social Links */}
      <SocialLinks company={company} />
    </div>
  )
}
