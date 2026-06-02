# Cactus Pro — Codebase Guide

Every nav tab has its **own folder** inside `src/features/`.
Shared building blocks live in `src/components/` and `src/data/`.

---

## Folder Map

```
src/
├── features/                   ← ONE FOLDER PER NAV TAB
│   ├── portfolio/              ← "Portfolio" tab
│   │   ├── PortfolioPage.tsx   ← main grid of company cards + filters
│   │   └── CompanyDrawer.tsx   ← slide-in panel (Overview / Financials / Funding / Cap Table / Patents / People / Docs)
│   │
│   ├── finance/                ← "Finance" tab
│   │   ├── FinancePage.tsx     ← cash-flow chart + LP table + distribution log
│   │   ├── MetricCard.tsx      ← single KPI card (value + delta badge)
│   │   └── OperationalMetrics.tsx ← mini portfolio summary strip
│   │
│   ├── investment/             ← "Investment" tab
│   │   └── InvestmentPage.tsx  ← Kanban deal pipeline (Sourcing → Closed)
│   │
│   ├── toolkit/                ← "VC Toolkit" tab
│   │   └── VCToolkitPage.tsx   ← calculators: MOIC, IRR, dilution, runway, term-sheet
│   │
│   ├── workspace/              ← "Workspace" tab
│   │   └── WorkspacePage.tsx   ← Resources library + Gap tracker + Team notes
│   │
│   └── admin/                  ← "Admin" tab
│       ├── AdminPage.tsx           ← sidebar shell that loads the right panel
│       ├── FirmSettings.tsx        ← name, logo, colours, locations
│       ├── CompanyManager.tsx      ← full company editor (every field, all arrays)
│       ├── PeopleManager.tsx       ← Cactus team members
│       ├── SectorManager.tsx       ← sector tags + colours
│       ├── MetricsManager.tsx      ← fund KPI cards on homepage
│       ├── PermissionsManager.tsx  ← which role sees which tab
│       └── AnnouncementManager.tsx ← banners shown to specific roles
│
├── components/                 ← SHARED (used across multiple tabs)
│   ├── ui/
│   │   ├── SectorPill.tsx      ← coloured sector tag pill
│   │   ├── StatusBadge.tsx     ← Active / Watch / Exited badge
│   │   └── AvatarChip.tsx      ← person avatar + name chip
│   └── layout/
│       ├── Header.tsx          ← top nav bar with tab switcher
│       ├── Footer.tsx          ← bottom bar
│       ├── RoleSwitcher.tsx    ← dev tool to switch between roles
│       └── AccessRestricted.tsx ← "you don't have access" screen
│
├── data/                       ← ALL REAL DATA LIVES HERE
│   ├── defaultConfig.ts        ← every company, LP, deal, metric, person (edit this to change content)
│   ├── teamMembers.ts          ← Apollo CSV employee data per company
│   └── types.ts                ← TypeScript interfaces for every object shape
│
├── context/
│   └── AppContext.tsx          ← global state + every action (add/update/delete anything)
│
└── lib/
    ├── api.ts                  ← backend calls (notes + file uploads)
    └── utils.ts                ← generateId(), cn() class helper
```

---

## What to edit for common tasks

| Task | File to open |
|------|-------------|
| Change a company's data (revenue, valuation, CEO…) | `data/defaultConfig.ts` → find the company by name |
| Add / remove a portfolio company | `data/defaultConfig.ts` OR Admin → Portfolio Companies |
| Change the homepage KPI numbers | `data/defaultConfig.ts` → `fundMetrics` array |
| Change LP data or cash-flow chart | `data/defaultConfig.ts` → `lps` / `cashFlow` arrays |
| Add a deal to the pipeline | Investment tab → Add Deal button |
| Change brand colours | Admin → Firm Settings → Brand Colors |
| Add a Cactus team member | Admin → People & Team |
| Change who can see which tab | Admin → Roles & Permissions |
| Change what the Portfolio grid looks like | `features/portfolio/PortfolioPage.tsx` |
| Change what's inside a company drawer | `features/portfolio/CompanyDrawer.tsx` |
| Change the Finance page charts | `features/finance/FinancePage.tsx` |
| Add a VC calculator | `features/toolkit/VCToolkitPage.tsx` |
| Add a workspace resource template | `features/workspace/WorkspacePage.tsx` |
| Change the top nav bar | `components/layout/Header.tsx` |

---

## How data flows (simple version)

```
data/defaultConfig.ts   ← raw data (the "database" until you add a real DB)
        ↓
context/AppContext.tsx  ← loads data into React state, exposes actions
        ↓
Any page/component      ← calls useApp() to read state or trigger actions
        ↓
Admin panel             ← calls updateCompany(), addDeal(), etc. → AppContext saves back
```

> **Tip:** Search for `useApp()` in any file to see exactly what data and actions that component uses.

---

## Backend (Render) — what it stores

The backend only handles two things that need to persist across sessions:

| Endpoint | What it saves |
|----------|---------------|
| `/api/notes/:companyId` | Internal notes typed in the Overview tab |
| `/api/files/:companyId` | PDFs / docs uploaded in the Docs tab |

Everything else (companies, deals, LPs, people) is stored in `defaultConfig.ts` and lives in browser memory. To make those persist too, the backend would need a full database sync — ask if you want that added.
