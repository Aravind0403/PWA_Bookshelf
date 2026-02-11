# Architecture

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Framework:** Vanilla TS — no framework, pure DOM manipulation
- **Build:** Vite 7.3 + vite-plugin-pwa (Workbox)
- **Auth & DB:** Firebase Auth (email/password) + Firestore
- **Scanning:** @zxing/library (barcode/ISBN)
- **Animations:** canvas-confetti
- **Hosting:** Netlify

## Entry & Routing
- **Entry:** src/main.ts → initStorage() → App.init()
- **Router:** Custom SPA routing via history.pushState() + popstate listener
- **Routes:** `/` (login), `/dashboard`, `/bookshelf`
- **Auth gate:** Firebase onAuthStateChanged() determines view

## Data Layer
- **Storage:** src/storage.ts — Firestore CRUD (books, users, goals)
- **API:** src/api.ts — Google Books API lookup + ISBN validation
- **Session:** localStorage + Firebase Auth for CurrentUser state

## State
- **Local/session state** — no state management library
- **App class** in src/app.ts manages routing and auth state
- **Views** fetch their own data from storage layer on render

## Views (src/views/)
- **LoginView.ts** — sign in / sign up with Firebase Auth
- **DashboardView.ts** — reading stats, goal progress, fun facts
- **BookshelfView.ts** — book grid, search/filter, long-press delete

## Modals (src/modals/)
- **BookDetailModal.ts** — book detail view, status updates, delete
- **ISBNScannerModal.ts** — camera barcode scanning + manual ISBN entry
- **ManualAddModal.ts** — manual book form with cover image upload
- **GoalSetterModal.ts** — yearly reading goal picker

## Utilities
- **src/types.ts** — interfaces & enums (Book, ReadingGoal, ReadingStatus)
- **src/stats.ts** — reading statistics calculations & greeting logic
- **src/funfacts.ts** — fun facts (numbersapi.com + fallback data)
- **src/firebase.ts** — Firebase config & initialization

## Firestore Data Model
```
users/{userID}
  ├── books/{bookID}   → title, author, coverImage, status, isbn, dateAdded, dateCompleted?
  └── goals/current    → yearlyGoal, year, createdAt, lastUpdated
```

## Styling
- **src/styles.css** (~40KB) — library-themed design
- **Palette:** dark brown (#261E1A) + gold (#E6CC80)
- **Fonts:** Merriweather (headings), Nunito (body)
- **Responsive:** mobile-first with breakpoints
