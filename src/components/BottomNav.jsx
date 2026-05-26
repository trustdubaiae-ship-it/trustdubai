export default function BottomNav({ screen, navigate }) {
  const items = [
    { id: 'home', icon: 'ti-home', label: 'Home' },
    { id: 'search', icon: 'ti-search', label: 'Search' },
    { id: 'register-company', icon: 'ti-building', label: 'List Biz' },
    { id: 'add-review', icon: 'ti-star', label: 'Review' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, background: '#fff',
      borderTop: '1px solid var(--border)', display: 'flex', zIndex: 100
    }}>
      {items.map(item => (
        <div key={item.id}
          onClick={() => navigate(item.id)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 4px', cursor: 'pointer', gap: 2
          }}>
          <i className={`ti ${item.icon}`} style={{
            fontSize: 20,
            color: screen === item.id ? 'var(--primary)' : 'var(--text3)'
          }} />
          <span style={{
            fontSize: 10,
            color: screen === item.id ? 'var(--primary)' : 'var(--text3)'
          }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
