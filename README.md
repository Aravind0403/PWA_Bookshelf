# My Bookshelf - PWA

A beautiful, modern Progressive Web App for managing your personal book library with reading goal tracking, ISBN barcode scanning, and reading statistics dashboard.

## Features

- 📚 **Book Library Management** - Add, organize, and track your books
- 🎯 **Reading Goals** - Set and track yearly reading goals
- 📊 **Statistics Dashboard** - View your reading progress and stats
- 🔍 **ISBN Scanner** - Add books quickly using ISBN numbers via Google Books API
- 📱 **PWA Support** - Install as an app on your device
- 🎨 **Beautiful UI** - Library-themed design with warm colors and elegant typography

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Sign Up/Login** - Create an account or sign in
2. **Set Reading Goal** - Set how many books you want to read this year (optional)
3. **Add Books** - Use the ISBN scanner or manually add books
4. **Track Progress** - View your reading statistics on the dashboard
5. **Update Status** - Mark books as "To Read", "Reading", or "Completed"

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **IndexedDB** - Client-side database (via idb library)
- **Google Books API** - Fetch book metadata from ISBN
- **PWA** - Progressive Web App capabilities

## Project Structure

```
src/
  ├── views/          # Main view components
  │   ├── LoginView.ts
  │   ├── DashboardView.ts
  │   └── BookshelfView.ts
  ├── modals/         # Modal components
  │   ├── GoalSetterModal.ts
  │   ├── BookDetailModal.ts
  │   ├── ManualAddModal.ts
  │   └── ISBNScannerModal.ts
  ├── types.ts        # TypeScript interfaces
  ├── storage.ts      # Database operations
  ├── stats.ts        # Statistics calculations
  ├── api.ts          # External API calls
  ├── app.ts          # Main app router
  ├── main.ts         # Entry point
  └── styles.css      # Global styles
```

## Design System

The app uses a library-themed color palette with:
- **Primary Colors**: Dark browns and warm tones
- **Accent Colors**: Golden yellows and creams
- **Status Colors**: Blue (To Read), Orange (Reading), Green (Completed)
- **Typography**: Merriweather (serif) for headings, Nunito (sans-serif) for numbers

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

# PWA_Bookshelf
