# MSN Messenger Clone - Project Structure

## Directory Structure

```
spirit-messenger/
├── src/
│   ├── components/      # React components
│   ├── lib/            # Utility functions, services, and helpers
│   │   └── supabase.ts # Supabase client configuration
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts    # Core type definitions
│   ├── styles/         # Additional CSS files
│   ├── assets/         # Static assets (images, icons)
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles with Tailwind directives
├── src-tauri/          # Tauri Rust backend
├── public/             # Public static assets
├── .env.example        # Environment variables template
└── package.json        # Project dependencies
```

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: TailwindCSS 4
- **Desktop Framework**: Tauri 2
- **Backend**: Supabase (PostgreSQL, Realtime, Auth, Storage)
- **State Management**: Zustand
- **Build Tool**: Vite 7

## Getting Started

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development server:
   ```bash
   pnpm tauri dev
   ```

## Path Aliases

The project uses path aliases for cleaner imports:

- `@/*` → `./src/*`
- `@/components/*` → `./src/components/*`
- `@/lib/*` → `./src/lib/*`
- `@/types/*` → `./src/types/*`
- `@/styles/*` → `./src/styles/*`

Example usage:
```typescript
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
```

## MSN Messenger Color Palette

The following custom colors are available in TailwindCSS (defined in `src/index.css` using Tailwind v4's `@theme` directive):

- `bg-msn-blue` / `text-msn-blue`: #0066CC (Primary blue)
- `bg-msn-light-blue` / `text-msn-light-blue`: #E6F2FF (Light blue background)
- `bg-msn-bg` / `text-msn-bg`: #ECE9D8 (Window background)
- `bg-msn-online` / `text-msn-online`: #00CC00 (Online status)
- `bg-msn-away` / `text-msn-away`: #FF9900 (Away status)
- `bg-msn-busy` / `text-msn-busy`: #CC0000 (Busy status)

## Font Configuration

The project uses the classic MSN Messenger font stack:
- Primary: Tahoma
- Fallback: Arial, sans-serif

Access via TailwindCSS: `font-msn`

## Tailwind CSS v4

This project uses Tailwind CSS v4, which has a different configuration approach:
- No `tailwind.config.js` file needed
- Theme customization is done via CSS using the `@theme` directive in `src/index.css`
- Import Tailwind with `@import "tailwindcss";` instead of `@tailwind` directives
