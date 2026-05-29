import { useState } from 'react'

export function SearchBar({ placeholder, onSearch }) {
  const [q, setQ] = useState('')

  function handleSearch() {
    if (q.trim()) onSearch(q.trim())
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#ffffff',
      border: '1.5px solid #b3d9f0',
      borderRadius: 10,
      padding: '8px 8px 8px 14px',
      gap: 8,
      boxShadow: '0 2px 8px rgba(0,153,204,0.1)',
      width: '100%',
    }}>
      <i className="ti ti-search" style={{ fontSize: 15, color: '#0099cc', flexShrink: 0 }} />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSearch()}
        placeholder={placeholder || 'Search companies or services...'}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: 13,
          color: '#1a2744',
          background: 'transparent',
          minWidth: 0,
        }}
      />
      <button
        onClick={handleSearch}
        style={{
          background: '#0099cc',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
        Search
      </button>
    </div>
  )
}
