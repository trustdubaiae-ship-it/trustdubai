function Stars({ rating }) {
  return (
    <span style={{ color: 'var(--amber)', fontSize: 13 }}>
      {[1,2,3,4,5].map(i => i <= Math.round(rating) ? '★' : '☆').join('')}
    </span>
  )
}

export default function CompanyCard({ company, onClick }) {
  return (
    <div onClick={onClick} style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: 12, marginBottom: 10, cursor: 'pointer', background: '#fff',
      transition: 'box-shadow 0.2s'
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{company.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{company.category}</div>
        </div>
        {company.is_verified && (
          <span style={{
            background: 'var(--green-light)', color: 'var(--green)',
            fontSize: 10, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap'
          }}>✓ Verified</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <Stars rating={company.avg_rating || 0} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{company.avg_rating || '0.0'}</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>({company.total_reviews || 0} reviews)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text2)' }}>
        <i className="ti ti-map-pin" style={{ fontSize: 11 }} />
        {company.area} · {company.employee_count || 0} employees
      </div>
    </div>
  )
}
