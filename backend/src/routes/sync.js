/**
 * SharePoint / OneDrive Excel sync route.
 *
 * POST /api/sync/fetch   → fetch Excel from URL, parse, return sheets as JSON
 * GET  /api/sync/sources → list saved sync sources
 * POST /api/sync/sources → save a new sync source
 * PUT  /api/sync/sources/:id → update source
 * DELETE /api/sync/sources/:id → remove source
 * POST /api/sync/sources/:id/run → run sync now (fetch + store in kv_store)
 */
const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');
const XLSX = require('xlsx');
const { pool } = require('../db');
const { downloadSharePointFile } = require('./microsoft');
const { requireAdmin } = require('../middleware/auth');

// All sync routes fetch arbitrary URLs server-side and write into team namespaces —
// restrict to admins. (authenticate already runs in server.js before this router.)
router.use(requireAdmin);

// ─── SSRF guard ───────────────────────────────────────────────────────────────
// Only allow fetching from the known spreadsheet hosts, and refuse any URL that
// resolves to a private / loopback / link-local address (e.g. cloud metadata at
// 169.254.169.254, internal Render services, localhost).
const ALLOWED_HOST_SUFFIXES = [
  'docs.google.com', 'drive.google.com',
  'sharepoint.com', 'onedrive.live.com', '1drv.ms',
];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||           // link-local / cloud metadata
      (a === 100 && b >= 64 && b <= 127);    // carrier-grade NAT
  }
  // IPv6: loopback, link-local, unique-local
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd');
}

async function assertSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error('Invalid URL'); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http(s) URLs are allowed');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOST_SUFFIXES.some(s => host === s || host.endsWith('.' + s));
  if (!allowed) throw new Error('URL host not in the allowed list (Google Sheets / SharePoint / OneDrive only)');
  // Resolve and block private targets to defeat DNS-rebinding to internal hosts.
  const records = await dns.lookup(host, { all: true });
  if (records.some(r => isPrivateIp(r.address))) {
    throw new Error('URL resolves to a disallowed (private) address');
  }
}

// ─── Helper: follow redirects and download file buffer ────────────────────────

function downloadBuffer(url, maxRedirects = 8) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl, remaining) => {
      const mod = currentUrl.startsWith('https') ? https : http;
      const req = mod.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 CactusProSync/1.0',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*',
        },
      }, (res) => {
        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (remaining <= 0) return reject(new Error('Too many redirects'));
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, currentUrl).toString();
          res.resume();
          return follow(next, remaining - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} from ${currentUrl}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
    };
    follow(url, maxRedirects);
  });
}

// ─── Convert sharing URL to a direct download URL ────────────────────────────

function toDirectDownloadUrl(url) {
  // Google Sheets — convert any /edit, /view, /pub URL to xlsx export
  // Works as long as the sheet is shared with "Anyone with the link can view"
  const gsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (gsMatch) {
    return `https://docs.google.com/spreadsheets/d/${gsMatch[1]}/export?format=xlsx`;
  }
  // OneDrive/SharePoint "share" URLs → append &download=1
  if (url.includes('sharepoint.com') || url.includes('onedrive.live.com') || url.includes('1drv.ms')) {
    const sep = url.includes('?') ? '&' : '?';
    return url + sep + 'download=1';
  }
  return url;
}

// ─── Parse Excel buffer to JSON (all sheets) ──────────────────────────────────

function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result = {};
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    result[sheetName] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  }
  return { sheets: Object.keys(wb.SheetNames ? wb.SheetNames : []), sheetData: result };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// ─── Smart fetch: uses Graph API for SharePoint, direct download for others ────
async function smartFetch(url) {
  await assertSafeUrl(url);
  const isSharePoint = url.includes('sharepoint.com') || url.includes('onedrive.live.com') || url.includes('1drv.ms');
  if (isSharePoint) {
    // Try Graph API first (org-restricted files); fall back to direct download
    try {
      return await downloadSharePointFile(url);
    } catch (graphErr) {
      // If not connected to MS, fall through to direct download attempt
      if (graphErr.message.includes('not connected')) throw graphErr;
      // Graph failed for another reason — try direct download as fallback
      const directUrl = toDirectDownloadUrl(url);
      return await downloadBuffer(directUrl);
    }
  }
  const directUrl = toDirectDownloadUrl(url);
  return await downloadBuffer(directUrl);
}

// POST /api/sync/fetch  { url }  → parse Excel, return sheets preview
router.post('/fetch', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const buffer = await smartFetch(url.trim());
    const { sheetData } = parseExcel(buffer);
    const sheets = Object.keys(sheetData);
    const preview = {};
    sheets.forEach(s => { preview[s] = sheetData[s].slice(0, 5); });
    res.json({ sheets, preview, rowCounts: Object.fromEntries(sheets.map(s => [s, sheetData[s].length])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sync/sources
router.get('/sources', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, url, sheet_mappings, last_synced_at, last_sync_status, last_sync_error FROM sync_sources ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/sources  { name, url, sheet_mappings }
router.post('/sources', async (req, res) => {
  const { name, url, sheet_mappings = [] } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO sync_sources (name, url, sheet_mappings) VALUES ($1, $2, $3) RETURNING *',
      [name, url, JSON.stringify(sheet_mappings)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sync/sources/:id
router.put('/sources/:id', async (req, res) => {
  const { name, url, sheet_mappings } = req.body;
  try {
    const sets = [];
    const vals = [];
    let i = 1;
    if (name)           { sets.push(`name=$${i++}`);           vals.push(name); }
    if (url)            { sets.push(`url=$${i++}`);            vals.push(url); }
    if (sheet_mappings) { sets.push(`sheet_mappings=$${i++}`); vals.push(JSON.stringify(sheet_mappings)); }
    if (!sets.length)   return res.status(400).json({ error: 'nothing to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE sync_sources SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sync/sources/:id
router.delete('/sources/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sync_sources WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Map from kvKey → the field name inside the app's store blob
const KV_KEY_TO_STORE_FIELD = {
  'financial_periods':  'financialPeriods',
  'health_dashboard':   'companyHealth',
  'portfolio_updates':  'portfolioUpdates',
  'founder_contacts':   'founderContacts',
  'research_docs':      'researchDocs',
  'fund_metrics':       'fundMetrics',
  'capital_calls':      'capitalEvents',
  'lp_comms':           'lpCommunications',
  'valuation_log':      'valuationMarks',   // store field is valuationMarks
  'ic_memos':           'icMemos',
  'dd_checklists':      'ddChecklists',
  'tasks':              'tasks',
  'meeting_notes':      'meetingNotes',
  'firm_events':        'firmEvents',
  // ── Collections that previously had no mapping (sync was a silent no-op) ──
  'pipeline':           'deals',
  'co_investors':       'coInvestors',
  'ref_checks':         'referenceChecks',
  'intro_requests':     'introRequests',
  'recruitment':        'candidates',
  'lp_summary':         'lps',
  // ── Gap-fill mappings (top-level collections) ──
  'fund_metric_cards':  'fundMetrics',
  'fund_investments':   'fundInvestments',
  'portfolio_fund_view':'portfolioFundView',
  'pm:Portfolio':       'portfolioSnapshot',
  // ── Gap-fill mappings (company-nested arrays — merged into companies[]) ──
  'sector_kpis':        'companies',
  'funding_rounds':     'companies',
  'cap_table':          'companies',
  'financial_history':  'companies',
};

// Canonical namespace for each store field — MUST mirror fieldNamespace() in
// src/context/AppContext.tsx. The sync writes each field to its canonical namespace
// regardless of what namespace the (possibly stale) sheet mapping says, so synced
// data lands in the same blob the app reads it from. Fields not listed → 'app'.
const FIELD_NAMESPACE = {
  // finance
  capitalEvents: 'finance', lpCommunications: 'finance',
  lpCommitments: 'finance', financeData: 'finance', fundInvestments: 'finance', opsConfig: 'finance',
  // portfolio
  founderContacts: 'portfolio', companyHealth: 'portfolio', newsItems: 'portfolio',
  portfolioUpdates: 'portfolio', financialPeriods: 'portfolio', researchDocs: 'portfolio',
  founderPortalAccess: 'portfolio', portfolioFundView: 'portfolio',
  // investment
  icMemos: 'investment', ddChecklists: 'investment', referenceChecks: 'investment', coInvestors: 'investment',
  // operations
  tasks: 'operations', meetingNotes: 'operations', signingDocs: 'operations',
  recruitmentConfig: 'operations', jobOpenings: 'operations', candidates: 'operations',
  interviews: 'operations', offerLetters: 'operations', onboardingTasks: 'operations',
  introRequests: 'operations', firmEvents: 'operations',
  // app (default): companies, sectors, deals, lps, fundMetrics, portfolioSnapshot, …
};
// NOTE: valuationMarks is intentionally absent → 'app' (shared: finance reads, portfolio writes).
function namespaceForField(field) {
  return FIELD_NAMESPACE[field] || 'app';
}

// Normalize a CSV column header for fuzzy matching:
// strip content in parens, strip non-ASCII, lowercase, collapse spaces
function normalizeCol(s) {
  return s.replace(/\(.*?\)/g, '').replace(/[^\x00-\x7F]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// CSV column → CompanyFinancialPeriod field mapping (normalized keys)
const FP_COL_MAP = {
  'company id':           'companyId',
  'year style':           'yearStyle',
  'period':               'periodLabel',
  'period type':          'periodType',
  'fiscal year':          'fiscalYear',
  'quarter':              'quarter',
  'revenue':              'revenue',
  'arr':                  'arr',
  'mrr':                  'mrr',
  'gmv':                  'gmv',
  'revenue growth yoy %': 'revenueGrowthYoY',
  'arr growth yoy %':     'arrGrowthYoY',
  'nrr %':                'nrr',
  'churn % monthly':      'churnPct',
  'churn %':              'churnPct',   // normalizeCol strips '(monthly)' → 'churn %'
  'gross margin %':       'grossMarginPct',
  'ebitda margin %':      'ebitdaMarginPct',
  'net margin %':         'netMarginPct',
  'valuation fmv':        'currentValuation',
  'moic':                 'moic',
  'irr %':                'irr',
  'valuation methodology':'methodology',
  'headcount':            'headcount',
  'monthly burn':         'monthlyBurn',
  'cash balance':         'cash',
  'runway':               'runway',
  'cac':                  'cac',
  'ltv':                  'ltv',
  'ltv:cac':              'ltvCacRatio',
  'notes':                'notes',
  'source':               'source',
  'updated by':           'updatedBy',
  'updated at':           'updatedAt',
};

// Transform raw CSV rows into CompanyFinancialPeriod objects
function transformFinancialPeriods(rawRows) {
  if (!rawRows.length) return [];
  // Build a col-name → field map for the actual headers in this file
  const sampleKeys = Object.keys(rawRows[0]);
  const colMap = {};
  for (const key of sampleKeys) {
    const norm = normalizeCol(key);
    if (FP_COL_MAP[norm]) colMap[key] = FP_COL_MAP[norm];
  }

  return rawRows
    .filter(row => row['Company ID'] || row[sampleKeys.find(k => normalizeCol(k) === 'company id')])
    .map(row => {
      const out = {};
      for (const [csvCol, storeField] of Object.entries(colMap)) {
        out[storeField] = row[csvCol] ?? '';
      }
      // Ensure yearStyle defaults to FY
      if (!out.yearStyle) out.yearStyle = 'FY';
      // Default periodType from presence of a quarter (mirror csvImport.ts)
      if (!out.periodType) out.periodType = out.quarter ? 'quarterly' : 'annual';
      // Synthesize a period label if the Period column was omitted (mirror csvImport.ts)
      if (!out.periodLabel) {
        out.periodLabel = out.periodType === 'quarterly' && out.quarter
          ? `${out.quarter} ${out.fiscalYear}`
          : (out.fiscalYear || '');
      }
      // Composite-key id matching the frontend upsert key
      const key = `${out.companyId}__${out.yearStyle}__${out.fiscalYear}__${out.periodType}__${out.quarter || 'annual'}`;
      out.id = `fp_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      // Ensure headcount is a number
      if (out.headcount !== undefined) out.headcount = Number(out.headcount) || 0;
      out.createdAt = out.updatedAt || new Date().toISOString();
      return out;
    })
    .filter(r => r.companyId && (r.periodLabel || r.fiscalYear));
}

// Composite key matching the frontend batchUpsertFinancialPeriods.
function fpKey(p) {
  return `${p.companyId}__${p.yearStyle}__${p.fiscalYear}__${p.periodType}__${p.quarter || 'annual'}`;
}

// For financialPeriods: merge by composite period key — update matching rows in place,
// keep all other existing rows (do NOT nuke every row for a synced company).
function mergeFinancialPeriods(existing, incoming) {
  const map = new Map((existing || []).map(p => [fpKey(p), p]));
  for (const r of incoming) {
    const k = fpKey(r);
    map.set(k, { ...(map.get(k) || {}), ...r, id: map.get(k)?.id ?? r.id });
  }
  return Array.from(map.values());
}

// ── Company-nested array templates (sector_kpis, funding_rounds, cap_table, financial_history)
// These don't have their own store collection — each row belongs to a company and is
// merged into companies[].<arrayField>. Rows carry a "Company ID" column as the key.

// Column maps per kvKey: normalized CSV header → object field on the nested array item.
const NESTED_COL_MAPS = {
  sector_kpis: {
    'kpi label': 'label', 'unit': 'unit',
    'fy23': 'fy23', 'fy24': 'fy24', 'fy25': 'fy25', 'fy26e': 'fy26e', 'fy27e': 'fy27e',
  },
  funding_rounds: {
    'date': 'date', 'round': 'roundName', 'amount': 'amount',
    'post-money valuation': 'postMoneyValuation', 'lead investors': 'leadInvestors', 'all investors': 'allInvestors',
  },
  cap_table: {
    'investor': 'investor', 'category': 'category', 'holding': 'holdingPct',
    'investment': 'investment', 'shares': 'shares',
  },
  financial_history: {
    'year': 'year', 'revenue': 'revenue', 'net profit': 'netProfit', 'ebitda': 'ebitda',
    'ebitda margin': 'ebitdaMargin', 'total assets': 'totalAssets', 'total debt': 'totalDebt', 'employees': 'employees',
  },
};
// Which array field on the company each kvKey writes, and which fields are numeric.
const NESTED_TARGET = {
  sector_kpis:       { field: 'sectorKpis',       numeric: ['fy23','fy24','fy25','fy26e','fy27e'] },
  funding_rounds:    { field: 'fundingRounds',    numeric: [] },
  cap_table:         { field: 'capTable',         numeric: ['holdingPct','investment','shares'] },
  financial_history: { field: 'financialHistory', numeric: ['employees'] },
};

function findCol(sampleKeys, normName) {
  return sampleKeys.find(k => normalizeCol(k) === normName);
}

// Build { companyId: [items...] } from raw CSV rows for a nested-array kvKey.
function transformNestedByCompany(kvKey, rawRows) {
  if (!rawRows.length) return {};
  const colMap = NESTED_COL_MAPS[kvKey];
  const target = NESTED_TARGET[kvKey];
  const sampleKeys = Object.keys(rawRows[0]);
  const idCol = findCol(sampleKeys, 'company id');
  // Map each present header to its field name.
  const present = {};
  for (const key of sampleKeys) {
    const field = colMap[normalizeCol(key)];
    if (field) present[key] = field;
  }
  const byCompany = {};
  for (const row of rawRows) {
    const cid = (idCol && row[idCol]) ? String(row[idCol]).trim() : '';
    if (!cid) continue;
    const item = {};
    for (const [csvCol, field] of Object.entries(present)) {
      let v = row[csvCol];
      if (target.numeric.includes(field)) {
        v = (v === '' || v === null || v === undefined) ? null : Number(v);
        if (Number.isNaN(v)) v = null;
      } else {
        v = v ?? '';
      }
      item[field] = v;
    }
    (byCompany[cid] = byCompany[cid] || []).push(item);
  }
  return byCompany;
}

// Merge nested arrays into companies[]: for each company present in the sheet, REPLACE
// its array field with the synced rows; companies not in the sheet are untouched.
function mergeNestedIntoCompanies(kvKey, companies, byCompany) {
  const field = NESTED_TARGET[kvKey].field;
  return (companies || []).map(c =>
    byCompany[c.id] ? { ...c, [field]: byCompany[c.id] } : c
  );
}

// ── Generic top-level collection transforms ─────────────────────────────────
// Each non-financial_periods collection has a declarative spec: how to map CSV
// headers to the app's camelCase field shape, which fields are numeric/boolean/
// array, how to build a stable id, and how to merge with existing rows. Without
// this, sync wrote raw header-keyed objects that every screen rendered blank.
//
// idFrom: array of field names combined into a deterministic id (so re-syncing
//   updates in place). mergeKey: existing rows with the same key are replaced;
//   others are kept. companyResolve: if true, fill companyId from a Company name
//   column when the id column is blank.

const COLLECTION_SPECS = {
  valuation_log: {
    storeField: 'valuationMarks', idPrefix: 'vm',
    cols: { 'company': '_companyName', 'company id': 'companyId', 'quarter': 'quarter', 'fmv': 'fmv',
            'valuation methodology': 'methodology', 'methodology': 'methodology', 'moic at mark': 'moicAtMark',
            'notes': 'notes', 'marked by': 'markedBy', 'marked at': 'markedAt' },
    numeric: ['moicAtMark'], idFrom: ['companyId', 'quarter'], companyResolve: true,
  },
  founder_contacts: {
    storeField: 'founderContacts', idPrefix: 'fc',
    cols: { 'company': '_companyName', 'company id': 'companyId', 'name': 'name', 'role': 'role',
            'email': 'email', 'phone': 'phone', 'linkedin url': 'linkedInUrl', 'linkedin': 'linkedInUrl',
            'twitter url': 'twitterUrl', 'birthday': 'birthday', 'location': 'location',
            'last contacted': 'lastContactedAt', 'last contacted at': 'lastContactedAt', 'tags': 'tags', 'notes': 'notes' },
    arrays: ['tags'], idFrom: ['companyId', 'email', 'name'], companyResolve: true,
  },
  health_dashboard: {
    storeField: 'companyHealth', idPrefix: 'ch',
    cols: { 'company': '_companyName', 'company id': 'companyId', 'quarter': 'quarter',
            'revenue growth': 'revenueGrowth', 'burn': 'burn', 'team retention': 'teamRetention',
            'product progress': 'productProgress', 'fundraising': 'fundraising', 'overall signal': 'overallSignal',
            'overall': 'overallSignal', 'notes': 'notes', 'reviewed by': 'reviewedBy', 'reviewed at': 'reviewedAt' },
    idFrom: ['companyId', 'quarter'], companyResolve: true,
  },
  portfolio_updates: {
    storeField: 'portfolioUpdates', idPrefix: 'pu',
    cols: { 'company': '_companyName', 'company id': 'companyId', 'month': 'month', 'status': 'status',
            'revenue': 'revenue', 'burn': 'burn', 'cash': 'cash', 'headcount': 'headcount',
            'highlights': 'highlights', 'challenges': 'challenges', 'asks': 'asks',
            'next month goals': 'nextMonthGoals', 'submitted by': 'submittedBy' },
    numeric: ['headcount'], idFrom: ['companyId', 'month'], companyResolve: true,
  },
  tasks: {
    storeField: 'tasks', idPrefix: 'task',
    cols: { 'title': 'title', 'description': 'description', 'company': '_companyName', 'company id': 'companyId',
            'assignee': 'assignee', 'due date': 'dueDate', 'priority': 'priority', 'status': 'status', 'tags': 'tags' },
    arrays: ['tags'], idFrom: ['title', 'assignee', 'dueDate'], companyResolve: true,
  },
  meeting_notes: {
    storeField: 'meetingNotes', idPrefix: 'mn',
    cols: { 'title': 'title', 'type': 'type', 'date': 'date', 'company': '_companyName', 'company id': 'companyId',
            'attendees': 'attendees', 'summary': 'summary', 'next meeting date': 'nextMeetingDate' },
    arrays: ['attendees'], idFrom: ['title', 'date'], companyResolve: true,
  },
  ic_memos: {
    storeField: 'icMemos', idPrefix: 'ic',
    cols: { 'company': '_companyName', 'company id': 'companyId', 'round': 'roundName', 'round name': 'roundName',
            'ask amount': 'askAmount', 'proposed valuation': 'proposedValuation', 'status': 'status',
            'ic date': 'icDate', 'recommendation': 'recommendation', 'prepared by': 'preparedBy' },
    idFrom: ['companyId', 'roundName'], companyResolve: true,
  },
  co_investors: {
    storeField: 'coInvestors', idPrefix: 'ci',
    cols: { 'firm name': 'firmName', 'partner name': 'partnerName', 'email': 'email', 'phone': 'phone',
            'linkedin url': 'linkedInUrl', 'sectors': 'sectors', 'stages': 'stages',
            'check size min': 'checkSizeMin', 'check size max': 'checkSizeMax', 'geography': 'geography',
            'warmth': 'warmth', 'shared deals': 'sharedDeals', 'notes': 'notes' },
    arrays: ['sectors', 'stages', 'sharedDeals'], idFrom: ['firmName', 'partnerName'],
  },
  ref_checks: {
    storeField: 'referenceChecks', idPrefix: 'rc',
    cols: { 'company': '_companyName', 'company id': 'companyId', 'subject name': 'subjectName', 'subject role': 'subjectRole',
            'referent name': 'referentName', 'referent role': 'referentRole', 'referent company': 'referentCompany',
            'relationship': 'relationship', 'date': 'date', 'conducted by': 'conductedBy', 'sentiment': 'sentiment',
            'strengths': 'strengthsNoted', 'weaknesses': 'weaknessesNoted', 'would work again': 'wouldWorkAgain', 'notes': 'rawNotes' },
    booleans: ['wouldWorkAgain'], idFrom: ['subjectName', 'referentName'], companyResolve: true,
  },
  intro_requests: {
    storeField: 'introRequests', idPrefix: 'ir',
    cols: { 'requested by': 'requestedBy', 'from company': '_companyName', 'target name': 'targetName',
            'target role': 'targetRole', 'target company': 'targetCompany', 'purpose': 'purpose',
            'assigned to': 'assignedTo', 'status': 'status', 'request date': 'requestDate',
            'closed date': 'closedDate', 'notes': 'notes' },
    idFrom: ['requestedBy', 'targetName'], companyResolveTo: 'requestedByCompanyId',
  },
  pipeline: {
    storeField: 'deals', idPrefix: 'deal',
    cols: { 'company': 'companyName', 'company name': 'companyName', 'sector': '_sectorName', 'sector id': 'sectorId',
            'ticket size': 'ticketSize', 'lead partner': 'leadPartnerId', 'date added': 'dateAdded',
            'stage': 'stage', 'notes': 'notes' },
    idFrom: ['companyName'],
  },
  recruitment: {
    storeField: 'candidates', idPrefix: 'cand',
    cols: { 'job title': '_jobTitle', 'name': 'name', 'email': 'email', 'phone': 'phone', 'linkedin url': 'linkedInUrl',
            'current company': 'currentCompany', 'current role': 'currentRole', 'notice period': 'noticePeriod',
            'expected ctc': 'expectedCTC', 'current ctc': 'currentCTC', 'location': 'location',
            'source': 'source', 'resume url': 'resumeUrl', 'notes': 'notes' },
    idFrom: ['name', 'email'],
  },
  lp_summary: {
    storeField: 'lps', idPrefix: 'lp',
    cols: { 'lp name': 'name', 'name': 'name', 'commitment': 'commitment', 'called': 'called',
            'distributed': 'distributed', 'nav': 'nav' },
    idFrom: ['name'],
  },
  fund_metric_cards: {
    storeField: 'fundMetrics', idPrefix: 'fm',
    cols: { 'id': 'id', 'label': 'label', 'value': 'value', 'delta': 'delta',
            'delta direction': 'deltaDirection', 'visible': 'visible' },
    booleans: ['visible'], idFrom: ['id', 'label'], explicitId: true,
  },
  fund_investments: {
    storeField: 'fundInvestments', idPrefix: 'fi',
    cols: { 'id': 'id', 'company': '_companyName', 'company id': 'companyId', 'fund': 'fund',
            'investment date': 'investmentDate', 'total invested': 'totalInvested', 'current fmv': 'currentFMV',
            'current valuation': 'currentValuation', 'moic': 'moic', 'irr': 'irr', 'dpi': 'dpi',
            'realized value': 'realizedValue', 'unrealized value': 'unrealizedValue', 'revenue': 'revenue',
            'arr': 'arr', 'mrr': 'mrr', 'gross margin': 'grossMargin', 'ebitda margin': 'ebitdaMargin',
            'monthly burn': 'monthlyBurn', 'cash': 'cash', 'runway': 'runway', 'headcount': 'headcount',
            'nrr': 'nrr', 'status': 'status' },
    numeric: ['headcount'], idFrom: ['id'], explicitId: true, companyResolve: true,
    defaults: { followOns: [] },
  },
  portfolio_fund_view: {
    storeField: 'portfolioFundView', idPrefix: 'pf',
    cols: { 'id': 'id', 'company': '_companyName', 'company id': 'companyId', 'fund': 'fund',
            'investment date': 'investmentDate', 'total invested': 'totalInvested', 'current fmv': 'currentFMV',
            'current valuation': 'currentValuation', 'moic': 'moic', 'irr': 'irr', 'realized value': 'realizedValue',
            'unrealized value': 'unrealizedValue', 'revenue': 'revenue', 'headcount': 'headcount', 'status': 'status' },
    numeric: ['headcount'], idFrom: ['id'], explicitId: true, companyResolve: true,
    defaults: { followOns: [] },
  },
  'pm:Portfolio': {
    storeField: 'portfolioSnapshot', idPrefix: 'ps',
    cols: { 'company': 'companyName', 'company name': 'companyName', 'company id': 'companyId',
            'date of first investment': 'dateOfFirstInvestment', 'current stake': 'currentStake',
            'current equity value': 'currentEquityValue', 'value of investment': 'valueOfInvestment',
            'invested': 'valueOfInvestment', 'current value': 'currentEquityValue',
            'moic': 'moic', 'irr': 'irr', 'ownership': 'currentStake', 'stage': 'stage', 'status': 'status', 'sector': 'sector' },
    numeric: ['currentStake', 'currentEquityValue', 'valueOfInvestment', 'moic', 'irr'],
    idFrom: ['companyName'],
  },
};

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Transform raw CSV rows into typed objects for a top-level collection.
// companyIndex / sectorIndex / jobIndex map names → ids for resolution.
function transformCollection(kvKey, rawRows, indexes) {
  const spec = COLLECTION_SPECS[kvKey];
  if (!spec || !rawRows.length) return null;
  const sampleKeys = Object.keys(rawRows[0]);
  // header → field map for headers actually present
  const present = {};
  for (const key of sampleKeys) {
    const field = spec.cols[normalizeCol(key)];
    if (field) present[key] = field;
  }
  const numeric  = new Set(spec.numeric || []);
  const booleans = new Set(spec.booleans || []);
  const arrays   = new Set(spec.arrays || []);

  return rawRows.map(row => {
    const out = {};
    for (const [csvCol, field] of Object.entries(present)) {
      let v = row[csvCol];
      if (numeric.has(field)) {
        v = (v === '' || v == null) ? null : Number(v);
        if (Number.isNaN(v)) v = null;
      } else if (booleans.has(field)) {
        v = /^(true|yes|1)$/i.test(String(v ?? '').trim());
      } else if (arrays.has(field)) {
        v = String(v ?? '').split(/[;,|]/).map(s => s.trim()).filter(Boolean);
      } else {
        v = v ?? '';
      }
      out[field] = v;
    }
    // Resolve company / sector / job names → ids
    if (spec.companyResolve || spec.companyResolveTo) {
      const target = spec.companyResolveTo || 'companyId';
      if (!out[target] && out._companyName && indexes.companyByName[String(out._companyName).trim().toLowerCase()]) {
        out[target] = indexes.companyByName[String(out._companyName).trim().toLowerCase()];
      }
    }
    if (out._sectorName && !out.sectorId) {
      out.sectorId = indexes.sectorByName[String(out._sectorName).trim().toLowerCase()] || out._sectorName;
    }
    if (out._jobTitle && !out.jobId) {
      out.jobId = indexes.jobByTitle[String(out._jobTitle).trim().toLowerCase()] || '';
    }
    delete out._companyName; delete out._sectorName; delete out._jobTitle;
    // Apply any per-collection default fields (e.g. followOns: [] so the UI never crashes)
    if (spec.defaults) for (const [k, v] of Object.entries(spec.defaults)) {
      if (out[k] === undefined) out[k] = Array.isArray(v) ? [...v] : v;
    }
    // Stable id
    if (spec.explicitId && out.id) {
      // keep provided id
    } else {
      const keyParts = spec.idFrom.map(f => slugify(out[f])).filter(Boolean);
      out.id = `${spec.idPrefix}_${keyParts.join('_') || slugify(JSON.stringify(out)).slice(0, 16)}`;
    }
    return out;
  }).filter(r => {
    // Drop rows that resolved to nothing meaningful (e.g. blank name/company)
    const firstKey = spec.idFrom[0];
    return r[firstKey] !== undefined && r[firstKey] !== '' && r[firstKey] !== null;
  });
}

// Merge transformed rows into the existing collection by id (replace-by-id, keep rest).
function mergeById(existing, incoming) {
  const map = new Map((existing || []).map(r => [r.id, r]));
  for (const r of incoming) map.set(r.id, { ...(map.get(r.id) || {}), ...r });
  return Array.from(map.values());
}

// Build name→id indexes from the app namespace store (companies/sectors/jobs).
function buildIndexes(appStore) {
  const idx = { companyByName: {}, sectorByName: {}, jobByTitle: {} };
  for (const c of (appStore.companies || [])) if (c.name) idx.companyByName[c.name.trim().toLowerCase()] = c.id;
  for (const s of (appStore.sectors || [])) if (s.name) idx.sectorByName[s.name.trim().toLowerCase()] = s.id;
  for (const j of (appStore.jobOpenings || [])) if (j.title) idx.jobByTitle[j.title.trim().toLowerCase()] = j.id;
  return idx;
}

// POST /api/sync/sources/:id/run  → fetch + merge into namespace store blob
router.post('/sources/:id/run', async (req, res) => {
  let source;
  try {
    const { rows } = await pool.query('SELECT * FROM sync_sources WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Source not found' });
    source = rows[0];

    const buffer = await smartFetch(source.url);
    const { sheetData } = parseExcel(buffer);

    const mappings = source.sheet_mappings || [];
    const stored = [];

    // Group by the CANONICAL namespace of each kvKey's target store field — NOT the
    // namespace stored in the (possibly stale/wrong) sheet mapping. This guarantees
    // synced data lands in the same blob the app reads it from. Company-nested kvKeys
    // write companies[] which lives in 'app'.
    const byNamespace = {};
    for (const mapping of mappings) {
      const { sheet, kvKey } = mapping;
      if (!sheetData[sheet]) continue;
      const storeField = NESTED_TARGET[kvKey] ? 'companies' : KV_KEY_TO_STORE_FIELD[kvKey];
      const ns = storeField ? namespaceForField(storeField) : (mapping.kvNamespace || 'app');
      if (!byNamespace[ns]) byNamespace[ns] = [];
      byNamespace[ns].push({ sheet, kvKey, data: sheetData[sheet] });
    }

    // Name→id resolution (companies/sectors/jobs) always comes from the 'app' blob,
    // where companies live, regardless of which namespace we're writing.
    const { rows: appBlob } = await pool.query(
      `SELECT value FROM kv_store WHERE namespace='app' AND key='store'`
    );
    const appStore = appBlob.length ? (appBlob[0].value || {}) : {};
    const indexes = buildIndexes(appStore);

    for (const [ns, items] of Object.entries(byNamespace)) {
      // Atomic read-modify-write: lock the row (FOR UPDATE) so a concurrent KV PUT
      // can't slip in between the read and the write and get clobbered.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: storeRows } = await client.query(
          `SELECT value FROM kv_store WHERE namespace=$1 AND key='store' FOR UPDATE`, [ns]
        );
        const currentStore = storeRows.length ? (storeRows[0].value || {}) : {};

        for (const { sheet, kvKey, data } of items) {
          const storeField = KV_KEY_TO_STORE_FIELD[kvKey];

          let transformed;
          let rowCount;
          let skipWrite = false;

          if (!storeField && !NESTED_TARGET[kvKey]) {
            // Unknown / dynamic-table kvKey (e.g. fund_1::*, et:*, pm:Portfolio handled
            // elsewhere, compliance events). We have no safe transform → DO NOT write raw
            // sheet JSON into the store (that corrupts typed collections). Skip & report.
            stored.push({ sheet, kvNamespace: ns, kvKey, storeField: null, rows: 0, skipped: 'no transformer for this kvKey' });
            continue;
          }

          if (kvKey === 'financial_periods') {
            const fp = transformFinancialPeriods(data);
            transformed = mergeFinancialPeriods(currentStore[storeField], fp);
          } else if (COLLECTION_SPECS[kvKey]) {
            // Top-level typed collection: map columns → camelCase, resolve names→ids,
            // generate stable ids, merge by id with existing rows.
            const incoming = transformCollection(kvKey, data, indexes) || [];
            transformed = mergeById(currentStore[storeField], incoming);
            rowCount = incoming.length;
          } else if (NESTED_TARGET[kvKey]) {
            // Company-nested array (sector KPIs, funding rounds, cap table, financial history):
            // merge rows into companies[].<field> by Company ID, leave other companies as-is.
            // companies[] lives in the 'app' namespace blob, so read the base from there —
            // never from this (possibly non-app) namespace, or we'd merge into an empty
            // array and write companies:[] that clobbers the real list on next hydrate.
            let baseCompanies = currentStore.companies;
            if (!Array.isArray(baseCompanies) || baseCompanies.length === 0) {
              const { rows: appRows } = await client.query(
                `SELECT value FROM kv_store WHERE namespace='app' AND key='store'`
              );
              baseCompanies = appRows.length ? (appRows[0].value?.companies || []) : [];
            }
            if (!baseCompanies.length) {
              // No company base anywhere — refuse to write an empty companies array.
              skipWrite = true;
            } else {
              const byCompany = transformNestedByCompany(kvKey, data);
              transformed = mergeNestedIntoCompanies(kvKey, baseCompanies, byCompany);
              rowCount = Object.values(byCompany).reduce((s, arr) => s + arr.length, 0);
            }
          }

          if (!skipWrite) {
            currentStore[storeField] = transformed;
            stored.push({ sheet, kvNamespace: ns, kvKey, storeField, rows: rowCount ?? (Array.isArray(transformed) ? transformed.length : 1) });
          } else {
            stored.push({ sheet, kvNamespace: ns, kvKey, storeField, rows: 0, skipped: 'no company base to merge into' });
          }
        }

        await client.query(
          `INSERT INTO kv_store (namespace, key, value, updated_at)
           VALUES ($1, 'store', $2, NOW())
           ON CONFLICT (namespace, key) DO UPDATE SET value=$2, updated_at=NOW()`,
          [ns, JSON.stringify(currentStore)]
        );
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK').catch(() => {});
        throw txErr;
      } finally {
        client.release();
      }
    }

    await pool.query(
      `UPDATE sync_sources SET last_synced_at=NOW(), last_sync_status='success', last_sync_error=NULL WHERE id=$1`,
      [source.id]
    );

    res.json({ success: true, stored, syncedAt: new Date().toISOString() });
  } catch (err) {
    if (source) {
      await pool.query(
        `UPDATE sync_sources SET last_sync_status='error', last_sync_error=$1 WHERE id=$2`,
        [err.message, source.id]
      ).catch(() => {});
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
