import { useState, useRef, useEffect } from 'react'
import { useCompanySearch } from '../hooks/useCompanySearch'

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function highlight(text, q) {
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: '#fef3c7', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  )
}

export function SearchBar({ placeholder = 'Search company name...', onSearch }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef()
  const inputRef = useRef()

  const { results, loading, clear } = useCompanySearch(query)

  useEffect(() => {
    setOpen(results.length > 0)
    setActiveIdx(-1)
  }, [results])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') { activeIdx >= 0 ? selectCompany(results[activeIdx]) : submitSearch() }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  function selectCompany(company) {
    setQuery(company.company_name)
    setOpen(false)
    clear()
    if (onSearch) onSearch(company.slug)
  }

  function submitSearch() {
    if (!query.trim()) return
    setOpen(false)
    if (onSearch) onSearch(query.trim())
  }

  function clearSearch() {
    setQuery('')
    clear()
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', maxWidth: '520px', margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', borderRadius: '10px',
        border: '1.5px solid rgba(255,255,255,0.25)',
      }}>
        <svg style={{ padding: '0 12px 0 14px', color: '#9ca3af', flexShrink: 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: '15px', padding: '13px 0',
            background: 'transparent', color: '#111827',
            fontFamily: 'inherit',
          }}
        />

        {loading && (
          <div style={{
            width: '14px', height: '14px', borderRadius: '50%',
            border: '2px solid #e5e7eb', borderTopColor: '#6b7280',
            animation: 'spin 0.6s linear infinite', marginRight: '8px', flexShrink: 0,
          }} />
        )}

        {query && (
          <button onClick={clearSearch} style={{
            padding: '0 8px', fontSize: '13px', color: '#9ca3af',
            background: 'none', border: 'none', cursor: 'pointer',
          }}>✕</button>
        )}

        <button onClick={submitSearch} style={{
          margin: '6px', padding: '0 20px', height: '36px',
          background: '#0a1628', color: '#fff', border: 'none',
          borderRadius: '7px', fontSize: '13px', fontWeight: '500',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>Search</button>
      </div>

      {open && results.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '10px',
          listStyle: 'none', overflow: 'hidden', zIndex: 50,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 0, margin: 0,
        }}>
          {results.map((company, i) => (
            <li
              key={company.id}
              onMouseDown={() => selectCompany(company)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '0.5px solid #f3f4f6',
                background: i === activeIdx ? '#f0f9ff' : '#fff',
              }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: '#ecfdf5', color: '#065f46',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '600', flexShrink: 0,
              }}>
                {initials(company.company_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {highlight(company.company_name, query)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>
                  {company.category}
                </div>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: '500', padding: '2px 8px',
                borderRadius: '99px', background: '#ecfdf5', color: '#065f46',
                border: '0.5px solid #a7f3d0', flexShrink: 0,
              }}>Verified</span>
            </li>
          ))}
        </ul>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input[type=search]::-webkit-search-cancel-button { display: none; }`}</style>
    </div>
  )
}
