// Hand-written title/meta overrides — the ones a person decided on, keyed by URL
// slug. Everything else falls back to the page's template.
//
// They used to live inside ServiceArea.jsx and PublicProfile.jsx. They are here
// because scripts/gen-seo-overrides.mjs now writes a generated set beside them
// (src/generated/seoOverrides.json, refreshed weekly from Search Console), and
// the two need one clear precedence rule: HAND-WRITTEN ALWAYS WINS. A page tuned
// by hand is never overwritten by the weekly job.
//
// Deliberately free of imports so plain Node scripts can read it without a JSON
// import attribute — the same constraint that keeps serviceLinks.js separate
// from serviceAreas.js.

// /services/<slug> pages.
export const SERVICE_OVERRIDES = {
  // 447 impressions, avg position 27.2, 1.8% CTR — highest-impression page on
  // the site. Ranking is stuck on page 3, so the snippet is doing the work here.
  'interior-design-al-barsha': {
    title: 'Interior Design Al Barsha Dubai | Verified Companies – Quvera',
    description: 'Get matched with top interior design companies in Al Barsha, Dubai. Compare verified fit-out & décor specialists and request a free quote today.',
  },
  // interior-design-dubai-marina and carpentry-and-joinery-downtown-dubai were
  // hand-written here too, and were removed once the template caught up. Both
  // were written to say "verified companies" in a way the old template did not;
  // the template now leads with a real count ("Top 10 Interior Design Companies
  // in Dubai Marina"), which is both the shape that holds page 1 and inside the
  // length Google renders. The hand-written pair had run to 87 and 74 characters
  // with 193- and 180-character descriptions, so they were being cut in the
  // results — the weekly audit is what surfaced that.
}

// /<company-slug> profile pages. The weekly job never generates these — a
// company's title comes from its own row, and a query-derived one could
// contradict it — so this table stays entirely manual.
export const COMPANY_OVERRIDES = {
  // Two queries land here: "osta services" (73 impr, pos 7, 12.3% CTR) and the
  // Arabic "خدمات آسطا | osta services – ac repair & maintenance" (37 impr, pos
  // 9.7). The Arabic one ranks because the DB-derived title carried the Arabic
  // company name, so the override keeps it — dropping it would cost that query.
  'osta-services-ac-repair-maintenance': {
    title: 'Osta Services خدمات آسطا | AC Repair & Maintenance Dubai – Quvera',
    description: 'Book trusted Osta AC repair and maintenance in Dubai. Verified technicians, transparent pricing and same-day service across Dubai. Get a free quote.',
  },
}
