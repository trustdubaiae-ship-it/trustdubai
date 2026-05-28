import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const DUBAI_LAT = 25.2048
const DUBAI_LNG = 55.2708

function getSunTimes(date) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180)
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)
  const lstm = 15 * 4
  const tc = 4 * DUBAI_LNG + eot - lstm
  const decl = 23.45 * Math.sin(B) * (Math.PI / 180)
  const lat = DUBAI_LAT * (Math.PI / 180)
  const ha = Math.acos(-Math.tan(lat) * Math.tan(decl)) * (180 / Math.PI)
  return {
    sunrise: Math.round((12 - ha / 15 - tc / 60) * 60),
    sunset: Math.round((12 + ha / 15 - tc / 60) * 60),
  }
}

function getDubaiMinutes() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }))
  return d.getHours() * 60 + d.getMinutes()
}

function resolveTheme(mode) {
  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }))
  const { sunrise, sunset } = getSunTimes(today)
  const now = getDubaiMinutes()
  return now >= sunrise && now < sunset ? 'light' : 'dark'
}

const STORAGE_KEY = 'td-theme-mode'

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    if (typeof window === 'undefined') return 'auto'
    return localStorage.getItem(STORAGE_KEY) ?? 'auto'
  })
  const [resolved, setResolved] = useState(() => resolveTheme(mode))

  function setMode(m) {
    setModeState(m)
    localStorage.setItem(STORAGE_KEY, m)
    setResolved(resolveTheme(m))
  }

  useEffect(() => {
    if (mode !== 'auto') return
    const interval = setInterval(() => setResolved(resolveTheme('auto')), 60000)
    return () => clearInterval(interval)
  }, [mode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
