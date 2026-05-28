# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Voyage is a single-page travel-planning web app deployed as a static site to GitHub Pages. No build step, no framework, no backend. Pure HTML + CSS + vanilla JS, **mobile-first** — the primary target is iPhone Safari opened from the home screen. Desktop layouts work but are a fallback, not the focus.

The deployment target is `github.com/santiagodarian123/Voyage.` (GitHub Pages). Open `index.html` directly in a browser — no dev server needed. There are no tests, lint config, or build commands.

## Architecture

### File layout

```
index.html              All markup + 7 modal templates (no SPA router)
manifest.json           PWA manifest
assets/icons/           favicon, apple-touch-icon, PWA 192px icon
css/base.css            CSS vars (palette, motion curves), reset, typography
css/layout.css          nav, app shell, calendar grid, day panel, FAB, dunes/camel, responsive
css/components.css      cards, buttons, modals, forms, attachments, cover gradients
js/storage.js           KEYS, saveData/loadData, currency, date helpers, export/import — loaded FIRST
js/app.js               all rendering, modal handling, tab routing, feature logic — loaded SECOND
```

JS files are plain `<script>` tags (not modules). All functions are global so inline `onclick="..."` handlers in markup keep working. **Don't convert to ES modules without rewriting every inline handler.**

### Data model

All persistence goes through `localStorage`, keyed via the `KEYS` object in `js/storage.js`:
- `voyage_trips`, `voyage_stops`, `voyage_expenses`, `voyage_budgets`, `voyage_events`, `voyage_places`, `voyage_docs` — arrays of records
- `voyage_active_trip` — single trip ID for the "currently selected" trip
- `voyage_currency`, `voyage_ios_hint_dismissed` — single-value flags

`saveData(key, array)` and `loadData(key)` are the only writers/readers. **Treat `js/storage.js` as the persistence boundary** — if you ever migrate to IndexedDB or a backend, only that file should change.

Records are linked by `tripId`, `eventId`, etc. Deleting a trip cascades to its docs (see `deleteTrip`); some other relations (stops, expenses) are filtered at read time but not cascade-deleted.

### Tab routing

There is no router. `js/app.js` keeps `activeTab` (a string) in module scope. Clicking `.tab-btn[data-tab=...]` toggles `.active` classes on tab buttons + tab content divs and calls `renderTab(tab)`, which dispatches to `renderTrips() / renderItinerary() / renderBudget() / renderEvents() / renderPlaces() / renderCalendar() / renderDocs()`. Each render function rebuilds its tab's HTML from `localStorage`.

After mutating data, the convention is: `saveData(...); render<Thing>(); showToast(...)` — don't try to patch the DOM in place.

### Modals

Each tab has a corresponding modal in `index.html` (`#modal-trip`, `#modal-stop`, etc.). The pattern is:
- `openXModal(id?)` — populates form fields (or clears them for a new record), then calls `openModal('modal-x')`
- `saveX()` — validates, builds the record, writes to `localStorage`, calls the relevant render, closes the modal
- The `+ New X` buttons in markup MUST call `openXModal()` (the setup function), not `openModal('modal-x')` directly — calling `openModal` directly skips form-reset and shows stale state.

Editing state is tracked via `editing<Thing>Id` globals that get reset to `null` after save.

### Cross-tab side effects

A few save flows update other tabs' data — these are intentional and must not be removed:
- Saving an event with `ticketCost > 0` auto-syncs a Sports expense (looked up by `eventId`)
- Deleting a trip removes its docs
- Deleting an event removes the auto-synced expense

When you change anything in `saveEvent`, `deleteEvent`, or `deleteTrip`, re-check these cascades.

### iOS-specific behavior

iOS Safari clears `localStorage` after **7 days of no visits** unless the site is launched from the home screen (`display: standalone`). The `#ios-install-hint` banner (in `index.html`, logic in `app.js`) prompts the user to "Add to Home Screen" — this is the only thing that makes the data durable on iPhone. Plus the Export/Import flow (in the ⚙ Settings menu) as a manual escape hatch.

Form inputs use `font-size: 16px` on mobile — anything smaller triggers iOS's auto-zoom-on-focus, which jolts the layout. Don't shrink it. Modal/FAB/footer paddings use `env(safe-area-inset-bottom)` to clear the iPhone home indicator.

### Settings dropdown

Currency selector + Export/Import live in a single ⚙ button in the nav-right. Markup is built dynamically inside `updateNavTrip()` in `app.js`. Open/close is handled by `toggleSettings()` plus a document-level click listener that closes the menu when clicking outside `.settings-wrap`. If you add new settings, put them inside `#settings-menu` rather than as new top-level nav items.

### Animated background (dunes + camel)

The drifting desert is markup at the top of `<body>` (`.dunes` wrapper) styled in `layout.css`. Three SVG dune layers are 200vw wide and animate `translateX(-100vw)` over different durations for parallax. The wave paths use repeating `T` shorthand at fixed wavelengths so the loop is seamless — **don't change the path coords without recalculating wavelength × translate distance**, or you'll get a visible snap.

The camel is a separate `<svg class="camel">` inside `.dunes`. Position is controlled by `bottom: <n>%` (currently 24%). Walk + bob + leg-swing are three independent keyframes. Respects `prefers-reduced-motion`.

The "Travel smart, spend wiser" tagline used to live in the nav. It now appears as a `<p>` inside the Trips tab header — don't add it back to the nav.

## Conventions

- **Inline `onclick` handlers** are pervasive — preserve them, don't migrate to `addEventListener` piecemeal. If you do, do all of them at once.
- **Inline styles** are used freely for one-off layout (`style="display:flex;gap:6px"` etc.) — match the surrounding style; don't refactor every instance.
- **CSS variables** in `:root` (`base.css`) are the source of truth for colors. Always use `var(--rust)` etc., never hex literals — exceptions are the `.cg-*` cover gradient mixes and very specific hover-darkened states.
- **Motion curves** also in `base.css`: `--ease-silk` (settling), `--ease-spring` (bouncy overshoot), `--ease-snap` (fast hover). Use these instead of bespoke `cubic-bezier` calls.
- **Card actions** (`.card-actions` with edit/delete) are always visible (not hover-revealed) because hover doesn't exist on touch — keep it that way.
- **Mobile breakpoints** in `layout.css`: `@media (max-width: 767px)` is the primary mobile block, `@media (max-width: 380px)` handles iPhone SE / very small phones. Touch targets are 40-44px minimum.

## Deployment

`git push` to the `main` branch. GitHub Pages serves directly from root. No CI, no build artifacts. Test locally by opening `index.html` in Chrome/Edge (with DevTools open) — VS Code's preview pane has known event/CSS quirks and is **not a substitute for a real browser**.
