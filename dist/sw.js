// trustdubai/public/sw.js
const CACHE = 'trustdubai-v2'
const STATIC = [
  '/',
  '/manifest.json',
  '/favicon.svg',
]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const req = e.request
  const url = new URL(req.url)

  // 1) Only handle GET requests. POST/PUT/etc must never be cached
  //    (this caused the "Request method 'POST' is unsupported" crash).
  if (req.method !== 'GET') return

  // 2) Only handle same-origin requests. Never touch Supabase API,
  //    edge functions, geo-IP services, fonts, or other cross-origin calls.
  if (url.origin !== self.location.origin) return

  // 3) Network-first for same-origin GETs: always try fresh (so new
  //    deploys load immediately), fall back to cache when offline.
  e.respondWith(
    fetch(req)
      .then(res => {
        // only cache successful, basic responses
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone()
          caches.open(CACHE).then(c => {
            try { c.put(req, clone) } catch (err) {}
          })
        }
        return res
      })
      .catch(() => caches.match(req))
  )
})
