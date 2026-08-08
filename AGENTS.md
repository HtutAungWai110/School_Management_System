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
- Supabase clients: `lib/supabase/browser.client.ts` (browser), `lib/supabase/server.client.ts` (server via cookies)
- `middleware.ts` refreshes session on every request; redirects unauthed `/dashboard/*` → `/login`, authed `/login` → `/dashboard`
- Path alias `@/*` → project root

## Database Schema (Supabase/Postgres)

```sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'New User',
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  phone text,
  address text,
  date_of_birth date
);

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.modules_level (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid REFERENCES levels(id),
  module_id uuid REFERENCES modules(id),
  created_at timestamptz DEFAULT now(),
  required text
);

CREATE TABLE public.student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE CASCADE,
  enrolled_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.batch_level (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid REFERENCES levels(id),
  batch_id uuid REFERENCES batches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.batch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bacth_id uuid REFERENCES batches(id),
  student_id uuid REFERENCES profiles(id),
  assigned_at timestamp DEFAULT CURRENT_TIMESTAMP
);
```

### Relationships
- `profiles` ↔ `auth.users` (1:1, `profiles.id`)
- `modules_level` joins `modules` ↔ `levels` (M:N, with `required` flag)
- `student_enrollments` joins `profiles` ↔ `modules` ↔ `levels`
- `batch_level` joins `batches` ↔ `levels`
- `batch_assignments` joins `batches` ↔ `profiles` (note: column is misspelled `bacth_id` in schema)

## Design Conventions
- Light/dark theme via `next-themes` (`attribute="class"`, `suppressHydrationWarning` on `<html>`). Theme tokens live in `app/globals.css` as CSS vars defined in `:root` and `.dark`, mapped in `@theme inline`.
- Text-label pills/badges (e.g. "Students", "Module name") use `text-on-background/10 bg-primary-fixed/50`.
- `MetricCard` icon chips default to `bg-tertiary-fixed` + `text-on-primary-fixed-variant`; badge defaults to `text-on-background/10 bg-primary-fixed/50` — do not pass per-card overrides.
