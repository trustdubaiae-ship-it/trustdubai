// Generates public/sitemap.xml — runs automatically before every build.
// Covers the home page, the 20 broad "[service] in Dubai" pages (highest-volume
// search queries) and all 20x30 service x area landing pages, plus key statics.
// Keep SERVICES / AREAS / slugify in sync with src/pages/ServiceArea.jsx.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ORIGIN = 'https://www.quvera.ae'

const SERVICES = [
  'Interior Design', 'Renovation', 'Fit-Out', 'Kitchen Renovation', 'Bathroom Renovation',
  'Carpentry & Joinery', 'Flooring', 'Painting', 'False Ceiling & Partition', 'AC Service',
  'Plumbing', 'Electrical', 'Cleaning', 'Landscaping', 'Swimming Pool',
  'Handyman', 'Pest Control', 'Smart Home & Automation', 'Curtains & Blinds', 'Waterproofing',
]
const AREAS = [
  'Downtown Dubai', 'Business Bay', 'Dubai Marina', 'Palm Jumeirah', 'Jumeirah Village Circle (JVC)',
  'Jumeirah Lake Towers (JLT)', 'Jumeirah', 'Dubai Hills Estate', 'Arabian Ranches', 'DAMAC Hills',
  'Emirates Hills', 'The Springs', 'The Meadows', 'The Greens', 'Dubai Silicon Oasis',
  'Mirdif', 'Al Barsha', 'Deira', 'Bur Dubai', 'Dubai Investment Park (DIP)',
  'Jumeirah Beach Residence (JBR)', 'DIFC', 'City Walk', 'Al Furjan', 'Discovery Gardens',
  'Motor City', 'Jumeirah Golf Estates', 'Dubailand', 'International City', 'Town Square',
]
const slugify = (s) => s.toLowerCase()
  .replace(/&/g, 'and').replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const today = new Date().toISOString().slice(0, 10)

const urls = []
const add = (path, priority, changefreq = 'weekly') =>
  urls.push({ loc: ORIGIN + path, priority, changefreq })

add('/', '1.0', 'daily')
add('/partner', '0.6', 'monthly')
add('/claim-company', '0.6', 'monthly')

// Broad service pages first — these target the highest-volume queries.
for (const svc of SERVICES) add(`/services/${slugify(svc)}`, '0.9')
// Then every service x area combination.
for (const svc of SERVICES) for (const area of AREAS) add(`/services/${slugify(svc)}-${slugify(area)}`, '0.7')

const body = urls.map(u =>
  `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
).join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '..', 'public', 'sitemap.xml')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, xml)
console.log(`sitemap.xml written: ${urls.length} URLs`)
