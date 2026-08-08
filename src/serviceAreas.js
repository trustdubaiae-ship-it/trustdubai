// Service + area vocabulary for /services/:serviceArea, and the slug helpers
// around it. Lives in its own module because scripts/prerender.mjs needs the
// exact same lists to build each page's seed in Node — keeping a second copy
// there would drift the moment a service or area is added.

/* 20 services + 30 areas — must match DB categories & company areas */
export const SERVICES = [
  'Interior Design','Renovation','Fit-Out','Kitchen Renovation','Bathroom Renovation',
  'Carpentry & Joinery','Flooring','Painting','False Ceiling & Partition','AC Service',
  'Plumbing','Electrical','Cleaning','Landscaping','Swimming Pool',
  'Handyman','Pest Control','Smart Home & Automation','Curtains & Blinds','Waterproofing',
]

export const AREAS = [
  'Downtown Dubai','Business Bay','Dubai Marina','Palm Jumeirah','Jumeirah Village Circle (JVC)',
  'Jumeirah Lake Towers (JLT)','Jumeirah','Dubai Hills Estate','Arabian Ranches','DAMAC Hills',
  'Emirates Hills','The Springs','The Meadows','The Greens','Dubai Silicon Oasis',
  'Mirdif','Al Barsha','Deira','Bur Dubai','Dubai Investment Park (DIP)',
  'Jumeirah Beach Residence (JBR)','DIFC','City Walk','Al Furjan','Discovery Gardens',
  'Motor City','Jumeirah Golf Estates','Dubailand','International City','Town Square',
]

export const slugify = (s) => s.toLowerCase()
  .replace(/&/g,'and').replace(/[()]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')

// Resolve a URL slug (e.g. "interior-design-business-bay") back to {service, area}
export function resolveSlug(slug) {
  if (!slug) return { service: null, area: null }
  for (const svc of SERVICES) {
    const sSlug = slugify(svc)
    if (slug === sSlug || slug.startsWith(sSlug + '-')) {
      const rest = slug === sSlug ? '' : slug.slice(sSlug.length + 1)
      if (!rest) return { service: svc, area: null }
      for (const ar of AREAS) {
        if (slugify(ar) === rest) return { service: svc, area: ar }
      }
      return { service: svc, area: null }
    }
  }
  return { service: null, area: null }
}

// The company set a /services/:slug page lists. Kept here so prerender.mjs can
// produce byte-identical results to what ServiceArea.jsx renders at runtime.
export function selectCompanies(rows, service, area) {
  let out = (rows || []).filter(c =>
    c.category === service || (Array.isArray(c.categories) && c.categories.includes(service))
  )
  if (area) {
    out = out.filter(c => (c.area || c.location || '').trim().toLowerCase() === area.toLowerCase())
  }
  return out.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
}
