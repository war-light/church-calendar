# Church Department Calendar — Build Spec

An internal tool for scheduling a ~5-person church department across three weekly
events (Wednesday, Friday, Saturday). Admins edit the roster and assignments;
everyone else views a read-only monthly grid. Free-tier hosting only.

This doc is written for an AI coding agent to execute end-to-end. Follow the
phases in order — each phase should leave the app in a working, deployable state.

---

## 1. Stack

| Layer      | Choice                                                                               |
| ---------- | ------------------------------------------------------------------------------------ |
| Frontend   | React + TypeScript, built with Vite                                                  |
| Styling    | Tailwind CSS V4 + ShadCN                                                             |
| Backend    | Supabase (Postgres + Auth + Row Level Security)                                      |
| PNG export | `html-to-image`                                                                      |
| Hosting    | GitHub Pages (static build), via GitHub Actions                                      |
| State      | Zustand                                                                              |
| Keep-alive | GitHub Actions scheduled workflow (pings Supabase weekly to prevent free-tier pause) |

No custom backend server. No password hashing code — admin auth is handled by
Supabase Auth (one admin user, email + password).

---

## 2. Repository structure

```
church-calendar/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # build + deploy to GitHub Pages on push to main
│       └── keepalive.yml       # weekly cron hitting Supabase to prevent pausing
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   └── supabase.ts         # supabase client init, reads env vars
│   ├── types/
│   │   └── index.ts            # Member, Assignment, MonthRecord, EventType
│   ├── hooks/
│   │   ├── useAuth.ts          # wraps Supabase Auth session state
│   │   ├── useMembers.ts       # CRUD for members table
│   │   └── useAssignments.ts   # CRUD for assignments, current month state
│   ├── lib/algorithm.ts        # randomizer (see section 5)
│   ├── components/
│   │   ├── CalendarGrid.tsx    # the Wed/Fri/Sat grid, renders both admin+view mode
│   │   ├── GridCell.tsx        # single cell: member name, lock icon, click-to-edit
│   │   ├── MemberManager.tsx   # admin-only: add/remove members
│   │   ├── MonthPicker.tsx     # switch between stored months + "current month"
│   │   ├── LoginForm.tsx       # admin login
│   │   └── ExportButton.tsx    # wraps html-to-image
│   └── styles/
│       └── index.css           # tailwind entrypoint
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 3. Phase 1 — Project init

```bash
npm create vite@latest church-calendar -- --template react-ts
cd church-calendar
npm install
npm install @supabase/supabase-js html-to-image
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js` `content` to include `./index.html` and
`./src/**/*.{ts,tsx}`. Add the three Tailwind directives to `src/styles/index.css`
and import it in `main.tsx`.

Set the Vite `base` path in `vite.config.ts` to `/church-calendar/` (or whatever
the repo name is) — required for GitHub Pages project sites, otherwise assets
404 in production.

Create `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit the real `.env`. `.gitignore` must include `.env`.

---

## 4. Phase 2 — Supabase project + schema

1. Create a new Supabase project (free tier).
2. Create one Auth user for the admin (email + password), via the Supabase
   dashboard — do not build a signup flow, there is only ever one admin.
3. Run this SQL in the Supabase SQL editor:

```sql
create type event_type as enum ('wednesday', 'friday', 'saturday');

create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table months (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month between 1 and 12),
  is_current boolean not null default false,
  unique (year, month)
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references months(id) on delete cascade,
  day_date date not null,
  event_type event_type not null,
  member_id uuid references members(id) on delete set null,
  locked boolean not null default false
);

create index on assignments (month_id);
```

4. Enable Row Level Security on all three tables. Policies:

```sql
alter table members enable row level security;
alter table months enable row level security;
alter table assignments enable row level security;

-- public read
create policy "public read members" on members for select using (true);
create policy "public read months" on months for select using (true);
create policy "public read assignments" on assignments for select using (true);

-- admin (authenticated) write
create policy "admin write members" on members for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write months" on months for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write assignments" on assignments for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

Since there is only ever one admin account, "authenticated" is sufficient —
no role table needed.

5. Copy the project URL and anon key into `.env`.

---

## 5. Phase 3 — Core logic (build and unit-test before wiring UI)

### `src/types/index.ts`

Define `Member`, `EventType`, `Assignment`, `MonthRecord` matching the schema.

### `src/lib/algorithm.ts`

Pure function, no side effects, easiest thing to get right in isolation first.

```ts
function generateMonthAssignments(
  daysInMonth: { date: string; eventType: EventType }[],
  members: Member[],
  existingAssignments: Assignment[], // to respect locked slots
): Assignment[];
```

Rules to implement:

- Slot sizes: Wednesday = 1 member, Friday = 2 members, Saturday = 3 members
  (all three can repeat the same member within a slot on different weeks, but
  not within the _same_ slot on the same day — e.g. Saturday's 3 spots must be
  3 distinct people if members.length >= 3).
- Any assignment already marked `locked: true` keeps its member and is
  excluded from reshuffling.
- Fill remaining open slots via a weighted round-robin: maintain a running
  per-member assignment count (seeded from the locked assignments already in
  place), always draw the next slot from the member(s) with the current lowest
  count, breaking ties randomly. This keeps the distribution "almost equal"
  without a full CSP solver.
- Never assign the same member twice within a single day's slots.

Write a handful of manual test cases (5 members, empty month; 5 members, some
pre-locked; 3 members i.e. exactly enough for Saturday) before moving on —
this is the one piece of logic worth verifying carefully.

---

## 6. Phase 4 — Data hooks

- `useAuth`: subscribe to `supabase.auth.onAuthStateChange`, expose
  `{ session, signIn, signOut }`.
- `useMembers`: fetch active members, expose `addMember`, `removeMember`
  (soft-delete via `active = false` so historical assignments keep their
  name).
- `useAssignments(monthId)`: fetch assignments for a month, expose
  `updateAssignment`, `toggleLock`, `regenerateMonth` (calls the algorithm,
  then bulk-upserts).

Keep Supabase calls only inside `hooks/`, not scattered through components.

---

## 7. Phase 5 — UI

Build in this order so there's something visible early:

1. `CalendarGrid` in **read-only** mode against hardcoded mock data — gets the
   grid layout right (columns: Wed | Fri | Sat, outside-month cells muted)
   before touching Supabase.
2. Wire `useAssignments` into `CalendarGrid` for real data, current month only.
3. `LoginForm` + `useAuth` — gate an "admin mode" toggle in `App.tsx`.
4. Admin-only affordances on `GridCell`: click to reassign from a dropdown of
   active members, lock/unlock icon.
5. `MemberManager` — simple list with add/remove, admin-only.
6. "Generate" button — calls the algorithm, shows a confirmation before
   overwriting unlocked slots.
7. `MonthPicker` — list stored months, allow creating the next month.
8. `ExportButton` — `html-to-image`'s `toPng()` on the grid's DOM node,
   triggers a file download.

---

## 8. Phase 6 — Deploy

`.github/workflows/deploy.yml`: on push to `main`, `npm ci && npm run build`,
publish `dist/` to the `gh-pages` branch (use `peaceiris/actions-gh-pages` or
equivalent). Store `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as GitHub
Actions repo secrets and inject them as env vars in the build step — never
hardcode them in source (the anon key is safe to expose publicly, but keep
the pattern clean).

`.github/workflows/keepalive.yml`: `schedule: cron: '0 0 * * 1'` (weekly),
does a simple `curl` GET against the Supabase REST endpoint with the anon key
to keep the free-tier project from pausing after 7 days of inactivity.

Enable GitHub Pages on the repo, pointing at the `gh-pages` branch.

---

## 9. Explicit non-goals

- No password hashing / custom auth table — Supabase Auth owns this.
- No Prolog / constraint solver — the round-robin algorithm in section 5 is
  sufficient for ~5 members and 3 weekly slots.
- No state management library (Redux, Zustand) — React state + the hooks
  above are enough at this scale.
- No test framework setup beyond manually verifying `algorithm.ts` — not
  worth the overhead for a single-admin internal tool.
