# Beautora SEO Implementation Plan

**Product:** Beautora (SyncOps) — salon / beauty-business management SaaS  
**Canonical host:** `https://www.beautora.app` (apex `beautora.app` redirects to www on Vercel)  
**Stack:** Next.js **16.3.4**, App Router, TypeScript, Tailwind  
**Date:** 2026-09-12  
**Principle:** People-first, intent-first. No thin/doorway pages, fake schema, or keyword stuffing.

---

## Phase 1 — Audit summary (current state)

| # | Area | Finding | Severity |
|---|------|---------|----------|
| 1 | Next.js | 16.3.4 | Info |
| 2 | Router | App Router only (`app/`) | Info |
| 3 | Metadata | `buildRootMetadata` + `buildPageMetadata`; marketing layout also sets defaults | Med |
| 4 | Sitemap | `app/sitemap.ts` — marketing + stores/book/cities; no blog/tools/commercial pillars | Med |
| 5 | Robots | Disallows app/auth/admin; allows `/` | OK |
| 6 | Canonical | Relative path + `metadataBase` from `NEXT_PUBLIC_SITE_URL` | OK |
| 7–8 | OG / Twitter | Present; no Twitter site handle | Low |
| 9 | JSON-LD | Site graph + LocalBusiness + FAQ | High issues below |
| 10 | Headings | Generally one H1 per page | OK |
| 11 | Internal links | Header/footer/help; weak commercial pillar graph | Med |
| 12 | noindex | App/auth/platform correctly noindexed | OK |
| 13 | Dynamic | `/stores/[slug]`, `/book/[slug]`, `/stores/in/[city]` | OK |
| 14 | Blog | **None** | Med |
| 15 | Images | Mix of `next/image` and raw `<img>` on store media | Med |
| 16–17 | Perf / CWV | Large hero image, multi fonts, client header/chat | Med |
| 18 | Duplicate meta | Home title may double with template; Pakistan keywords on every page | High |
| 19 | Near-dupes | `/features`, `/salon-platform`, `/salon-software` share modules | High |
| 20 | URLs | Marketing pillars + directory | — |
| 21 | 404 | Useful `not-found.tsx`; few SEO redirects | Low |
| 22 | hreflang | None (monolingual) | Info |
| 23 | Schema accuracy | FAQ schema without visible FAQ; SearchAction `?q=` unused | High |
| 24 | GSC | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` supported | Env |
| 25 | GA4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` supported | Env |

**Positioning problem:** `SITE_SEO` is Pakistan-first (`en-PK`, JazzCash-heavy keywords, “Best Salon Software in Pakistan”). Pakistan is a market, not the global brand identity.

**AI honesty:** Product has optional AI-polished marketing help chat. There is **no** voice/phone AI receptionist. AI pages must not invent capabilities.

---

## Recommended architecture

```
/                              Global homepage (AI-powered salon management)
/salon-management-software     Hub commercial page
/salon-booking-software
/salon-pos
/salon-crm
/salon-staff-management
/salon-inventory-management
/salon-marketing               WhatsApp + feedback + directory (honest)
/salon-ai                      Honest AI / automation positioning
/ai-receptionist               Honest: online booking + help; roadmap clarity
/software-for-*                Industry pages (unique copy each)
/salon-management-software/{market}   Only markets with unique localized copy
/blog                          Article index + posts
/tools                         Calculators (real JS, not fake landings)
/compare/*                     Deferred until factual comparison content exists
```

**Consolidate near-dupes:**
- `301` `/salon-software` → `/salon-management-software`
- `301` `/salon-platform` → `/salon-management-software`
- Keep `/features` as feature overview with links into pillars

**Locale:** Default `en` / OpenGraph `en_US`. Pakistan remains a **market page**, not `htmlLang`.

---

## Files to modify

- `lib/seo/site.ts` — global SITE_SEO, title absolute helper, FAQ scoping, SearchAction fix
- `app/(marketing)/page.tsx` — homepage metadata
- `components/marketing/landing-hero.tsx` — H1/supporting copy (design preserved)
- `components/marketing/site-header.tsx` / `site-footer.tsx` — commercial internal links
- `app/sitemap.ts` — new indexable routes
- `app/robots.ts` — minor private-path hygiene
- `next.config.ts` — 301 redirects for consolidated URLs
- `app/not-found.tsx` — links to new pillars
- Existing FAQ schema call sites — only with visible FAQ
- `stores-directory.tsx` — honor `?q=` for SearchAction honesty

## Files to create

- `SEO_IMPLEMENTATION_PLAN.md` (this file)
- `SEO_ARCHITECTURE.md`
- `SEO_CONTENT_PLAN.md`
- `lib/seo/constants.ts`, `urls.ts`, `metadata.ts`, `schema.ts`, `markets.ts`
- `lib/seo/content/commercial.ts`, `industries.ts`, `blog.ts`
- `components/seo/breadcrumbs.tsx`, `faq-section.tsx`, `commercial-shell.tsx`
- Core + industry + selective market pages under `app/(marketing)/`
- `app/(marketing)/blog/**`
- `app/(marketing)/tools/**` (2 real calculators)
- Compare section: architecture only (no thin fake comparisons yet)

---

## SEO priorities

1. Fix inaccurate schema + metadata bugs  
2. Global brand positioning  
3. Reusable metadata/canonical/schema utilities  
4. Core commercial + industry pages (unique content)  
5. Sitemap / robots / redirects  
6. Internal linking + breadcrumbs  
7. Blog + tools foundations  
8. Selective market pages (not mass cities)  
9. Perf polish (non-breaking)  
10. Documentation  

## Risks

| Risk | Mitigation |
|------|------------|
| Thin country/city spam | Only markets with unique copy in registry |
| Fake AI claims | Honest copy; no voice AI receptionist claims |
| Breaking `/platform` admin | Never use `/platform` for marketing (already `/salon-platform`) |
| Cannibalization | 301 near-dupes; distinct intent per pillar |
| Design regression | Reuse marketing tokens (`--m-*`), not new template look |

## Implementation order

1. Docs + audit ✅  
2. Metadata / canonical / SITE_SEO global  
3. Schema fixes + visible FAQ  
4. Robots + redirects + sitemap  
5. Breadcrumbs + commercial shell  
6. Core commercial pages  
7. Industry pages  
8. Selective markets  
9. Blog architecture + seed posts  
10. Tools (real calculators)  
11. Nav/footer internal links  
12. Homepage copy/metadata  
13. Build / lint verification  

---

## Out of scope this pass

- Hundreds of city pages  
- Fake competitor comparison pages  
- Purchased backlinks / spam  
- Full i18n translations (architecture ready only)  
- Rebuild of visual design system  
