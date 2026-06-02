/**
 * Cactus Pro Chatbot — smart FAQ + live data lookup engine.
 * No external API needed. Matches intent from user message and returns
 * rich responses using live store data + comprehensive FAQ knowledge.
 */
import type { AppStore, PortfolioCompany } from '../data/types';

export interface BotMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  links?: { label: string; path: string }[];
  company?: PortfolioCompany;
  timestamp: Date;
}

// ─── Intent patterns ──────────────────────────────────────────────────────────

type Intent =
  | 'greeting' | 'help' | 'navigate' | 'export' | 'company_lookup'
  | 'finance' | 'investment' | 'admin' | 'sync' | 'logo' | 'colors'
  | 'roles' | 'announcements' | 'calendar' | 'docs' | 'search'
  | 'portfolio_snapshot' | 'kpi' | 'lp' | 'deals' | 'people'
  | 'unknown';

function detect(msg: string): Intent {
  const m = msg.toLowerCase();
  if (/^(hi|hello|hey|hola|namaste|greet)/i.test(m.trim())) return 'greeting';
  if (/help|lost|confused|don.t know|stuck|how do i|what (is|are|does)|explain|guide|tell me/i.test(m)) return 'help';
  if (/export|download|pdf|excel|report/i.test(m)) return 'export';
  if (/sync|sharepoint|onedrive|excel upload|teams/i.test(m)) return 'sync';
  if (/logo|upload logo|firm logo|company logo/i.test(m)) return 'logo';
  if (/color|colour|brand|theme|primary|accent|lime/i.test(m)) return 'colors';
  if (/role|permission|access|super admin|portfolio team|finance team/i.test(m)) return 'roles';
  if (/announc|banner|alert|notification/i.test(m)) return 'announcements';
  if (/calendar|compliance|deadline|due date/i.test(m)) return 'calendar';
  if (/doc|pdf upload|file|attach/i.test(m)) return 'docs';
  if (/search|find|where is/i.test(m)) return 'search';
  if (/snapshot|investment date|stake|equity value|irr|moic/i.test(m) && /portfolio/i.test(m)) return 'portfolio_snapshot';
  if (/kpi|metric|fund metric|aum|nav|tvpi|dpi|gross irr|net irr/i.test(m)) return 'kpi';
  if (/lp|limited partner|commitment|distribution|nav/i.test(m)) return 'lp';
  if (/deal|pipeline|stage|sourcing|term sheet|ic review|due diligence|closed/i.test(m)) return 'deals';
  if (/people|team|partner|member|person/i.test(m)) return 'people';
  if (/finance|expense|cash flow|fund overview|complian/i.test(m)) return 'finance';
  if (/invest|pipeline|kanban/i.test(m)) return 'investment';
  if (/admin|setting|config|taxonomy|threshold|homepage/i.test(m)) return 'admin';
  if (/portfolio|compan|company|lohum|bellatrix|auric|vitraya|kapture|brandworks|indigrid|intangles|ampm|ananant|parkmate|showroom/i.test(m)) return 'company_lookup';
  if (/go to|navigate|open|where|page|tab/i.test(m)) return 'navigate';

  if (/sector|industry|manufacturing|technology|consumer|space|semi|health|fintech|fashion|wellness/i.test(m)) return 'navigate';
  if (/patent|ip|intellectual property|invention/i.test(m)) return 'company_lookup';
  if (/revenue|valuation|moic|irr|ebitda|profit|loss|funding|invest/i.test(m)) return 'kpi';
  if (/how (many|much)|total|count|number of/i.test(m)) return 'help';
  if (/change|edit|update|modify|set|configure/i.test(m)) return 'admin';
  if (/password|login|sign in|auth/i.test(m)) return 'roles';
  if (/workspace|resource|gap|note|team note/i.test(m)) return 'navigate';
  if (/toolkit|calculator|irr calc|moic calc|runway|dilution/i.test(m)) return 'navigate';
  return 'unknown';
}

function matchCompany(msg: string, store: AppStore): PortfolioCompany | null {
  const m = msg.toLowerCase();
  return store.companies.find(c =>
    m.includes(c.name.toLowerCase()) ||
    m.includes(c.ceoName.toLowerCase()) ||
    m.includes(c.legalEntityName?.toLowerCase() ?? '__')
  ) ?? null;
}

function fmtCr(val: string) { return val || '—'; }

// ─── Response builder ─────────────────────────────────────────────────────────

export function getBotResponse(userMsg: string, store: AppStore): Omit<BotMessage, 'id' | 'timestamp'> {
  const intent = detect(userMsg);
  const co = matchCompany(userMsg, store);

  // ── Specific company lookup ──────────────────────────────────────────────
  if (co && intent === 'company_lookup' || (co && !['greeting','help','export','sync','logo','colors','roles','announcements','calendar','docs','search','kpi','lp','deals','people','finance','investment','admin','navigate'].includes(intent))) {
    const sector = store.sectors.find(s => s.id === co.sectorId)?.name ?? '—';
    return {
      role: 'bot',
      text: `Here's what I know about **${co.name}**:\n\n` +
        `📍 **${co.hqCity}, ${co.country}** · ${sector} · ${co.stage}\n` +
        `👤 **CEO:** ${co.ceoName}\n` +
        `💰 **Cactus Investment:** ${fmtCr(co.cactusInvestment)} | **Valuation:** ${fmtCr(co.currentValuation)}\n` +
        `📊 **Ownership:** ${co.ownershipPct}% | **MOIC:** ${co.moic > 0 ? co.moic + 'x' : '—'} | **IRR:** ${co.irr > 0 ? co.irr + '%' : '—'}\n` +
        `📈 **Revenue:** ${fmtCr(co.revenue)} | **EBITDA:** ${fmtCr(co.ebitda)}\n` +
        `${co.ipoPlans ? `\n🎯 **IPO Plans:** ${co.ipoPlans}` : ''}\n\n` +
        `Click "Open" to see the full company profile with financials, cap table, patents and more.`,
      company: co,
      links: [{ label: `Open ${co.name} profile`, path: '/dashboard' }],
    };
  }

  switch (intent) {
    case 'greeting':
      return {
        role: 'bot',
        text: `👋 Hi there! I'm the **Cactus Pro Assistant** — your guide to this portfolio management portal.\n\nI can help you:\n• 🔍 **Find information** about portfolio companies\n• 🧭 **Navigate** to any section\n• 📊 **Explain** features and data\n• 📥 **Guide you** through exports, syncs, and settings\n\nWhat would you like to know?`,
        links: [
          { label: 'Portfolio Companies', path: '/dashboard' },
          { label: 'Finance Overview', path: '/finance' },
          { label: 'Admin Settings', path: '/admin' },
        ],
      };

    case 'help':
      return {
        role: 'bot',
        text: `Here's a quick map of the portal:\n\n` +
          `📁 **Portfolio** — View all ${store.companies.length} companies, filter by sector/stage, open detailed profiles\n` +
          `💰 **Finance** — Fund metrics (Called Capital, NAV, TVPI, IRR…), LP table, expenses, compliance calendar\n` +
          `🎯 **Investment** — Deal pipeline Kanban board (Sourcing → Closed)\n` +
          `🧮 **VC Toolkit** — MOIC, IRR, dilution, runway calculators\n` +
          `📂 **Workspace** — Resources, gap tracker, team notes\n` +
          `⚙️ **Admin** — Edit everything: companies, colours, homepage, deal stages, KPI thresholds\n\n` +
          `Try asking me: *"What is Lohum's revenue?"* or *"How do I add a deal?"* or *"Where do I upload the firm logo?"*`,
        links: [
          { label: 'Go to Portfolio', path: '/dashboard' },
          { label: 'Go to Admin', path: '/admin' },
        ],
      };

    case 'export':
      return {
        role: 'bot',
        text: `📥 **Exporting data** — here's where every export lives:\n\n` +
          `**Portfolio Summary** (PDF + Excel)\n→ Portfolio tab → "Export ▾" dropdown (top right of the table)\n\n` +
          `**Individual Company Report** (PDF + Excel)\n→ Click any company → drawer opens → "Export ▾" button next to ✕\nIncludes: financials, cap table, key people, patents, funding rounds\n\n` +
          `**Finance Summary** (PDF + Excel)\n→ Finance tab → sidebar bottom → "Export Finance" button\n\n` +
          `**Deal Pipeline** (PDF + Excel)\n→ Investment tab → "Export ▾" next to Add Deal\n\n` +
          `PDFs are branded with the Cactus Partners green/lime palette and include a confidential footer.`,
      };

    case 'sync':
      return {
        role: 'bot',
        text: `🔄 **Syncing from SharePoint / OneDrive / Teams:**\n\n` +
          `1. Open the Excel file in SharePoint → Share → "Anyone with link can view" → Copy link\n` +
          `2. Go to **Admin → Data Sync**\n` +
          `3. Click **"Add SharePoint Source"**\n` +
          `4. Paste the URL → click **Preview** to see sheet names\n` +
          `5. Map each sheet to the right section (Fund Metrics, Expenses, etc.)\n` +
          `6. Click **Save** then **Sync Now**\n\n` +
          `Data is stored in **PostgreSQL on Render** — shared across all users permanently.`,
        links: [{ label: 'Admin → Data Sync', path: '/admin' }],
      };

    case 'logo':
      return {
        role: 'bot',
        text: `🖼️ **Uploading the firm logo (Cactus Partners):**\n\n` +
          `Go to **Admin → Firm Settings** → look for the **"Firm Logo"** section at the top.\n\n` +
          `You'll see:\n• A **preview box** (96×96)\n• **"Upload logo from computer"** button — picks PNG, JPG, SVG or WebP, uploads to the backend, saves the URL automatically\n• **"Paste URL"** fallback for hosted images\n• **Remove logo** button\n\n` +
          `The logo appears in: **Header · Homepage · Footer · CompanyDrawer header**\n\n` +
          `For individual **company logos**, go to Admin → Portfolio Companies → Edit All → Basic Info → Logo section.`,
        links: [{ label: 'Admin → Firm Settings', path: '/admin' }],
      };

    case 'colors':
      return {
        role: 'bot',
        text: `🎨 **Changing brand colours:**\n\nGo to **Admin → Firm Settings** → scroll to **Brand Colors**.\n\nYou can change:\n• **Primary Color** — used for buttons, nav active state, headings (currently forest green #1C4B42)\n• **Accent Color** — used for highlights, tags, badges (currently lime #86CA0F)\n• **Light Color** — used for card backgrounds and hover states\n\nChanges apply **instantly across the entire site** — no redeploy needed.\n\nColors are pulled from [cactuspartners.in](https://www.cactuspartners.in) to match your brand.`,
        links: [{ label: 'Admin → Firm Settings', path: '/admin' }],
      };

    case 'roles':
      return {
        role: 'bot',
        text: `🔐 **Roles & Permissions:**\n\nThere are ${store.roles.length} roles:\n\n` +
          store.roles.map(r => `• **${r.displayName}** — sees: ${r.visibleTabs.join(', ')}`).join('\n') +
          `\n\nTo change permissions: **Admin → Roles & Permissions**\n\nYou can control:\n• Which tabs each role can see and access\n• Whether they can export data\n• Whether they can write internal notes\n\nThe **Role switcher** in the header lets you preview the app as any role.`,
        links: [{ label: 'Admin → Roles & Permissions', path: '/admin' }],
      };

    case 'announcements':
      return {
        role: 'bot',
        text: `📣 **Announcements / Banners:**\n\nGo to **Admin → Announcements** to create announcements.\n\nEach announcement has:\n• **Title & body**\n• **Target roles** — shown only to specific roles\n• **Priority** (info / warning / urgent)\n• **Expiry date** — banner disappears automatically\n\nBanners appear at the top of the Homepage and Portfolio page for the targeted roles.`,
        links: [{ label: 'Admin → Announcements', path: '/admin' }],
      };

    case 'calendar':
      return {
        role: 'bot',
        text: `📅 **Compliance Calendar:**\n\nThere are two calendar views:\n\n` +
          `**1. Portfolio tab (bottom)** — Shows ALL company deadlines across the portfolio.\nClick any date to add a deadline for any company.\n\n` +
          `**2. Finance → Compliances** — The full compliance calendar with upcoming deadlines sidebar.\nSupports Excel import for bulk event upload.\n\n` +
          `**3. Company drawer → Calendar tab** — Individual company deadlines only.\nClick "Add Deadline" to add a compliance event for that specific company.\n\nAll events are shared via local storage (visible to all users on the same browser).`,
        links: [
          { label: 'Portfolio Calendar', path: '/dashboard' },
          { label: 'Finance → Compliances', path: '/finance' },
        ],
      };

    case 'docs':
      return {
        role: 'bot',
        text: `📎 **Uploading documents (PDFs, files):**\n\nGo to any **Portfolio Company → CompanyDrawer → Docs tab**.\n\nYou can upload:\n• PDFs, Word docs, Excel files\n• Images (PNG, JPG, SVG, WebP)\n• Max **20 MB** per file\n\nFiles are stored in **PostgreSQL on Render** — persistent and shared across all users.\nYou can view files inline (PDFs open in browser) or download them.\n\nTo open the Docs tab:\n1. Click any company card in Portfolio\n2. Click the **Docs** tab in the drawer header`,
        links: [{ label: 'Go to Portfolio', path: '/dashboard' }],
      };

    case 'search':
      return {
        role: 'bot',
        text: `🔍 **Finding things quickly:**\n\n` +
          `Use the **Global Search bar** in the header (top right, beside your profile).\n\nKeyboard shortcut: **⌘K** (Mac) / **Ctrl+K** (Windows)\n\nSearches across:\n• All ${store.companies.length} portfolio companies\n• Company key people and CEOs\n• Deal pipeline\n• Fund metrics\n• Sectors\n• Quick navigation links\n\nPress **↑ ↓** to navigate, **Enter** to open, **Esc** to close.`,
      };

    case 'portfolio_snapshot':
      return {
        role: 'bot',
        text: `📊 **Portfolio Snapshot table** (Finance → Fund Overview):\n\nThis shows investment data for each company:\n• Date of first investment\n• Current stake (₹ Cr)\n• Current equity value\n• Value of investment\n• MOIC & IRR with colour badges\n\n**To edit this data:**\nGo to **Admin → Portfolio Snapshot** — click any row to edit the numbers inline.\n\n**Where MOIC/IRR colours come from:**\nGo to **Admin → KPI Thresholds** to set your own green/amber/red breakpoints (default: MOIC ≥ 3x = green, ≥ 2x = amber).`,
        links: [
          { label: 'Finance → Fund Overview', path: '/finance' },
          { label: 'Admin → Portfolio Snapshot', path: '/admin' },
          { label: 'Admin → KPI Thresholds', path: '/admin' },
        ],
      };

    case 'kpi':
      return {
        role: 'bot',
        text: `📈 **Fund Metrics & KPIs:**\n\n` +
          `**Homepage KPI cards** — Edit in **Admin → Fund Metrics** (add/edit/delete/toggle visibility)\n\n` +
          `**Finance → Fund Overview** dark green cards (Called Capital, NAV, TVPI, Gross IRR, Net IRR, DPI, MOIC):\n• Click any card to edit the value inline\n• Upload an Excel with "Upload Excel" button to bulk-update\n• Card labels configurable in **Admin → Finance Config**\n\n` +
          `**Current fund metrics:**\n` +
          store.fundMetrics.filter(m=>m.visible).slice(0,5).map(m => `• ${m.label}: **${m.value}**`).join('\n'),
        links: [
          { label: 'Finance → Fund Overview', path: '/finance' },
          { label: 'Admin → Fund Metrics', path: '/admin' },
        ],
      };

    case 'lp':
      const lps = store.lps;
      return {
        role: 'bot',
        text: `🏦 **Limited Partners (${lps.length} LPs):**\n\n` +
          lps.map(l => `• **${l.name}** — Commitment: ${l.commitment} | Called: ${l.called} | Distributed: ${l.distributed} | NAV: ${l.nav}`).join('\n') +
          `\n\nThe LP table appears in **Finance → Fund Overview** (bottom section).\n\nTo edit LP data, go to the Finance tab and look at the LP Summary table — or update via the Excel sync in Admin → Data Sync.`,
        links: [{ label: 'Finance → Fund Overview', path: '/finance' }],
      };

    case 'deals': {
      const stages = [...new Set(store.deals.map(d=>d.stage))];
      return {
        role: 'bot',
        text: `🎯 **Deal Pipeline (${store.deals.length} deals):**\n\n` +
          stages.map(s => `**${s}:** ${store.deals.filter(d=>d.stage===s).length} deal(s)`).join('\n') +
          `\n\n**Adding a deal:** Investment tab → "Add Deal" button\n**Editing stages:** Admin → Deal Stages (rename, recolor, add new stages)\n**Exporting pipeline:** Investment tab → "Export ▾" → PDF or Excel`,
        links: [
          { label: 'Investment Pipeline', path: '/investment' },
          { label: 'Admin → Deal Stages', path: '/admin' },
        ],
      };
    }

    case 'people':
      return {
        role: 'bot',
        text: `👥 **Cactus Partners Team (${store.people.length} members):**\n\n` +
          store.people.map(p => `• **${p.name}** — ${p.title}${p.isPartner ? ' ⭐ Partner' : ''}`).join('\n') +
          `\n\n**Managing team members:** Admin → People & Team\n**Board members:** You can assign Cactus team members to specific portfolio companies in Admin → Portfolio Companies → Edit All → Board Members.`,
        links: [{ label: 'Admin → People & Team', path: '/admin' }],
      };

    case 'finance':
      return {
        role: 'bot',
        text: `💰 **Finance tab has 3 sections:**\n\n` +
          `**1. Fund Overview** — Fund metric cards (NAV, TVPI, IRR…), Cash Flow formula, LP table, Portfolio Snapshot\n\n` +
          `**2. Expenses** — Projected expenses by FY, Actual vs Budget, Fund Chart (all editable, Excel upload supported)\n\n` +
          `**3. Compliances** — Monthly calendar for compliance deadlines\n\n` +
          `**Configuring the Finance tab:**\n• Fund names (Fund 1, Fund 2…) → Admin → Finance Config\n• Fiscal year columns → Admin → Finance Config\n• Metric card labels → Admin → Finance Config`,
        links: [
          { label: 'Finance → Fund Overview', path: '/finance' },
          { label: 'Admin → Finance Config', path: '/admin' },
        ],
      };

    case 'investment':
      return {
        role: 'bot',
        text: `🎯 **Investment Pipeline:**\n\nThe Kanban board shows deals organised by stage.\n\n**Current stages:** ${(store.dealStages ?? []).map(s=>s.name).join(' → ')}\n\n**How to use:**\n• Click **"Add Deal"** to create a new deal\n• Hover over a card → click ✏️ to edit or 🗑️ to delete\n• Export as PDF or Excel with the **"Export ▾"** button\n\n**Customise stages:** Admin → Deal Stages — change names, colours, add/remove stages`,
        links: [
          { label: 'Investment Pipeline', path: '/investment' },
          { label: 'Admin → Deal Stages', path: '/admin' },
        ],
      };

    case 'admin':
      return {
        role: 'bot',
        text: `⚙️ **Admin panel — full list of settings:**\n\n` +
          `• **Firm Settings** — Logo, name, tagline, colours, email, locations\n` +
          `• **Portfolio Companies** — Every field editable (financials, cap table, key people, patents…)\n` +
          `• **People & Team** — Cactus team members\n` +
          `• **Sectors** — Sector names and colours\n` +
          `• **Fund Metrics** — Homepage KPI cards\n` +
          `• **Roles & Permissions** — Who sees what\n` +
          `• **Announcements** — Banners for specific roles\n` +
          `• **Data Sync** — SharePoint/OneDrive Excel sync\n` +
          `• **Deal Stages** — Pipeline stage names and colours\n` +
          `• **Homepage** — Hero text, value pillars, nav links\n` +
          `• **KPI Thresholds** — MOIC/IRR colour breakpoints\n` +
          `• **Finance Config** — Fund names, fiscal years\n` +
          `• **Taxonomy** — Company stages and statuses\n` +
          `• **Portfolio Snapshot** — Investment dates, stake, MOIC, IRR\n\n` +
          `Every change saves to **PostgreSQL** automatically.`,
        links: [{ label: 'Go to Admin', path: '/admin' }],
      };

    case 'navigate':
      return {
        role: 'bot',
        text: `🧭 **Quick navigation:**\n\n` +
          `• **Portfolio** → /dashboard — all companies\n` +
          `• **Finance** → /finance — fund metrics, LP, expenses\n` +
          `• **Investment** → /investment — deal pipeline\n` +
          `• **VC Toolkit** → /toolkit — calculators\n` +
          `• **Workspace** → /workspace — resources, notes\n` +
          `• **Admin** → /admin — all settings\n\n` +
          `Or use **⌘K** (Global Search) to jump directly to any company, metric, or page.`,
        links: [
          { label: 'Portfolio', path: '/dashboard' },
          { label: 'Finance', path: '/finance' },
          { label: 'Investment', path: '/investment' },
          { label: 'Admin', path: '/admin' },
        ],
      };

    default:
      return {
        role: 'bot',
        text: `I'm not sure I understood that, but here are some things I can help with:\n\n` +
          `• 🔍 Search for a company: *"Tell me about Lohum"* or *"What is Bellatrix's revenue?"*\n` +
          `• 🧭 Navigate: *"How do I get to Finance?"*\n` +
          `• 📥 Export: *"How do I download a PDF report?"*\n` +
          `• ⚙️ Admin: *"How do I change the brand colour?"* or *"Where do I upload the logo?"*\n` +
          `• 📊 Data: *"What is the current NAV?"* or *"Show me the LP table"*\n` +
          `• 🔄 Sync: *"How do I connect SharePoint?"*\n\n` +
          `**All companies:** Lohum, Bellatrix, Showroom B2B, Indigrid, Brandworks, Intangles, Kapture, Auric, AMPM, Ananant Systems, Vitraya, ParkMate\n\n` +
          `Try being specific — I'll do my best! 🌵`,
        links: [
          { label: 'Portfolio', path: '/dashboard' },
          { label: 'Admin', path: '/admin' },
        ],
      };
  }
}

export function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
