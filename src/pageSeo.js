// Title / description / canonical / social tags for the pages that render fixed
// copy: /partner, /claim-company and the three legal routes.
//
// These shipped with no <head> of their own, so they inherited index.html's
// verbatim — including `<link rel="canonical" href="https://www.quvera.ae/">`,
// which tells Google each one is a duplicate of the homepage. /partner and
// /claim-company are in the sitemap, so they were being submitted and then
// folded away.
//
// The two data-driven page types already solve this for themselves (setSEO in
// ServiceArea.jsx and PublicProfile.jsx). This is the same contract for the
// static ones, with the copy in one table so a new static route cannot ship
// without a canonical again.
export const ORIGIN = 'https://www.quvera.ae'

// 1200x630. index.html pointed og:image at the 512x512 app icon while declaring
// twitter:card=summary_large_image, so every share rendered a letterboxed icon.
// og-card.png is the real card — company profiles have always used it.
export const SOCIAL_CARD = ORIGIN + '/og-card.png'

// Copy for each static route. Descriptions are kept inside ~155 characters so
// Google renders them whole; titles inside ~65 for the same reason.
export const STATIC_PAGES = {
  '/partner': {
    title: 'Partner with Quvera | Grow Your Dubai Service Business',
    description:
      'Partner with Quvera to reach verified customers across Dubai. Get qualified leads, a trust-scored profile and free quotation tools for your service business.',
  },
  '/claim-company': {
    title: 'Claim Your Company Profile | Quvera Dubai',
    description:
      'Your Dubai business may already be listed on Quvera. Claim your profile free to manage details, reply to reviews and start receiving customer enquiries.',
  },
  '/terms': {
    title: 'Terms of Service | Quvera',
    description:
      'The terms governing use of Quvera — the Dubai platform for verified home and interior service companies. Operated by RenoFix Plus Technical Contracting L.L.C.',
  },
  '/privacy': {
    title: 'Privacy Policy | Quvera',
    description:
      'How Quvera collects, uses and protects your personal data when you request quotes from verified Dubai service companies, and the rights you have over it.',
  },
  '/refund': {
    title: 'Refund Policy | Quvera',
    description:
      'Quvera’s refund policy for business subscriptions and paid plans — what is refundable, the cancellation window and how to request a refund.',
  },
}

// Writes the tags. Every field is written on every call, both ways, for the same
// reason ServiceArea does it: a client-side navigation must not be able to leave
// one page's canonical or `noindex` behind on the next.
export function applyPageSEO({ title, description, path, image = SOCIAL_CARD, indexable = true }) {
  if (typeof document === 'undefined') return
  const url = ORIGIN + path
  document.title = title

  const set = (name, content, asProperty = false) => {
    const attr = asProperty ? 'property' : 'name'
    let el = document.querySelector(`meta[${attr}="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  set('description', description)
  set('robots', indexable ? 'index, follow' : 'noindex, follow')
  set('og:title', title, true)
  set('og:description', description, true)
  set('og:url', url, true)
  set('og:type', 'website', true)
  set('og:site_name', 'Quvera', true)
  set('og:image', image, true)
  set('twitter:card', 'summary_large_image')
  set('twitter:title', title)
  set('twitter:description', description)
  set('twitter:image', image)

  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

// Convenience for a route whose copy lives in STATIC_PAGES. Unknown paths are a
// no-op rather than a throw — a route added without copy keeps the inherited
// head it has today, and seo-audit.mjs reports it as a missing canonical.
export function applyStaticPageSEO(path) {
  const page = STATIC_PAGES[path]
  if (page) applyPageSEO({ ...page, path })
}
