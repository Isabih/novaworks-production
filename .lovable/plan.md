# NovaWorks Site Overhaul Plan

This is a large set of related changes. Breaking it into focused work streams so each piece lands cleanly.

## 1. Site Header / Navigation

- Make `SiteHeader` **always solid dark** (not transparent) so it stays readable on white/light page backgrounds (Contact, Properties list, etc.).
- Convert nav into a **mega nav bar** matching the reference image:
  - **Properties** opens a mega panel with featured cards (Apartments / Luxury Apts / Buildings) on the left and link columns (Long-Term Rentals, Short-Stay & Furnished, Corporate Housing, Serviced Apartments, All listings, All buildings) on the right.
  - Rename **Services → What We Do** (with submenu: Manage, Rent, Sell, Buy).
  - Rename **About → Who We Are**.
- Keep Home, Buy, Invest, Portfolio, Blog, Investors, Contact, List Property, search, theme, notifications, profile.

## 2. Hero Section

- Darken the hero background overlay (stronger gradient) so text/buttons pop more.
- Fix the **search shortcut card** at the bottom that's being clipped — ensure it sits fully above the fold without being cut off by the section below (add bottom padding to hero or `z-index`/translate fix).
- **Watch Story** button: clicking it opens a fullscreen/inline video that plays as background (modal player using existing `VideoPlayer`). Admin can configure the video URL via app settings.
- Stylize "PREMIUM PROPERTIES / YEARS EXPERIENCE / PROPERTY MANAGED" labels to match the elegant serif/uppercase styling in the reference.

## 3. Property of the Day

- New homepage section "Luxury Living Redefined" featuring one **Property of the Day** chosen by IT/Admin (sticky until replaced).
- DB: add `property_of_the_day` table (single row) with `property_id`, `updated_at`, `updated_by`. RLS + GRANTs. Public SELECT allowed.
- New server functions: `getPropertyOfTheDay`, `setPropertyOfTheDay` (auth-protected, IT/admin only).
- Homepage renders the selected property with hero image, beds/baths/sqm, amenities, "View Details" CTA — matching the reference layout.
- Dashboard: new page `/dashboard/it/property-of-the-day` to pick the property from existing listings.

## 4. Dashboard — Featured/New Media Selection

- New dashboard page where IT can **select which images/videos appear as "new" / featured** on the homepage instead of always defaulting to the same set.
- DB: `featured_media` table (id, media_url, media_type, position, active). RLS + GRANTs.
- Homepage "new" section reads from this table; dashboard page lets IT upload/select and reorder.

## 5. Contact Page

- Add **CEO card** at top with photo, name, title, and motivational quote — in an elegant "professional frame" (gold border, soft shadow, serif title).
- Add **3 team member cards** below with photos, names, roles — same framed style.
- Keep the existing form + map + departments below.

## 6. Auth Page Side Image

- Darken the side image overlay on the login/auth page (stronger gradient) for better text contrast.

## Technical Details

**Files to create:**
- `mysql/schema.sql` — MySQL tables and indexes
- `src/lib/property-of-day.functions.ts` — get/set server fns
- `src/lib/featured-media.functions.ts` — list/add/remove/reorder server fns
- `src/components/site/MegaNav.tsx` — mega nav panels
- `src/components/site/PropertyOfTheDay.tsx` — homepage section
- `src/components/site/CeoCard.tsx`, `src/components/site/TeamMember.tsx`
- `src/components/site/WatchStoryModal.tsx` — video modal
- `src/routes/_authenticated/dashboard.it.property-of-the-day.tsx`
- `src/routes/_authenticated/dashboard.it.featured-media.tsx`

**Files to edit:**
- `src/components/site/SiteHeader.tsx` — solid bg, mega nav, rename items
- `src/routes/_site.index.tsx` — darker hero, fix search card clipping, integrate Property of the Day, Watch Story modal, restyle stats
- `src/routes/_site.contact.tsx` — CEO + team cards at top
- `src/routes/_site.services.tsx` — rename copy to "What We Do" with Manage/Rent/Sell/Buy sections
- `src/routes/_site.about.tsx` — rename copy to "Who We Are"
- `src/routes/auth.tsx` — darker side image overlay
- `src/routes/_authenticated/dashboard.it.settings.tsx` — add new sidebar links

## Open Questions

1. **CEO + team details**: I don't have photos, names, titles, or the CEO's motivational quote. Should I use placeholder names/avatars for now (so you can edit them later via dashboard), or do you want to provide the real content first?
2. **Watch Story video URL**: any video URL to default to, or should it just show "Coming soon" until admin uploads one?
3. **Featured "new" media on homepage**: which existing section on the homepage should this control? (the property cards grid, or a separate "New on NovaWorks" strip?)

I can start building the navigation, hero fixes, auth darkening, and Property of the Day immediately while you answer the above for the CEO/team and video pieces. Proceed?
