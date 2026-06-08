// trustdubai/src/sessionTracker.js
// Lightweight visitor-session tracking for Avg Time / Pages-per-visit / Bounce.
// Calls the fn_track_session RPC on load + on each navigation + on a heartbeat.
import { supabase } from './supabase'

const KEY = 'td_session_key'

function getSessionKey() {
  try {
    let k = sessionStorage.getItem(KEY)
    if (!k) {
      k = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9)
      sessionStorage.setItem(KEY, k)
    }
    return k
  } catch (e) {
    // sessionStorage blocked — fall back to a per-load key
    return 's_' + Date.now().toString(36)
  }
}

let started = false
let heartbeat = null

async function ping(isNewPage) {
  try {
    await supabase.rpc('fn_track_session', {
      p_session_key: getSessionKey(),
      p_ip: null, // edge/IP enrichment can be added later
      p_country: null,
      p_user_agent: navigator.userAgent,
      p_page: location.pathname || '/',
      p_is_new_page: !!isNewPage,
    })
  } catch (e) { /* silent — analytics must never break the app */ }
}

// Call once at app start
export function startSessionTracking() {
  if (started) return
  started = true
  ping(false) // create / open session

  // Count a new page on history navigation (SPA)
  const fire = () => ping(true)
  window.addEventListener('popstate', fire)
  const origPush = history.pushState
  history.pushState = function (...args) { origPush.apply(this, args); fire() }

  // Heartbeat every 20s so duration_sec keeps updating while the tab is open
  heartbeat = setInterval(() => { if (document.visibilityState === 'visible') ping(false) }, 20000)

  // Final ping when leaving
  window.addEventListener('beforeunload', () => ping(false))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') ping(false) })
}

// Optional: call manually when your SPA changes "screen" without changing URL
export function trackPageView() { ping(true) }
