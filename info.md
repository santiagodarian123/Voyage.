# File Structure

```
voyage/
├── index.html              ← All markup, 7 modals, links to CSS/JS  (611 lines)
├── manifest.json           ← PWA manifest (name, theme color, icons)
├── README.md               ← Repo title only
├── CLAUDE.md               ← Architecture + conventions for future devs
├── assets/
│   └── icons/
│       ├── favicon.svg              ← Browser tab icon (cloud silhouette)
│       ├── apple-touch-icon.svg     ← iPhone home-screen icon (180×180)
│       └── icon-192.svg             ← PWA install icon (192×192)
├── css/
│   ├── base.css            ← CSS variables (palette, motion curves), reset, typography  (30 lines)
│   ├── layout.css          ← Nav, app shell, calendar grid, day panel, FAB, dunes/camel, mobile media queries  (317 lines)
│   └── components.css      ← Cards, buttons, modals, forms, attachments, cover gradients  (234 lines)
└── js/
    ├── storage.js          ← KEYS, saveData/loadData, currency, date helpers, export/import  (95 lines, loaded FIRST)
    └── app.js              ← All rendering, modal handling, tab routing, feature logic  (971 lines, loaded SECOND)
```

## What lives where

### `index.html` (top to bottom)
1. `<head>` — meta, manifest, fonts, CSS includes (with `?v=N` cache-busting)
2. **Animated dunes** — three SVG layers + camel silhouette
3. **iOS install hint** — banner shown only on iPhone Safari, first visit
4. **Top nav** — logo, tab strip (desktop only), settings ⚙
5. **App tabs** — 7 `<div class="tab-content">` blocks (Trips, Itinerary, Budget, Events, Places, Docs, Calendar)
6. **Day panel** — slide-in panel for calendar day details
7. **FAB** — floating + button (bottom-right)
8. **Toast container** — empty, populated dynamically
9. **7 modals** — Trip, Stop, Expense, Event, Place
10. **Bottom tab bar + More sheet** — mobile only
11. **Footer** — dev credit (top-right corner on mobile, centered on desktop)
12. `<script>` includes (storage.js, then app.js — order matters)

### `css/base.css`
- `:root` CSS variables: palette (`--rust`, `--gold`, `--teal`...), motion curves (`--ease-silk`, `--ease-spring`, `--ease-snap`)
- Reset, html/body typography, focus outline

### `css/layout.css`
- Bottom tab bar + More sheet rules (default `display: none`, enabled inside the mobile media query)
- Top nav (logo, tabs, settings)
- App shell (`#app`, `.tab-content`, `.section-header`)
- Calendar grid + day panel
- FAB + toast positioning
- Animated dunes + camel keyframes
- iOS install hint
- Site footer
- `@media (max-width: 767px)` — primary mobile block (largest section in the file)
- `@media (max-width: 380px)` — iPhone SE / very small phones

### `css/components.css`
- Cards (trip, place, event, stop) + cover gradients (`.cg-0` through `.cg-7`)
- Buttons (`.btn`, `.btn-primary`, `.btn-ghost`, `.btn-teal`, `.btn-data`, `.icon-btn`)
- Form controls (inputs, selects, textareas, color swatches, star selector, status toggle)
- Modals + bottom-sheet variant
- Itinerary timeline (day sections, stops, category badges)
- Budget summary cards + expense list
- Places filters
- Attachment drop zones + items

### `js/storage.js` (loaded first, all globals)
- `KEYS` — localStorage key map
- `saveData(key, array)` / `loadData(key)` — only writers/readers
- `generateId()`
- `getActiveTrip()` / `setActiveTrip(id)` — also auto-switches active currency
- `CURRENCIES` map + `activeCurrency` + `fmt(n)` + `setCurrency(code)` + `updateCurrencyPrefixes()`
- Date helpers: `formatDate`, `formatDateRange`, `daysBetween`, `daysUntil`, `getDayOfWeek`, `todayStr`
- `exportData()` / `importData(input)` — JSON backup roundtrip

### `js/app.js` (loaded second, depends on storage.js)
Sections, in file order:
1. **Toast** — `showToast(msg, type)`
2. **Modal** — `openModal`, `closeModal`, `backdropClose`, Escape-key handler
3. **Tabs** — `setActiveTab(tab)`, `renderTab(tab)` dispatcher
4. **FAB** — `fabClick()` routes to the right modal based on `activeTab`
5. **Settings dropdown** — `toggleSettings()`
6. **More sheet** — `toggleMoreSheet()`, `closeMoreSheet()`
7. **Nav** — `updateNavTrip()`, `deselectTrip()`, `tripXClick()`
8. **Color swatches + cover image** — for trip modal
9. **Trips** — `openTripModal`, `saveTrip`, `deleteTrip`, `renderTrips`, `selectTrip`
10. **Itinerary** — `openStopModal`, `saveStop`, `deleteStop`, `reorderStop`, `renderItinerary`, `toggleMap`, `fmtTime`
11. **Budget** — `openExpenseModal`, `saveExpense`, `deleteExpense`, `setBudgetForCat`, `renderBudget`
12. **Events** — `openEventModal`, `handleEventImage`, `clearEventImage`, `saveEvent`, `deleteEvent`, `renderEvents`, `populateTripSelects`
13. **Places** — filters, `openPlaceModal`, `savePlace`, `deletePlace`, `ratePlace`, `renderPlaces`, `setStatus`, `selectStars`
14. **Calendar** — `calPrev/calNext/renderCalendar`, `openDayPanel`, `closePanel`
15. **Delete confirm** — `confirmDelete`, `doDelete`
16. **Helpers** — `shake`, `esc`
17. **Event attachments** — `addEvtLink`, `handleEvtDrop/Files`, `renderEvtAttachments`, `removeEvtAttachment`
18. **Docs** — `addDoc`, `handleDocDrop/Files`, `removeDoc`, `renderDocs`
19. **Shared attachment helpers** — `readFilesIntoAttachments`, `attachItemHTML`, `fileIcon`
20. **iOS install hint** — `dismissIosHint`, `maybeShowIosHint`
21. **Init** — last 7 lines, calls all the initial render functions

## Load order

```
1. base.css        ← variables first so other files can use them
2. layout.css      ← layout depends on variables
3. components.css  ← components depend on layout context

4. storage.js      ← KEYS, helpers — must load before app.js
5. app.js          ← uses everything from storage.js, then runs init at the bottom
```

All five files have `?v=N` cache-busting query strings on their `<link>` / `<script>` tags. **Bump N on every release.** See CLAUDE.md → Deployment for the recipe.
