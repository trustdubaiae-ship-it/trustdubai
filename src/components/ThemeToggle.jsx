import { useTheme } from '../context/ThemeContext'

const OPTIONS = [
  { value: 'auto',  label: 'Auto',  icon: '◐' },
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark',  label: 'Dark',  icon: '☽' },
]

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border-default)',
      borderRadius: '8px',
      padding: '3px',
      gap: '2px',
    }}>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => setMode(opt.value)}
          title={opt.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '6px',
            border: mode === opt.value ? '0.5px solid var(--border-default)' : 'none',
            background: mode === opt.value ? 'var(--bg-primary)' : 'transparent',
            color: mode === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'inherit',
          }}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
