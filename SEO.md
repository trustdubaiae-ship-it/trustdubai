# SEO — how it stays current on its own

Everything here is derived at build time from live data, so nothing needs editing
by hand to stay correct. This document covers what runs, when, and the two
secrets the weekly loop needs.

## The loop

```
every deploy                       every Monday 04:00 UTC
────────────────                   ──────────────────────────────────────────
gen-eligibility.mjs   ──┐          seo-selftest.mjs        (gate — must pass)
gen-seo-overrides.mjs ──┼─ build   gen-seo-overrides.mjs   → commit if changed
gen-sitemap.mjs       ──┘          Vercel deploy hook      → rebuild live site
prerender.mjs                      seo-audit.mjs --live    → seo/report-latest.md
                                   GitHub issue            → the weekly report
```

| Piece | What it decides | Refreshed |
|---|---|---|
| `scripts/gen-eligibility.mjs` | which `/services/` pages have companies, so which are indexable and linkable | every build |
| `scripts/gen-sitemap.mjs` | the sitemap and each URL's `<lastmod>`, from the companies' own `updated_at` | every build |
| `scripts/gen-seo-overrides.mjs` | title/meta for pages Search Console shows underperforming | every build + weekly commit |
| `scripts/prerender.mjs` | static HTML per route, so crawlers read real titles, canonicals and JSON-LD | every build |
| `scripts/seo-audit.mjs` | the weekly report and the technical regression check | weekly |
| `scripts/seo-selftest.mjs` | that the two above still behave, before they touch anything | weekly + on demand |

Run any of it locally:

```bash
npm run seo:test           # offline checks of the generator and the audit rules
npm run seo:overrides      # refresh src/generated/seoOverrides.json (needs GSC)
npm run seo:audit          # audit the live site, write seo/report-latest.md
npm run seo:audit:local    # audit ./dist instead (run a full `npm run build` first)
npm run seo:audit -- --all # every sitemap URL instead of an 80-profile sample
```

## Setting up the two secrets

Both are optional. Without them the weekly job still runs the technical audit and
says in the report which half was unavailable — it never fails a build or a deploy.

### 1. `GSC_SERVICE_ACCOUNT_JSON` — the search data

This is what makes titles follow real queries and puts rankings in the report.

1. In Google Cloud, enable the **Search Console API**, create a service account,
   and download its JSON key.
2. In Search Console → **Settings → Users and permissions**, add the service
   account's `client_email` as a **Full** or **Restricted** user of the property.
3. Add the whole key JSON (raw or base64) as a GitHub Actions secret named
   `GSC_SERVICE_ACCOUNT_JSON`.

The property defaults to `sc-domain:quvera.ae`. If yours is a URL-prefix property
instead, set `GSC_SITE_URL=https://www.quvera.ae/`.

Adding the same value to Vercel's environment variables makes every deploy refresh
the overrides too, not only the Monday run.

### 2. `VERCEL_DEPLOY_HOOK_URL` — the weekly rebuild

Vercel → Project → Settings → Git → **Deploy Hooks** → create one for `main`, then
store the URL as a GitHub Actions secret. Without it the sitemap, `<lastmod>`
values and prerendered HTML only refresh when something else triggers a deploy.

## How the automatic title/meta tuning is kept safe

It writes the text Google shows for a page, so it is deliberately hard to fool.

- **Hand-written always wins.** `src/seoOverrides.js` holds the ones a person
  decided on; the generated file in `src/generated/seoOverrides.json` only fills
  the gaps. Tuning a page by hand permanently opts it out of automation.
- **Service pages only.** Company profile titles are built from the company's own
  row; a query-derived title could contradict it. Candidates for those are
  reported for a human instead of applied.
- **The query has to be about the page's service.** "villa for rent al barsha"
  gets 500 impressions on the interior-design page and is ignored, because it
  shares no word with *interior design* — matching the area alone is not enough.
- **Every candidate is validated**: length bounds, brand present, subject named,
  no URLs, phone numbers or shouting. A rejection leaves the page on its template
  and is listed in the report.
- **Churn guard.** A live override is only replaced when a *different* query
  overtakes its current one by 25%+. Rewriting titles weekly teaches Google
  nothing and throws away the ranking the page just earned.
- **Template version.** Bump `TEMPLATE_VERSION` in `gen-seo-overrides.mjs` when
  the copy templates change, and the next run re-words existing overrides from
  their same sticky query — so a wording fix is not frozen out by the churn guard.
- **The self-test gates the job.** `seo-selftest.mjs` runs first in CI; if it
  fails, nothing is regenerated and nothing is committed.

Tunable through the environment, if the thresholds need to move:
`SEO_MIN_IMPRESSIONS` (60), `SEO_CTR_FLOOR` (0.02), `SEO_POS_MIN` / `SEO_POS_MAX`
(5/60), `SEO_MIN_QUERY_IMPRESSIONS` (15), `SEO_CHURN_RATIO` (1.25),
`SEO_WINDOW_DAYS` (28).

## Reading the weekly report

`seo/report-latest.md` is the current one; `seo/history/<date>.json` keeps the
machine-readable series that each run diffs against. The four sections:

1. **Search performance** — clicks, impressions, CTR and average position against
   the previous 28-day window, the biggest gainers and losers, and two action
   lists: queries sitting at position 11–20 (*striking distance* — one page of
   ranking from real traffic) and pages getting impressions with zero clicks.
2. **Auto-updates applied** — what the override job changed, sitemap size against
   last week, and the live build's own prerender stats.
3. **Technical audit** — errors and warnings across every template/static page and
   a sample of company profiles.
4. **What to do next** — the short list, derived from the two sections above.

### What counts as an error

These cost indexing, not just ranking, and should be fixed the week they appear:

`http-error`, `title-missing`, `description-missing`, `canonical-missing`,
`canonical-mismatch` (a page pointing its canonical at a different URL — this is
what silently removed `/partner` and `/claim-company` from the index),
`noindex-in-sitemap` (we submit a URL and then tell Google not to index it),
`jsonld-invalid`, `sitemap-duplicate`, `sitemap-foreign-host`, `sitemap-empty`.

Everything else (`title-too-long`, `duplicate-title`, `og-image-square`,
`h1-missing`, `thin-content`, …) is a warning: worth working through, not urgent.

## Where the site actually stood, 30 September 2026

A Search Console export is recorded in `seo/gsc-baseline-2026-09-30.json` — by
hand, because the API credentials are not connected. Three months to 27 Sep:

| | Clicks | Impressions | CTR | Position |
|---|---|---|---|---|
| Whole site | 32 | 7,812 | 0.41% | 36.0 |
| Service pages | 9 | 4,477 | 0.20% | 52.3 |
| Company profiles | 23 | 3,864 | 0.60% | 20.6 |
| Desktop | 17 | 5,733 | 0.30% | 43.6 |
| Mobile | 15 | 2,066 | 0.73% | 14.8 |

Two things in that data drive most of the decisions above.

**Impressions fell every week, from 2,307 to 18.** Not a cliff on one day, which
would point at a deploy or a robots change — a steady quarter-long slide, which
is what it looks like when Google shows a new site broadly, then withdraws as it
decides the pages are not worth showing. Average position improved over the same
period (36 to 18), because what is left showing is the part that genuinely fits.
The 175 service pages shipped identical FAQ and intro copy with only the service
and area swapped, so the set read as one page repeated; that is what the
data-carrying FAQs in ServiceArea.jsx are there to fix.

**35 company-name queries sat at position 6 to 12 with 1,066 impressions and
zero clicks** — "lux renov8" alone had 230 at position 9.7. The single exception
is "osta services", the one profile with a hand-written title, at 11% CTR. These
are navigational searches where the company's own site and its Google Business
Profile are also on the page, so they are hard to win; the profile snippet has to
answer the question the searcher actually has, which is whether the company is
licensed and what customers say.

Desktop ranks far worse than mobile (43.6 against 14.8) on three times the
impressions. Worth investigating before spending effort anywhere else.

## The target, and the biggest thing standing in its way

`seo/targets.json` holds ten queries to get onto page 1 by 30 November 2026, with
a checkpoint on 31 October. They were chosen from the Search Console export
because each already sits between position 10 and 26 — one page of movement, on a
page that exists. Head terms like "renovation companies dubai" (position 45-75,
first page held by Clutch, Sortlist, MyBayut and agency listicles) are
deliberately excluded.

Three of the ten point at pages that are currently **noindex**, and that is the
single biggest finding in the export:

| | Pages | Impressions | Avg position |
|---|---|---|---|
| Service pages in the sitemap | 108 | 2,508 | 43.6 |
| Service pages withheld as noindex | 188 | **1,969** | 63.4 |

Forty-four per cent of all service-page demand is landing on pages Quvera tells
Google not to index. `/services/interior-design-emirates-hills` is the clearest
case: 141 impressions at **position 14.5**, the best-placed service page on the
site, and it carries noindex because no company row has "Emirates Hills" as its
area.

The eligibility rule that does this is correct in intent — never index a page
with nothing on it. What the data shows is that the rule is measuring the wrong
thing: a Dubai contractor's area field is where its office is, not where it will
work. Whether those pages should list the same service's companies from nearby
areas is a product decision about what a customer is promised, not a technical
one, so it is not made here.

## Things measured and deliberately not done

Recorded so they are not re-attempted blind — see the long comments in
`index.html` for the numbers:

- Self-hosting the body font scored **worse** (65 → 39).
- Taking the icon-font stylesheet off the critical path scored worse twice
  (58 → 37), because the page then repaints in a fallback font.
- `FAQPage` schema stays on service pages as context, but since August 2023
  Google only shows FAQ rich results for authoritative government and health
  sites — do not expect CTR from it.
