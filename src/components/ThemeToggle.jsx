import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const isDark = mode === 'dark'
  return (
    <button
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to Light' : 'Switch to Dark'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: '50%',
        border: '0.5px solid var(--border-default)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
