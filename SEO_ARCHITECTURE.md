# Beautora SEO Architecture

Canonical host: `https://www.beautora.app` (apex redirects to www).

## 1. URL architecture

| Type | Pattern | Notes |
|------|---------|--------|
| Homepage | `/` | Global brand |
| Commercial hubs | `/salon-management-software`, `/salon-booking-software`, `/salon-pos`, `/salon-crm`, … | Unique intent each |
| Industry | `/software-for-hair-salons`, `/spa-management-software`, … | Unique copy |
| Markets | `/salon-management-software/{market}` | Only published markets with unique local notes |
| Blog | `/blog`, `/blog/{slug}` | Seed posts only |
| Tools | `/tools/...` | Real calculators |
| Directory | `/stores`, `/stores/[slug]`, `/stores/in/[city]` | Local discovery |
| Legacy | `/salon-software`, `/salon-platform` | **301** → hub |

## 2. Metadata architecture

- `lib/seo/metadata.ts` — `buildPageMetadata`, `buildRootMetadata`
- `lib/seo/urls.ts` — `getSiteUrl`, `absoluteUrl`, `canonicalPath`
- `lib/seo/constants.ts` — brand + market/locale lists
- Pages set unique title/description/canonical/OG/Twitter

## 3. Sitemap

`app/sitemap.ts` — homepage, pillars, markets, blog, tools, stores/book/cities. Excludes dashboards/auth/admin.

## 4. Robots

`app/robots.ts` — allow public; disallow app/auth/admin/api/invite; sitemap URL.

## 5. Canonical strategy

Self-referencing via `alternates.canonical` + `metadataBase`. HTTPS www preferred.

## 6. Schema strategy

- Sitewide: Organization, WebSite, SoftwareApplication (no fake ratings)
- FAQ only with visible `FaqSection`
- BreadcrumbList on commercial/blog/tools
- Article on blog posts
- LocalBusiness on public store/book pages
- SearchAction targets `/stores?q=` (directory honors `q`)

## 7. Internal linking

Homepage “Explore by need”, header/footer product links, related blocks on pillars, blog→product, tools→product.

## 8. International SEO

- Default `en` / `en_US`
- `SEO_LOCALES` prepared; **hreflang only when localized pages exist**
- Markets are content pages, not fake hreflang pairs

## 9–13. Blog / tools / country / industry / compare

Documented in `SEO_CONTENT_PLAN.md`. Compare pages deferred until factual content exists.
