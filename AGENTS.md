<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# school_management_system

## Stack
- **Next.js 16.2.12** (App Router, no `src/` folder — `app/` at root)
- **React 19**, **TypeScript 5**, **Tailwind v4** (CSS-based config via `@theme inline` in CSS, no `tailwind.config.*`)
- **Supabase** auth via `@supabase/ssr` + `@supabase/supabase-js`
- **ESLint v9 flat config** (`eslint.config.mjs`), no Prettier, no testing framework

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint only

## Architecture
- Root layout: `app/layout.tsx` (Geist fonts, `h-full` body)
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server via cookies)
- `middleware.ts` refreshes session on every request; redirects unauthed `/dashboard/*` → `/login`, authed `/login` → `/dashboard`
- Path alias `@/*` → project root

## Database Schema (Supabase/Postgres)

```sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text NOT NULL DEFAULT 'New User',
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
```
