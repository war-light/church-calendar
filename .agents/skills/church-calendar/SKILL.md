---
name: church-calendar
description: "Use when working on this church calendar codebase. Covers architecture, data model, components, Supabase schema, scheduling algorithm, and common development tasks."
metadata:
  author: david
  version: "0.1.0"
---

# Church Department Calendar

## What This Is

An internal tool for scheduling a ~5-person church department across three weekly events (Wednesday, Friday, Saturday). Admins edit the roster and assignments; everyone else views a read-only monthly grid. Deployed to GitHub Pages (static, free-tier).

## Tech Stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Frontend   | React 19 + TypeScript, Vite             |
| Styling    | Tailwind CSS v4 + ShadCN components     |
| State      | React Context (data) + Zustand (theme)  |
| Backend    | Supabase (Postgres + Auth + RLS)        |
| DnD        | @dnd-kit/core                           |
| PNG export | html-to-image                           |
| Hosting    | GitHub Pages via GitHub Actions         |

No custom backend server. All data lives in Supabase. Auth is a single shared admin account (one email + password, all editors use the same credentials).

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root layout, DnD context, header, main content
├── components/
│   ├── CalendarGrid.tsx        # Monthly grid (Wed/Fri/Sat columns, week rows)
│   ├── DayCell.tsx             # Single day cell with assignment slots
│   ├── MemberSidebar.tsx       # Right sidebar: roster list, drag source, add/remove
│   ├── MemberManager.tsx       # Dialog for managing members (admin-only)
│   ├── MonthPicker.tsx         # Month selector + create new month
│   ├── ReshuffleButton.tsx     # Randomize / Lock All / Clear All actions
│   ├── ExportButton.tsx        # PNG export of the calendar grid
│   ├── LoginForm.tsx           # Admin passcode dialog
│   └── ui/                     # ShadCN primitives (Button, Card, Dialog, etc.)
├── context/
│   ├── AppProviders.tsx        # Composes all context providers
│   ├── AuthContext.tsx          # Supabase Auth session, signIn/signOut
│   ├── MembersContext.tsx       # Active members CRUD
│   ├── MonthsContext.tsx        # Month records, createMonth with auto-generated assignments
│   ├── AssignmentsContext.tsx   # Assignments for selected month, update/toggleLock/regenerate/clear
│   └── DayConfigsContext.tsx    # Slot counts per event type (from day_configs table)
├── hooks/
│   └── useThemeStore.ts        # Zustand store for dark/light/system theme (persisted)
├── lib/
│   ├── supabase.ts             # Supabase client init (reads VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   ├── algorithm.ts            # Scheduling algorithm (weighted round-robin)
│   ├── algorithm.test.ts       # Unit tests for the algorithm (node:test)
│   ├── dateUtils.ts            # getDaysInMonth() → DaySpec[] for Wed/Fri/Sat
│   ├── memberColors.ts         # Deterministic per-member color assignment
│   ├── adminConfig.ts          # Reads VITE_ADMIN_EMAIL env var
│   └── utils.ts                # General utilities (cn for Tailwind class merging)
├── types/
│   └── index.ts                # Member, Assignment, MonthRecord, DaySpec, EventType
└── styles/
    └── index.css               # Tailwind entrypoint
```

## Data Model (Supabase)

### Tables

**`members`** — Department roster
- `id` (uuid, pk), `name` (text), `active` (bool), `created_at` (timestamptz)
- Soft-delete: `removeMember` sets `active = false`, never deletes rows

**`months`** — One record per scheduled month
- `id` (uuid, pk), `year` (int), `month` (int 1-12), `is_current` (bool)
- Unique constraint on `(year, month)`

**`assignments`** — One row per slot per day
- `id` (uuid, pk), `month_id` (uuid → months), `day_date` (date), `event_type` (enum), `member_id` (uuid → members, nullable), `locked` (bool)
- Each day has N slots based on event type (Wed=2, Fri=2, Sat=3, special=1)

**`day_configs`** — Configurable slot counts per event type
- `id` (uuid, pk), `event_type` (enum, unique), `slot_count` (int)
- Defaults: wednesday=2, friday=2, saturday=3, special=1

**`event_type` enum**: `wednesday`, `friday`, `saturday`, `special`

### RLS Policies

- **Read**: Public (anon + authenticated) can SELECT from all tables
- **Write**: Only `authenticated` role can INSERT/UPDATE/DELETE (single shared admin account)

## Scheduling Algorithm (`src/lib/algorithm.ts`)

`generateMonthAssignments(daysInMonth, members, existingAssignments, slotCounts)` → `Assignment[]`

1. Filter to active members only
2. Seed per-member assignment counts from locked assignments
3. For each day:
   - **Pass 1**: Keep all locked slots unchanged
   - **Pass 2**: Fill unlocked slots via weighted round-robin — always pick from member(s) with the lowest current count, break ties randomly
4. Never assign the same member twice on the same day
5. If all members are already assigned today but slots remain (members < required slots), fall back to all active members

Key invariant: distribution stays balanced (max - min ≤ 1 across active members).

## Context Architecture

Providers compose in this order (outermost first):

```
TooltipProvider
  └─ AppProviders
       ├─ AuthProvider
       │    └─ DayConfigsProvider
       │         └─ MembersProvider
       │              └─ MonthsProvider
       │                   └─ AssignmentsProvider
       │                        └─ children (MainContent)
```

- **AuthContext** — `session`, `user`, `isAdmin`, `signIn(email, password)`, `signOut()`
- **MembersContext** — `members[]`, `addMember(name)`, `removeMember(id)` (soft-delete)
- **MonthsContext** — `months[]`, `selectedMonth`, `createYear, month)` (auto-generates initial assignments)
- **AssignmentsContext** — `assignments[]`, `updateAssignment(id, memberId)`, `toggleLock(id)`, `regenerateMonth()`, `clearMonth()`, `setAllLocked(locked)`
- **DayConfigsContext** — `configs: Record<EventType, number>` (slot counts from DB)

### Virtual vs Persisted Months

When no stored month matches the current month, a "virtual" month record is created client-side (id prefixed `virtual-`). Assignments for virtual months use client-generated UUIDs. On first edit, `ensureMonthSaved()` persists the month and its assignments to Supabase.

## UI Interactions

- **Drag & Drop**: Members in the sidebar are draggable. Drop onto a day cell to assign. Uses @dnd-kit with PointerSensor (6px activation distance).
- **Edit Mode**: Toggle in header. Requires authenticated session. Enables all admin controls.
- **Reshuffle**: "Randomize" re-runs the algorithm preserving locked slots. "Clear All" sets unlocked slots to null. "Lock All" / "Unlock All" toggles lock state on every assignment.
- **Export**: Captures the calendar grid DOM node as PNG via `html-to-image`.
- **Theme**: Dark/light/system, persisted to localStorage via Zustand.

## Environment Variables

```
VITE_SUPABASE_URL=        # Supabase project URL
VITE_SUPABASE_ANON_KEY=   # Supabase anon/publishable key
VITE_ADMIN_EMAIL=         # Shared admin email for Supabase Auth
```

Never commit `.env`. The `.gitignore` excludes it.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build (output: dist/)
npm run lint         # ESLint
npm run typecheck    # tsc --build (no emit)
npm run prettier     # Format with Prettier
npm run preview      # Preview production build locally
```

Tests (no test framework — uses node:test):
```bash
npx tsx src/lib/algorithm.test.ts
```

## Common Tasks

### Adding a new component
1. Check `src/components/ui/` for existing ShadCN primitives
2. Follow existing naming: PascalCase, one component per file
3. Use `@/components/ui/` imports (configured via tsconfig paths)
4. Use Tailwind classes, `cn()` from `@/lib/utils` for conditional classes

### Modifying the database schema
1. Run SQL via Supabase dashboard SQL editor
2. Update `src/types/index.ts` to match
3. Update relevant context/hooks if new columns affect queries
4. Update `BUILD.MD` schema section if it's a structural change

### Changing the scheduling algorithm
1. Edit `src/lib/algorithm.ts`
2. Add/update tests in `src/lib/algorithm.test.ts`
3. Run tests with `npx tsx src/lib/algorithm.test.ts`
4. The algorithm is called from `MonthsContext.createMonth()` and `AssignmentsContext.regenerateMonth()`

### Adding a new Supabase table
1. Create the table + RLS policies in Supabase SQL editor
2. Add type to `src/types/index.ts`
3. Create a new context in `src/context/` following the pattern of existing contexts
4. Add the provider to `AppProviders.tsx`
5. Add any new env vars to GitHub Actions secrets

### Deploying
Push to `main` triggers GitHub Actions:
- `deploy.yml`: `npm ci && npm run build` → publish `dist/` to `gh-pages` branch
- `keepalive.yml`: Weekly cron pings Supabase to prevent free-tier pause

## Key Files to Read When Making Changes

| Area                | File(s)                                         |
| ------------------- | ----------------------------------------------- |
| Data model          | `src/types/index.ts`                            |
| Scheduling logic    | `src/lib/algorithm.ts`, `src/lib/dateUtils.ts`  |
| All data fetching   | `src/context/*.tsx`                             |
| Calendar UI         | `src/components/CalendarGrid.tsx`, `DayCell.tsx`|
| Member management   | `src/components/MemberSidebar.tsx`, `MemberManager.tsx` |
| Auth flow           | `src/context/AuthContext.tsx`, `LoginForm.tsx`   |
| Supabase client     | `src/lib/supabase.ts`                           |
| DB schema + RLS     | `BUILD.MD` (sections 4-5)                       |
