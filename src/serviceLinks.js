// Where a category label should link to, shared by every page that renders one.
//
// Lives in its own module rather than in serviceAreas.js because it needs
// generated/eligibility.json, and serviceAreas.js is also imported by
// scripts/prerender.mjs in plain Node — keeping this module browser-only avoids
// putting a JSON import attribute in that path.
import { slugify, resolveServices, resolveArea } from './serviceAreas'
import ELIGIBILITY from './generated/eligibility.json'

// A DB category label -> the /services/ page that should carry its link, or null.
//
// Goes through resolveServices so the category-table rename aliases are honoured
// ('HVAC & AC' -> 'AC Service', 'Flooring & Tiling' -> 'Flooring'), and through
// ELIGIBILITY so nothing ever links to a service with no companies behind it —
// those pages render an empty state and carry noindex, so linking them would
// spend internal authority on a dead end.
export function serviceHrefFor(label) {
  for (const svc of resolveServices({ category: label })) {
    if (ELIGIBILITY.services.includes(svc)) return '/services/' + slugify(svc)
  }
  return null
}

// The same resolution, but returning the service's display name alongside the
// href — breadcrumbs need the label ('AC Service'), not just the URL.
export function serviceLinkFor(label) {
  for (const svc of resolveServices({ category: label })) {
    if (ELIGIBILITY.services.includes(svc)) return { service: svc, href: '/services/' + slugify(svc) }
  }
  return null
}

// The service pages a single company belongs to: its broad service page, plus
// its service x area page when that combination has companies. Used to give the
// 1,089 profile pages outbound links — the link graph was previously one-way
// (nothing in, nothing out), so the commercial pages got no reinforcement back.
//
// Note the prerender map collapses `area` into `location` (scripts/prerender.mjs
// stores `location: r.location || r.area`), so both are read here.
export function companyLinks(company) {
  const link = serviceLinkFor(company.category)
  if (!link) return []
  const out = [{ label: `${link.service} companies in Dubai`, href: link.href }]
  const area = resolveArea(company.area || company.location)
  if (area) {
    const slug = `${slugify(link.service)}-${slugify(area)}`
    if (ELIGIBILITY.combos[slug]) out.push({ label: `${link.service} in ${area}`, href: '/services/' + slug })
  }
  return out
}
