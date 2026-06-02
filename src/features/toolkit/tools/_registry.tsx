/**
 * TOOL REGISTRY — wire a new tool here when you build it.
 *
 * HOW TO ADD A NEW TOOL:
 * ──────────────────────
 * 1. Create a file:  src/features/toolkit/tools/YourToolName.tsx
 *    Export a default React component (receives no props — reads from store if needed).
 *
 * 2. Import it below and add one line to TOOL_COMPONENTS:
 *    'your-tool-id': YourToolName,
 *
 * 3. In VCToolkitPage.tsx, change the tool's tag from 'To build' → 'Built'.
 *
 * That's it. The framework card will show a "Built" badge and a "Launch" button.
 * Clicking it opens the tool in a full-screen modal over the toolkit page.
 *
 * TOOL IDs (match the `id` field in FW array in VCToolkitPage.tsx):
 * ─────────────────────────────────────────────────────────────────
 * Transaction Advisors:  'ibank-rec', 'ibank-upload', 'legal-advisor'
 * Fundraising:           'investor-ready', 'pitch-eval', 'investor-crm',
 *                        'ts-compare', 'round-size'
 * Valuation:             'venture-val', 'comps-val', 'moic-tracker', 'cap-table'
 * Unit Economics:        'ltv-cac', 'burn-multiple', 'rule40', 'cohort', 'nrr',
 *                        'magic-number'
 * Market:                'tam-sizing', 'competitive', 'pmf', 'category-def'
 * Operations:            'kpi-tracker', 'board-prep', 'runway-alert', 'okr',
 *                        'founder-eng'
 * Exit:                  'exit-ready', 'secondary', 'follow-on'
 */

import type { ComponentType } from 'react';

// ── Import your built tools here ─────────────────────────────────────────────
// Example (uncomment when you build it):
// import IbankRecommender from './IbankRecommender';
// import IbankUploader    from './IbankUploader';
// import LtvCacAnalyser   from './LtvCacAnalyser';

// ── Registry: tool-id → React component ──────────────────────────────────────
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  // Wire tools here as you build them:
  // 'ibank-rec':    IbankRecommender,
  // 'ibank-upload': IbankUploader,
  // 'ltv-cac':      LtvCacAnalyser,
};

export function getToolComponent(toolId: string): ComponentType | null {
  return TOOL_COMPONENTS[toolId] ?? null;
}
