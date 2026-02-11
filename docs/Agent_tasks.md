# Codebase Audit

## 1. Architecture Summary

**Type:** Vanilla TypeScript SPA (no framework)
**Build:** Vite 7.3 + vite-plugin-pwa
**Backend:** Firebase Auth (email/password) + Firestore
**Hosting:** Netlify

### Flow
```
index.html → src/main.ts → initStorage() → new App().init()
                                              ↓
                                   onAuthStateChanged(auth)
                                     ↓              ↓
                               LoginView     DashboardView / BookshelfView
                                              ↓
                                   Modals (BookDetail, ISBNScanner, ManualAdd, GoalSetter)
```

### Layers
| Layer | Files | Responsibility |
|-------|-------|----------------|
| Entry | `main.ts` | Bootstrap app |
| Router/Shell | `app.ts` | SPA routing via `history.pushState`, auth gate |
| Views | `views/LoginView.ts`, `DashboardView.ts`, `BookshelfView.ts` | Page-level UI, data fetching, DOM rendering |
| Modals | `modals/BookDetailModal.ts`, `ISBNScannerModal.ts`, `ManualAddModal.ts`, `GoalSetterModal.ts` | Overlay UI for CRUD actions |
| Data | `storage.ts` | Firestore CRUD + localStorage session |
| API | `api.ts` | Google Books API + ISBN validation |
| Utils | `types.ts`, `stats.ts`, `funfacts.ts`, `firebase.ts` | Types, calculations, config |
| Styles | `styles.css` (~2139 lines) | Single monolithic stylesheet |

### Data Model (Firestore)
```
users/{userID}
  ├── books/{bookID}   → title, author, coverImage, status, isbn, dateAdded, dateCompleted
  └── goals/current    → yearlyGoal, year, createdAt, lastUpdated
```

---

## 2. Current Design Patterns

| Pattern | Where | Notes |
|---------|-------|-------|
| **Class-based views** | All views and modals | Each class has `show()`/`render()`, `getHTML()`, `attachEventListeners()`, `close()` |
| **Template literal HTML** | `getHTML()` methods | HTML generated as strings via backtick templates, set via `innerHTML` |
| **Manual DOM event binding** | `attachEventListeners()` | `querySelector` + `addEventListener` after innerHTML insertion |
| **Singleton export** | `app.ts` → `export const app = new App()` | Views import singleton for navigation (`app.navigate()`) |
| **Firebase observer** | `app.ts` → `onAuthStateChanged` | Auth state drives routing decisions |
| **Repository pattern (loose)** | `storage.ts` | CRUD functions per entity (books, goals, users) |
| **Overlay modal pattern** | All modals | Create overlay div → append to body → remove on close |
| **Callback-based communication** | `onClose`, `onUpdate` params | Parent passes callback; modal calls it after action |
| **CSS custom properties** | `styles.css` `:root` | Design tokens for colors, spacing, radius, shadows |
| **Progressive enhancement** | PWA manifest + service worker | Offline-capable via Workbox |

---

## 3. Code Smells

### Critical
1. **XSS via innerHTML** — Book titles, author names, and user input are interpolated directly into HTML template strings without sanitization (`${book.title}`, `${book.author}`). Any malicious content in Firestore would execute as HTML/JS.

2. **Dual App instantiation** — `main.ts` creates `new App()` while `app.ts` exports `const app = new App()`. Views import the singleton from `app.ts`, but `main.ts` initializes a different instance. Two App instances listen to `onAuthStateChanged` independently.

3. **Base64 images in Firestore** — `ManualAddModal` stores cover images as full base64 data URLs via `FileReader.readAsDataURL`. Firestore documents have a 1MB limit; large images will silently fail or bloat reads.

### High
4. **No view lifecycle management** — `DashboardView` creates a `setInterval` for fun facts but `destroy()` is never called by `App.render()`. Intervals leak on every navigation away and back.

5. **Duplicate CSS rules** — Scanner tabs (`.scanner-tabs`, `.tab-btn`), status buttons (`.status-buttons`, `.status-btn`), and `#reader` rules appear 2-3 times in `styles.css`. Conflicting or overriding values.

6. **`any` types throughout** — `convertDates` helper, `getGoalProgressHTML(stats: any)`, catch blocks with `error: any`. Defeats TypeScript's purpose.

7. **Inconsistent error handling** — `alert()` in BookshelfView, `console.error` in modals, inline error elements in ISBNScanner, silent failures in GoalSetter. No unified approach.

### Medium
8. **`NodeJS.Timeout` in browser code** — `BookshelfView.ts` uses `NodeJS.Timeout` type for `setTimeout`. Should be `ReturnType<typeof setTimeout>` or `number`.

9. **`initStorage()` is a no-op** — Called in `main.ts` but the function body is empty. Dead code.

10. **Mixed concerns in `setCurrentUser(null)`** — Calling `setCurrentUser(null)` triggers `signOut(auth)`. A setter that has side effects on Firebase auth is surprising.

11. **`calculateStats()` marked async unnecessarily** — No `await` inside. Returns `Promise<ReadingStats>` when it could return `ReadingStats` directly.

12. **Fun facts over HTTP** — `funfacts.ts` fetches from `http://numbersapi.com/random/trivia` (not HTTPS). Mixed content on HTTPS sites will be blocked by browsers.

13. **Fetch ALL books for duplicate check** — `ISBNScannerModal.searchBook()` calls `getBooks(userId)` (fetching every book) just to check for duplicates. Should use a Firestore query.

14. **`GoalSetterModal` overwrites `createdAt`** — Always sets `createdAt: new Date()` on save, even when updating an existing goal.

15. **SVG icon duplication** — Same SVG paths for book, checkmark, trash icons copied across 4+ files.

16. **LoginView re-renders entire DOM on tab switch** — Toggling sign-in/sign-up destroys and recreates the entire view including floating book animations.

17. **No keyboard/focus management in modals** — Modals don't trap focus, don't restore focus on close, and don't respond to Escape key.

---

## 4. Top 10 Refactor Opportunities

Ranked by **impact × (1/effort)**. Higher = more value per unit of work.

| # | Refactor | Impact | Effort | Why |
|---|----------|--------|--------|-----|
| 1 | **Fix dual App instantiation** | High | Low | `main.ts` should import and use the singleton from `app.ts` instead of creating its own. One-line fix that eliminates a class of ghost bugs (duplicate auth listeners, duplicate renders). |
| 2 | **Sanitize HTML output** | Critical | Low-Med | Create a `escapeHTML()` utility and apply to all user-supplied values in template literals. Prevents XSS. Alternatively, switch to `textContent`/`createElement` for dynamic values. |
| 3 | **Add view lifecycle (destroy/cleanup)** | High | Low | `App.render()` should call `destroy()` on the current view before rendering the next. `DashboardView` already has `destroy()`; add it to other views. Fixes interval/listener leaks. |
| 4 | **Deduplicate CSS** | Med | Low | Remove the ~200 lines of duplicate rules in `styles.css`. Reduces file size and eliminates style conflicts. Simple search-and-delete. |
| 5 | **Replace `any` with proper types** | Med | Low | Type `convertDates` return, `stats` param, and error catches. ~10 occurrences. Improves IDE support and catches bugs. |
| 6 | **Extract shared Icon component/map** | Med | Med | Create an `icons.ts` module exporting SVG strings by name. Replace inline SVGs across all files. Reduces duplication by ~500 lines and makes icon changes single-source. |
| 7 | **Unify error handling pattern** | Med | Med | Create a `showToast(message, type)` utility. Replace `alert()`, `console.error`-only, and ad-hoc error divs with consistent toast notifications. |
| 8 | **Add modal accessibility** | High | Med | Trap focus inside modal, restore focus on close, close on Escape, add `role="dialog"` and `aria-modal="true"`. Affects all 4 modals — can be done once in a base class or shared utility. |
| 9 | **Move cover images to Firebase Storage** | High | High | Replace base64 data URL storage with Firebase Storage upload + URL reference. Prevents Firestore document size issues and improves load performance. Requires migration. |
| 10 | **Split `styles.css` into modules** | Med | Med | Break the monolithic 2139-line CSS into per-view/modal CSS modules or adopt CSS-in-JS. Improves maintainability and enables Vite's CSS code-splitting. |

---

## Implementation Order (Suggested Phases)

**Phase 1 — Quick wins (1 PR):** Items 1, 3, 4, 5
**Phase 2 — Security & UX (1 PR):** Items 2, 7, 8
**Phase 3 — Architecture (1-2 PRs):** Items 6, 10
**Phase 4 — Infrastructure (1 PR):** Item 9
