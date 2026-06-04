// xlsx loaded lazily only on download click (saves 468KB from initial bundle)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _XLSX: any = null;
async function getXLSX() {
  if (!_XLSX) _XLSX = await import('xlsx');
  return _XLSX;
}
import { Download, Clock } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const LS_KEY = 'cactus_master_sheet_last_downloaded';


function w(n: number) { return Array(n).fill({ wch: 22 }); }

export default function MasterSheetDownloader() {
  const { store } = useApp();
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(() => localStorage.getItem(LS_KEY));

  async function handleDownload() {
    const XLSX = await getXLSX();
    const wb        = XLSX.utils.book_new();
    const companies = store.companies        ?? [];
    const sectors   = store.sectors          ?? [];
    const lps       = store.lps              ?? [];
    const periods   = store.financialPeriods ?? [];

    // Lookup helper: find stored period data
    const findPeriod = (companyId: string, periodLabel: string) =>
      periods.find(p => p.companyId === companyId && p.periodLabel === periodLabel);

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1: GLOSSARY & FORMULAS
    // ════════════════════════════════════════════════════════════════════════
    const glossaryRows: (string | number)[][] = [
      ['CACTUS PARTNERS — VC MASTER SHEET'],
      [''],
      ['RETURN METRICS', 'Formula / Definition', 'Benchmark'],
      ['MOIC (Multiple on Invested Capital)', 'Current FMV × Ownership% ÷ Amount Invested', '>2x good, >3x great, >5x exceptional'],
      ['IRR (Internal Rate of Return)', 'Annualised % return = (MOIC^(1/Years))-1', '>20% good, >30% great for VC'],
      ['DPI (Distributions to Paid-In)', 'Cash returned to LPs ÷ Capital called', '1.0x = returned all capital. Target >1.5x'],
      ['RVPI (Residual Value to Paid-In)', 'Unrealised portfolio value ÷ Capital called', 'Paper value — only real at exit'],
      ['TVPI (Total Value to Paid-In)', 'DPI + RVPI', 'Target >2.5x by fund end'],
      ['J-Curve', 'Dip in returns in early years (fees+losses before winners)', 'Normal — fund looks bad at Yr3, good at Yr8'],
      [''],
      ['FUND-LEVEL METRICS', '', ''],
      ['AUM', 'Total value of all funds managed', ''],
      ['Management Fee', 'Annual fee to LPs (typically 2% of committed capital)', 'Drops to 1.5% after investment period'],
      ['Carry / Carried Interest', 'Fund profit share after LP preferred return (typically 20%)', 'Only earned after hurdle rate cleared'],
      ['Hurdle Rate', 'Min return LPs must receive before carry kicks in', 'Typically 8% per year'],
      ['Waterfall', 'LP capital → Preferred return → Catch-up → Carry split', ''],
      ['GP Commit', 'Fund managers invest alongside LPs (1–2% of fund)', 'Aligns incentives'],
      ['Reserve Ratio', 'Capital held back for follow-on investments', 'Typically 40–50% of fund'],
      [''],
      ['COMPANY-LEVEL METRICS', '', ''],
      ['Pre-Money Valuation', 'Company value BEFORE new investment', ''],
      ['Post-Money Valuation', 'Pre-Money + New Investment', 'Cactus ownership = Investment ÷ Post-Money'],
      ['Dilution', '% ownership lost when new shares issued', 'New ownership = Old% × (1 - new shares/total)'],
      ['Runway', 'Months of cash at current burn rate', 'Cash ÷ Monthly Net Burn. <6 months = danger'],
      ['Burn Rate (Net)', 'Monthly cash spent = Expenses - Revenue', 'Gross burn = total expenses'],
      ['Gross Margin', '(Revenue - COGS) ÷ Revenue', 'SaaS: 70-85%, D2C: 40-60%, Marketplace: 60-80%'],
      ['ARR', 'Annual Recurring Revenue (SaaS)', 'MRR × 12'],
      ['MRR', 'Monthly Recurring Revenue', ''],
      ['NRR / NDR', 'Next year revenue from same customers ÷ this year', '>110% = world-class. <100% = churn problem'],
      ['CAC', 'Customer Acquisition Cost = Sales+Marketing ÷ New Customers', 'Lower is better'],
      ['LTV', 'Lifetime Value = Avg Revenue per customer × Gross Margin × Avg Lifetime', ''],
      ['LTV:CAC Ratio', 'LTV ÷ CAC', '>3x healthy, >5x excellent'],
      ['Churn Rate', '% customers/revenue lost per month', '<2% monthly is good for SaaS'],
      ['GMV', 'Gross Merchandise Value (marketplace total transaction value)', 'Revenue = GMV × Take Rate'],
      [''],
      ['DEAL TERMS', '', ''],
      ['SAFE', 'Simple Agreement for Future Equity — converts at next priced round', 'Has valuation cap and/or discount'],
      ['Convertible Note', 'Debt converting to equity at next round', 'Has interest rate + maturity date'],
      ['Valuation Cap', 'Max valuation at which SAFE/note converts', 'Protects early investors from dilution'],
      ['Discount Rate', 'Early investor converts at lower price (15-25%)', 'Effective price = Next round price × (1 - discount)'],
      ['Liquidation Preference', 'Investor paid back first in exit before founders', '1x non-participating = standard, participating = aggressive'],
      ['Anti-Dilution (WA)', 'Weighted Average — adjusts conversion price in down round', 'Standard. Full ratchet is aggressive.'],
      ['Pro-Rata Rights', 'Right to invest in future rounds to maintain ownership %', 'Exercise or get diluted'],
    ];
    const glossaryWs = XLSX.utils.aoa_to_sheet(glossaryRows);
    glossaryWs['!cols'] = [{ wch: 35 }, { wch: 55 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, glossaryWs, 'Glossary');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2: RETURN METRICS (per company, all formulas)
    // ════════════════════════════════════════════════════════════════════════
    const retHeaders = [
      'Company', 'Sector', 'Stage',
      'Amount Invested (₹Cr)',   // D — input
      'Current FMV (₹Cr)',       // E — input
      'Cactus Ownership %',      // F — input
      'Exit Proceeds (₹Cr)',     // G — input (0 if still active)
      'Investment Date',         // H — input
      'Years Held',              // I — formula
      'MOIC',                    // J — formula
      'Approx IRR %',            // K — formula
      'DPI',                     // L — formula
      'RVPI',                    // M — formula
      'TVPI',                    // N — formula
      'Realized Value (₹Cr)',    // O — formula
      'Unrealized Value (₹Cr)',  // P — formula
      'Status',
      'Notes',
    ];

    const retRows: (string | number | { f: string })[][] = [retHeaders];
    companies.forEach((c, i) => {
      const r = i + 2;
      const sector = sectors.find(s => s.id === c.sectorId);
      retRows.push([
        c.name,
        sector?.name ?? '',
        c.stage,
        c.cactusInvestment || '',    // D — invested
        c.currentValuation || '',    // E — FMV
        c.ownershipPct || '',           // F — ownership %
        0,                           // G — exit proceeds (user fills)
        c.foundedYear || '',             // H — investment date (user fills)
        { f: `IF(H${r}<>"",YEARFRAC(DATEVALUE(H${r}),TODAY()),1)` },              // I — years held
        { f: `IF(D${r}>0,(E${r}*F${r}/100+G${r})/D${r},0)` },                    // J — MOIC
        { f: `IF(AND(D${r}>0,I${r}>0),(POWER(J${r},1/I${r})-1)*100,0)` },        // K — IRR approx
        { f: `IF(D${r}>0,G${r}/D${r},0)` },                                       // L — DPI
        { f: `IF(D${r}>0,(E${r}*F${r}/100)/D${r},0)` },                          // M — RVPI
        { f: `L${r}+M${r}` },                                                     // N — TVPI
        { f: `G${r}` },                                                            // O — realized
        { f: `E${r}*F${r}/100` },                                                 // P — unrealized
        c.status,
        '',
      ]);
    });

    // Totals row
    const totalRow = companies.length + 2;
    retRows.push([
      'TOTALS', '', '',
      { f: `SUM(D2:D${totalRow - 1})` },
      { f: `SUM(E2:E${totalRow - 1})` },
      '',
      { f: `SUM(G2:G${totalRow - 1})` },
      '', '',
      { f: `IF(D${totalRow}>0,(E${totalRow}*F${totalRow}/100+G${totalRow})/D${totalRow},0)` },
      '', '', '', '',
      { f: `SUM(O2:O${totalRow - 1})` },
      { f: `SUM(P2:P${totalRow - 1})` },
      '', 'Portfolio Totals',
    ]);

    const retWs = XLSX.utils.aoa_to_sheet(retRows);
    retWs['!cols'] = w(retHeaders.length);
    XLSX.utils.book_append_sheet(wb, retWs, 'Return Metrics');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 3: FUND PERFORMANCE (DPI / RVPI / TVPI / Waterfall)
    // ════════════════════════════════════════════════════════════════════════
    const fundPerfData: (string | number | { f: string })[][] = [
      ['FUND PERFORMANCE CALCULATOR'],
      [''],
      ['INPUT', 'Value', 'Unit'],
      ['Fund Name', store.firm?.name ?? 'Cactus Fund I', ''],
      ['Vintage Year', new Date().getFullYear() - 3, 'Year'],
      ['Fund Life (years)', 10, 'Years'],
      ['Investment Period', 5, 'Years'],
      ['Total Fund Size (₹Cr)', '', '₹Cr'],           // B8 — input
      ['Total Capital Called (₹Cr)', '', '₹Cr'],      // B9
      ['Total Invested in Portfolio (₹Cr)', '', '₹Cr'], // B10
      ['Total Distributions to LPs (₹Cr)', '', '₹Cr'], // B11
      ['Current Portfolio FMV (₹Cr)', '', '₹Cr'],     // B12
      ['Management Fee % (annual)', 2, '%'],
      ['Carry %', 20, '%'],
      ['Hurdle Rate %', 8, '%'],
      ['Years Since Inception', 3, 'Years'],
      [''],
      ['CALCULATED OUTPUT', 'Formula', 'Value'],
      ['DPI (Distributions / Called)', '=B11/B9', { f: 'IF(B9>0,B11/B9,0)' }],
      ['RVPI (Portfolio FMV / Called)', '=B12/B9', { f: 'IF(B9>0,B12/B9,0)' }],
      ['TVPI (DPI + RVPI)', '=DPI+RVPI', { f: 'IF(B9>0,(B11+B12)/B9,0)' }],
      ['Gross MOIC', '=(Distributions+FMV)/Invested', { f: 'IF(B10>0,(B11+B12)/B10,0)' }],
      ['Total Mgmt Fees (est.)', '=Fund Size × Fee% × Years', { f: 'B8*B13/100*B16' }],
      ['Preferred Return Due', '=Called × (1+Hurdle%)^Years - Called', { f: 'B9*(POWER(1+B15/100,B16)-1)' }],
      [''],
      ['WATERFALL CALCULATOR', 'Scenario', 'Value (₹Cr)'],
      ['Total Exit Proceeds', 'Input here →', ''],     // user fills C27
      ['Step 1: LP Capital Return', '=MIN(Proceeds, Capital Called)', { f: 'IF(C27<>"",MIN(C27,B9),0)' }],
      ['Step 2: Preferred Return (8%)', '=Called×((1.08^Yrs)-1)', { f: 'IF(B9>0,B9*(POWER(1+B15/100,B16)-1),0)' }],
      ['Step 3: GP Catch-up (to 20%)', '=Carry%/(1-Carry%)×Preferred', { f: 'IF(B14>0,B14/100/(1-B14/100)*C29,0)' }],
      ['Step 4: Carry (to GP)', '=20% of remaining', { f: 'IF(C27>C28+C29+C30,(C27-C28-C29-C30)*B14/100,0)' }],
      ['Step 5: Residual to LPs', '=Proceeds - GP carry', { f: 'IF(C27<>"",C27-C31,0)' }],
      ['Net LP Multiple', '=(LP Return + Preferred + Residual) / Called', { f: 'IF(B9>0,(C28+C29+C32)/B9,0)' }],
    ];
    const fundPerfWs = XLSX.utils.aoa_to_sheet(fundPerfData);
    fundPerfWs['!cols'] = [{ wch: 35 }, { wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, fundPerfWs, 'Fund Performance');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 4: J-CURVE TRACKER (year by year)
    // ════════════════════════════════════════════════════════════════════════
    const jHeaders = ['Year', 'Capital Called (₹Cr)', 'Mgmt Fees (₹Cr)', 'Portfolio Invested (₹Cr)', 'Distributions (₹Cr)', 'Portfolio FMV (₹Cr)', 'Cumulative Cash Out', 'Cumulative Cash In', 'Net Cash Flow', 'DPI', 'RVPI', 'TVPI', 'Gross MOIC'];
    const jRows: (string | number | { f: string })[][] = [jHeaders];
    for (let yr = 1; yr <= 10; yr++) {
      const r = yr + 1;
      jRows.push([
        yr,
        '', // capital called
        '', // mgmt fees
        '', // invested
        '', // distributions
        '', // fmv
        { f: `IF(B${r}<>"",SUM(B$2:B${r})+SUM(C$2:C${r}),0)` },   // cumulative out
        { f: `IF(E${r}<>"",SUM(E$2:E${r}),0)` },                   // cumulative in
        { f: `H${r}-G${r}` },                                       // net
        { f: `IF(G${r}>0,H${r}/G${r},0)` },                        // DPI
        { f: `IF(G${r}>0,F${r}/G${r},0)` },                        // RVPI
        { f: `J${r}+K${r}` },                                       // TVPI
        { f: `IF(D${r}>0,(E${r}+F${r})/D${r},0)` },                // Gross MOIC
      ]);
    }
    const jWs = XLSX.utils.aoa_to_sheet(jRows);
    jWs['!cols'] = w(jHeaders.length);
    XLSX.utils.book_append_sheet(wb, jWs, 'J-Curve');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 5: LP ECONOMICS (per LP DPI/RVPI/Carry)
    // ════════════════════════════════════════════════════════════════════════
    const lpHeaders = [
      'LP Name', 'Total Commitment (₹Cr)', 'Capital Called (₹Cr)', 'Uncalled (₹Cr)',
      'Distributions Received (₹Cr)', 'Residual NAV (₹Cr)', 'DPI', 'RVPI', 'TVPI',
      'MOIC', 'Preferred Return Due (₹Cr)', 'Carry Owed (₹Cr)', 'Net to LP (₹Cr)', 'Notes',
    ];
    const lpRows: (string | number | { f: string })[][] = [lpHeaders];
    lps.forEach((lp, i) => {
      const r = i + 2;
      lpRows.push([
        lp.name,
        lp.commitment,
        lp.called,
        { f: `IF(B${r}<>"",B${r}-C${r},0)` },                               // uncalled
        lp.distributed,
        lp.nav,
        { f: `IF(C${r}>0,E${r}/C${r},0)` },                                 // DPI
        { f: `IF(C${r}>0,F${r}/C${r},0)` },                                 // RVPI
        { f: `G${r}+H${r}` },                                                // TVPI
        { f: `IF(C${r}>0,(E${r}+F${r})/C${r},0)` },                         // MOIC
        { f: `IF(C${r}>0,C${r}*(POWER(1.08,3)-1),0)` },                     // preferred @ 8% / 3yr
        { f: `IF(E${r}+F${r}>C${r},(E${r}+F${r}-C${r}-K${r})*0.2,0)` },    // carry est
        { f: `E${r}+F${r}-L${r}` },                                          // net to LP
        '',
      ]);
    });
    const lpWs = XLSX.utils.aoa_to_sheet(lpRows);
    lpWs['!cols'] = w(lpHeaders.length);
    XLSX.utils.book_append_sheet(wb, lpWs, 'LP Economics');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 6: COMPANY OPERATING METRICS (full VC metrics per company)
    // ════════════════════════════════════════════════════════════════════════
    const opHeaders = [
      'Company', 'Sector', 'Stage', 'Status',
      // Revenue
      'Revenue FY23 (₹Cr)', 'Revenue FY24 (₹Cr)', 'Revenue FY25 (₹Cr)',
      'YoY Growth FY24 %', 'YoY Growth FY25 %', 'Revenue CAGR 3yr %',
      // Margins
      'Gross Margin %', 'EBITDA Margin %', 'Net Margin %',
      // Burn & cash
      'Monthly Gross Burn (₹Cr)', 'Monthly Revenue (₹Cr)', 'Monthly Net Burn (₹Cr)',
      'Cash Balance (₹Cr)', 'Runway (months)',
      // SaaS
      'ARR (₹Cr)', 'MRR (₹Cr)', 'NRR %', 'Churn Rate % (monthly)',
      // Unit economics
      'CAC (₹)', 'LTV (₹)', 'LTV:CAC Ratio', 'Payback Period (months)',
      // Marketplace
      'GMV (₹Cr)', 'Take Rate %', 'Implied Revenue from GMV (₹Cr)',
      // Team
      'Headcount', 'Revenue per Employee (₹Cr)',
      // Next round
      'Next Round Size (₹Cr)', 'Target Pre-Money (₹Cr)', 'Target Post-Money (₹Cr)',
      'Expected Cactus Dilution %', 'Expected MOIC at Target Exit',
      // Notes
      'Key Risks', 'Key Milestones (6m)', 'Last Updated',
    ];
    const opRows: (string | number | { f: string })[][] = [opHeaders];
    companies.forEach((c, i) => {
      const r = i + 2;
      const sector = sectors.find(s => s.id === c.sectorId);
      opRows.push([
        c.name, sector?.name ?? '', c.stage, c.status,
        '',             // Rev FY23
        '',             // Rev FY24
        c.revenue || '',// Rev FY25
        { f: `IF(AND(E${r}<>"",E${r}>0),(F${r}-E${r})/E${r}*100,0)` }, // YoY FY24
        { f: `IF(AND(F${r}<>"",F${r}>0),(G${r}-F${r})/F${r}*100,0)` }, // YoY FY25
        { f: `IF(AND(E${r}<>"",E${r}>0),(POWER(G${r}/E${r},1/2)-1)*100,0)` }, // CAGR
        '',             // Gross Margin %
        '',             // EBITDA Margin %
        '',             // Net Margin %
        '',             // Gross Burn
        { f: `IF(G${r}<>"",G${r}/12,0)` },   // Monthly Rev from annual
        '',             // Net Burn (user fills)
        '',             // Cash
        { f: `IF(P${r}>0,Q${r}/P${r},999)` }, // Runway
        '',             // ARR
        { f: `IF(S${r}<>"",S${r}/12,0)` },    // MRR from ARR
        '',             // NRR %
        '',             // Churn %
        '',             // CAC
        '',             // LTV
        { f: `IF(W${r}>0,X${r}/W${r},0)` },  // LTV:CAC
        { f: `IF(AND(X${r}>0,S${r}>0),W${r}/(S${r}/12*K${r}/100),0)` }, // Payback months
        '',             // GMV
        '',             // Take Rate %
        { f: `IF(AND(AA${r}<>"",AB${r}<>""),AA${r}*AB${r}/100,0)` }, // Implied Rev
        c.employees || '',
        { f: `IF(AND(G${r}<>"",AD${r}>0),G${r}/AD${r},0)` }, // Rev per employee
        '',             // Next Round
        '',             // Target Pre-Money
        { f: `IF(AND(AF${r}<>"",AE${r}<>""),AE${r}+AF${r},0)` }, // Post-Money
        '',             // Expected dilution %
        { f: `IF(AND(AG${r}<>"",F${r}>0),AG${r}*F${r}/100/(${c.cactusInvestment||1}),0)` }, // MOIC at exit
        '',             // Key risks
        '',             // Milestones
        new Date().toISOString().slice(0, 10),
      ]);
    });
    const opWs = XLSX.utils.aoa_to_sheet(opRows);
    opWs['!cols'] = w(opHeaders.length);
    XLSX.utils.book_append_sheet(wb, opWs, 'Operating Metrics');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 7: CAP TABLE SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    const capHeaders = [
      'Company', 'Stage', 'Pre-Money Val (₹Cr)', 'Round Size (₹Cr)', 'Post-Money Val (₹Cr)',
      'Founder % (pre)', 'ESOP Pool %', 'Cactus % (pre-round)', 'Other Investors %',
      'New Investor %', 'Cactus % (post-round)', 'Cactus Dilution %',
      'FMV per Share (₹)', 'Cactus Shares (est.)', 'Cactus Value (₹Cr)',
      'Liquidation Pref (₹Cr)', 'Anti-Dilution Type', 'Pro-Rata Amount (₹Cr)', 'Notes',
    ];
    const capRows: (string | number | { f: string })[][] = [capHeaders];
    companies.forEach((c, i) => {
      const r = i + 2;
      capRows.push([
        c.name, c.stage,
        '',             // Pre-money
        '',             // Round size
        { f: `IF(AND(C${r}<>"",D${r}<>""),C${r}+D${r},0)` }, // Post-money
        '',             // Founder %
        '',             // ESOP %
        c.ownershipPct || '',
        { f: `IF(H${r}<>"",100-F${r}-G${r}-H${r},0)` },       // Other investors
        { f: `IF(AND(D${r}<>"",E${r}>0),D${r}/E${r}*100,0)` }, // New investor %
        { f: `IF(H${r}<>"",H${r}*(1-J${r}/100),0)` },          // Cactus post-dilution
        { f: `IF(AND(H${r}<>"",K${r}<>""),H${r}-K${r},0)` },   // Dilution
        '',             // FMV per share
        '',             // Shares
        { f: `IF(AND(K${r}<>"",C${r}+D${r}>0),K${r}/100*(C${r}+D${r}),0)` }, // Cactus value
        c.cactusInvestment || '',  // Liq pref (1x)
        'Weighted Avg',
        { f: `IF(K${r}<>"",K${r}/100*D${r},0)` },  // Pro-rata
        '',
      ]);
    });
    const capWs = XLSX.utils.aoa_to_sheet(capRows);
    capWs['!cols'] = w(capHeaders.length);
    XLSX.utils.book_append_sheet(wb, capWs, 'Cap Table');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 8: DEAL PIPELINE (for new investments being evaluated)
    // ════════════════════════════════════════════════════════════════════════
    const dealHeaders = [
      'Company', 'Sector', 'Stage', 'Ask Amount (₹Cr)', 'Pre-Money Val (₹Cr)',
      'Post-Money Val (₹Cr)', 'Proposed Ownership %', 'Instrument',
      'Valuation Cap (₹Cr)', 'Discount %', 'Lead / Follow',
      'Entry MOIC Target', 'Exit Val Needed for 3x (₹Cr)', 'Exit Val Needed for 5x (₹Cr)',
      'IRR at 3x (5yr) %', 'IRR at 5x (7yr) %', 'Term Sheet Date', 'Expected Close',
      'DPI Potential (₹Cr)', 'Status', 'Key Risks', 'Notes',
    ];
    const dealRows: (string | number | { f: string })[][] = [dealHeaders];
    // Add 20 empty rows for pipeline
    for (let i = 0; i < 20; i++) {
      const r = i + 2;
      dealRows.push([
        '', '', '', '',
        '',
        { f: `IF(AND(D${r}<>"",E${r}<>""),D${r}+E${r},0)` },    // post-money
        { f: `IF(F${r}>0,D${r}/F${r}*100,0)` },                  // ownership %
        'Equity',
        '', '', 'Lead',
        '',                                                         // target MOIC
        { f: `IF(AND(D${r}<>"",L${r}<>""),D${r}*L${r}/G${r}*100,0)` }, // exit for target
        '',
        { f: `(POWER(3,1/5)-1)*100` },   // IRR at 3x 5yr
        { f: `(POWER(5,1/7)-1)*100` },   // IRR at 5x 7yr
        '', '', '',
        'Evaluating', '', '',
      ]);
    }
    const dealWs = XLSX.utils.aoa_to_sheet(dealRows);
    dealWs['!cols'] = w(dealHeaders.length);
    XLSX.utils.book_append_sheet(wb, dealWs, 'Deal Pipeline');

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 9: SECTOR SHEETS (one per sector, full metrics)
    // ════════════════════════════════════════════════════════════════════════
    for (const sector of sectors) {
      const sCompanies = companies.filter(c => c.sectorId === sector.id);
      const sHeaders = [
        'Company', 'Invested (₹Cr)', 'FMV (₹Cr)', 'Ownership %', 'MOIC',
        'Revenue FY25 (₹Cr)', 'Rev Growth %', 'Gross Margin %', 'Monthly Burn (₹Cr)',
        'Cash (₹Cr)', 'Runway (months)', 'ARR (₹Cr)', 'NRR %', 'CAC (₹)', 'LTV (₹)',
        'LTV:CAC', 'GMV (₹Cr)', 'Headcount', 'Next Round (₹Cr)', 'ESOP Pool %',
        'Liq Pref Type', 'Status', 'Key Risks', 'Next Milestone',
      ];
      const sRows: (string | number | { f: string })[][] = [sHeaders];
      sCompanies.forEach((c, i) => {
        const r = i + 2;
        sRows.push([
          c.name,
          c.cactusInvestment || '',
          c.currentValuation || '',
          c.ownershipPct || '',
          { f: `IF(B${r}>0,C${r}*D${r}/100/B${r},0)` },         // MOIC
          c.revenue || '',
          '',   // Rev growth
          '',   // Gross margin
          '',   // Burn
          '',   // Cash
          { f: `IF(I${r}>0,J${r}/I${r},999)` },                  // Runway
          '',   // ARR
          '',   // NRR
          '',   // CAC
          '',   // LTV
          { f: `IF(N${r}>0,O${r}/N${r},0)` },                    // LTV:CAC
          '',   // GMV
          c.employees || '',
          '',   // Next round
          '',   // ESOP
          '1x Non-participating',
          c.status,
          '',
          '',
        ]);
      });
      const sWs = XLSX.utils.aoa_to_sheet(sRows);
      sWs['!cols'] = w(sHeaders.length);
      XLSX.utils.book_append_sheet(wb, sWs, sector.name.slice(0, 31));
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 10: FUND SUMMARY (top-level overview)
    // ════════════════════════════════════════════════════════════════════════
    const summaryData: (string | number)[][] = [
      ['CACTUS PARTNERS — FUND SUMMARY'],
      [''],
      ['Metric', 'Value', 'Notes'],
      ['Fund Name', store.firm?.name ?? '', ''],
      ['Total Portfolio Companies', companies.length, ''],
      ['Total Capital Deployed (₹Cr)', companies.reduce((s, c) => s + (parseFloat(c.cactusInvestment) || 0), 0).toFixed(2), 'Sum of all investments'],
      ['Total Portfolio FMV (₹Cr)', companies.reduce((s, c) => s + (parseFloat(c.currentValuation) * (parseFloat(String(c.ownershipPct)) / 100) || 0), 0).toFixed(2), 'FMV × Ownership%'],
      ['Weighted Avg MOIC', '', 'From Return Metrics sheet'],
      ['Active Companies', companies.filter(c => c.status === 'Active').length, ''],
      ['Exited Companies', companies.filter(c => c.status === 'Exited').length, ''],
      ['Watch List', companies.filter(c => c.status === 'Watch').length, ''],
      [''],
      ['Sector Breakdown', 'Companies', 'Capital Deployed (₹Cr)'],
      ...sectors.map(s => {
        const sc = companies.filter(c => c.sectorId === s.id);
        const deployed = sc.reduce((sum, c) => sum + (parseFloat(c.cactusInvestment) || 0), 0);
        return [s.name, sc.length, deployed.toFixed(2)];
      }),
      [''],
      ['Stage Breakdown', 'Companies', ''],
      ...['Seed', 'Series A', 'Series B', 'Series C'].map(stage => [
        stage, companies.filter(c => c.stage === stage).length, '',
      ]),
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Fund Summary');

    // ════════════════════════════════════════════════════════════════════════
    // TIME-SERIES SHEETS (long-format — rows accumulate, never restructure)
    // ════════════════════════════════════════════════════════════════════════

    // Generate all FY and CY periods from FY2021 to FY2027
    const FY_YEARS  = ['FY2021','FY2022','FY2023','FY2024','FY2025','FY2026','FY2027'];
    const CY_YEARS  = ['2021','2022','2023','2024','2025','2026','2027'];
    const QUARTERS  = ['Q1','Q2','Q3','Q4'];

    // Build all period labels (annual + quarterly) for FY
    const fyPeriods: string[] = [];
    FY_YEARS.forEach(fy => {
      fyPeriods.push(`${fy}-Annual`);
      QUARTERS.forEach(q => fyPeriods.push(`${fy}-${q}`));
    });
    const cyPeriods: string[] = [];
    CY_YEARS.forEach(cy => {
      cyPeriods.push(`${cy}-Annual`);
      QUARTERS.forEach(q => cyPeriods.push(`${cy}-${q}`));
    });

    const tsColHeaders = [
      'Company Name',           // A — KEY (do not change)
      'Company ID',             // B — KEY (do not change)
      'Year Style',             // C — FY or CY (KEY)
      'Period',                 // D — e.g. FY2024-Q1 (KEY)
      'Period Type',            // E — quarterly / annual
      'Fiscal Year',            // F — FY2024 / 2024
      'Quarter',                // G — Q1/Q2/Q3/Q4 / blank for annual
      // Revenue
      'Revenue (₹Cr)',          // H
      'ARR (₹Cr)',              // I  — Annual Recurring Revenue
      'MRR (₹Cr)',              // J  — Monthly Recurring Revenue
      'GMV (₹Cr)',              // K  — Gross Merchandise Value
      // Growth
      'Revenue Growth YoY %',   // L
      'ARR Growth YoY %',       // M
      'NRR %',                  // N  — Net Revenue Retention
      'Churn % (monthly)',      // O
      // Margins
      'Gross Margin %',         // P
      'EBITDA Margin %',        // Q
      'Net Margin %',           // R
      // Returns
      'Valuation FMV (₹Cr)',    // S  — Fair Market Value at period end
      'MOIC',                   // T
      'IRR %',                  // U  — cumulative IRR to this period
      'Valuation Methodology',  // V
      // Operations
      'Headcount',              // W
      'Monthly Burn (₹Cr)',     // X
      'Cash Balance (₹Cr)',     // Y
      'Runway (months)',        // Z
      // Unit Economics
      'CAC (₹)',                // AA
      'LTV (₹)',                // AB
      'LTV:CAC',                // AC
      // Meta
      'Notes',                  // AD
      'Source',                 // AE — Manual / Excel Sync
      'Updated By',             // AF
      'Updated At',             // AG
    ];

    // ── SHEET: FY Revenue & Operations (Indian Financial Year Apr-Mar) ────────
    // FY Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar
    const fyNote = [
      ['INDIAN FINANCIAL YEAR TIME SERIES — FY Revenue & Operations'],
      [''],
      ['HOW TO USE:'],
      ['• Year Style = FY (Indian Financial Year: April to March)'],
      ['• FY Quarter: Q1=Apr-Jun | Q2=Jul-Sep | Q3=Oct-Dec | Q4=Jan-Mar'],
      ['• Each row = one company + one period. ADD new rows at the bottom — never delete old ones.'],
      ['• Composite KEY = Company ID + Year Style + Period (columns B+C+D). Do not change these.'],
      ['• SYNC: Save this file to SharePoint → Admin → Data Sync → Sync Now'],
      ['• CONFLICT RULE: Only one person edits this sheet at a time. Use CY sheet for calendar year.'],
      [''],
    ];
    const fyTsRows: (string | number)[][] = [...fyNote, tsColHeaders];
    // All periods from FY2023 to FY2027 (annual + quarterly)
    const allFyPeriods = [
      'FY2023-Annual',
      'FY2024-Q1','FY2024-Q2','FY2024-Q3','FY2024-Q4','FY2024-Annual',
      'FY2025-Q1','FY2025-Q2','FY2025-Q3','FY2025-Q4','FY2025-Annual',
      'FY2026-Q1','FY2026-Q2','FY2026-Q3','FY2026-Q4','FY2026-Annual',
      'FY2027-Q1','FY2027-Q2',
    ];
    companies.forEach(c => {
      allFyPeriods.forEach(period => {
        const [fy, qOrAnn] = period.split('-');
        const isAnnual = qOrAnn === 'Annual';
        const d = findPeriod(c.id, period);
        fyTsRows.push([
          c.name, c.id, 'FY', period,
          isAnnual ? 'annual' : 'quarterly',
          fy, isAnnual ? '' : qOrAnn,
          d?.revenue ?? '',        d?.arr ?? '',           d?.mrr ?? '',         d?.gmv ?? '',
          d?.revenueGrowthYoY ?? '',d?.arrGrowthYoY ?? '',d?.nrr ?? '',         d?.churnPct ?? '',
          d?.grossMarginPct ?? '', d?.ebitdaMarginPct ?? '',d?.netMarginPct ?? '',
          d?.currentValuation ?? '',d?.moic ?? '',         d?.irr ?? '',
          d?.methodology ?? (d ? 'Last Round' : ''),
          d?.headcount ?? '',      d?.monthlyBurn ?? '',   d?.cash ?? '',        d?.runway ?? '',
          d?.cac ?? '',            d?.ltv ?? '',           d?.ltvCacRatio ?? '',
          d?.notes ?? '',          d?.source ?? (d ? 'Default Data' : ''),
          d?.updatedBy ?? '',      d?.updatedAt ?? '',
        ]);
      });
    });
    // Blank rows for future additions
    for (let i = 0; i < 30; i++) fyTsRows.push(Array(tsColHeaders.length).fill(''));

    const fyTsWs = XLSX.utils.aoa_to_sheet(fyTsRows);
    fyTsWs['!cols'] = w(tsColHeaders.length);
    XLSX.utils.book_append_sheet(wb, fyTsWs, 'FY Revenue & Ops');

    // ── SHEET: FY Returns (Valuation / MOIC / IRR quarterly marks) ───────────
    const fyRetNote = [
      ['INDIAN FINANCIAL YEAR — Quarterly Valuation Marks (MOIC / IRR)'],
      [''],
      ['HOW TO USE:'],
      ['• Mark fair market value at the END of each quarter for each company.'],
      ['• Portfolio team owns this sheet — finance team owns FY Revenue & Ops.'],
      ['• Add rows at the bottom for new periods. Never delete historical marks.'],
      [''],
    ];
    const fyRetHeaders = [
      'Company Name', 'Company ID', 'Year Style', 'Period', 'Period Type',
      'Fiscal Year', 'Quarter',
      'Pre-Money Val at Entry (₹Cr)', 'Investment Amount (₹Cr)', 'Cactus Ownership %',
      'FMV at Period End (₹Cr)', 'MOIC', 'IRR %',
      'Valuation Methodology', 'Lead Round', 'New Round Size (₹Cr)',
      'Notes', 'Marked By', 'Marked At',
    ];
    const fyRetRows: (string | number)[][] = [...fyRetNote, fyRetHeaders];
    companies.forEach(c => {
      ['FY2023-Annual','FY2024-Q1','FY2024-Q2','FY2024-Q3','FY2024-Q4','FY2024-Annual','FY2025-Q1','FY2025-Q2'].forEach(period => {
        const [fy, qOrAnn] = period.split('-');
        const isAnnual = qOrAnn === 'Annual';
        const existing = findPeriod(c.id, period);
        fyRetRows.push([
          c.name, c.id, 'FY', period,
          isAnnual ? 'annual' : 'quarterly', fy, isAnnual ? '' : qOrAnn,
          '',
          c.cactusInvestment || '',
          existing?.moic ? '' : (c.ownershipPct || ''),
          existing?.currentValuation ?? (c.currentValuation || ''),
          existing?.moic ?? (c.moic || ''),
          existing?.irr  ?? (c.irr  || ''),
          existing?.methodology ?? 'Last Round',
          '', '',
          existing?.notes ?? '', existing?.updatedBy ?? '', existing?.updatedAt ?? '',
        ]);
      });
    });
    for (let i = 0; i < 30; i++) fyRetRows.push(Array(fyRetHeaders.length).fill(''));

    const fyRetWs = XLSX.utils.aoa_to_sheet(fyRetRows);
    fyRetWs['!cols'] = w(fyRetHeaders.length);
    XLSX.utils.book_append_sheet(wb, fyRetWs, 'FY Returns (MOIC-IRR)');

    // ── SHEET: CY Revenue (Calendar Year Jan-Dec) ─────────────────────────────
    const cyNote = [
      ['CALENDAR YEAR TIME SERIES — CY Revenue & Operations (Jan-Dec)'],
      [''],
      ['HOW TO USE:'],
      ['• Year Style = CY (Calendar Year: January to December)'],
      ['• CY Quarter: Q1=Jan-Mar | Q2=Apr-Jun | Q3=Jul-Sep | Q4=Oct-Dec'],
      ['• Use this sheet if your company reports in calendar year instead of Indian FY.'],
      ['• Same composite KEY rule: Company ID + CY + Period.'],
      [''],
    ];
    const cyTsRows: (string | number)[][] = [...cyNote, tsColHeaders];
    const existingCyPeriods = store.financialPeriods?.filter(p => p.yearStyle === 'CY') ?? [];
    companies.forEach(c => {
      ['2023-Annual','2024-Q1','2024-Q2','2024-Q3','2024-Q4','2024-Annual','2025-Q1','2025-Q2'].forEach(period => {
        const [cy, qOrAnn] = period.split('-');
        const isAnnual = qOrAnn === 'Annual';
        const existing = existingCyPeriods.find(p => p.companyId === c.id && p.periodLabel === period);
        cyTsRows.push([
          c.name, c.id, 'CY', period,
          isAnnual ? 'annual' : 'quarterly', cy, isAnnual ? '' : qOrAnn,
          existing?.revenue ?? '', existing?.arr ?? '', existing?.mrr ?? '',
          existing?.gmv ?? '', existing?.revenueGrowthYoY ?? '', existing?.arrGrowthYoY ?? '',
          existing?.nrr ?? '', existing?.churnPct ?? '',
          existing?.grossMarginPct ?? '', existing?.ebitdaMarginPct ?? '', existing?.netMarginPct ?? '',
          existing?.currentValuation ?? '', existing?.moic ?? '', existing?.irr ?? '',
          existing?.methodology ?? 'Last Round',
          existing?.headcount ?? '', existing?.monthlyBurn ?? '',
          existing?.cash ?? '', existing?.runway ?? '',
          existing?.cac ?? '', existing?.ltv ?? '', existing?.ltvCacRatio ?? '',
          existing?.notes ?? '', existing?.source ?? 'Manual',
          existing?.updatedBy ?? '', existing?.updatedAt ?? '',
        ]);
      });
    });
    for (let i = 0; i < 30; i++) cyTsRows.push(Array(tsColHeaders.length).fill(''));

    const cyTsWs = XLSX.utils.aoa_to_sheet(cyTsRows);
    cyTsWs['!cols'] = w(tsColHeaders.length);
    XLSX.utils.book_append_sheet(wb, cyTsWs, 'CY Revenue & Ops');

    // ── SHEET: Periods Reference (all valid period labels) ────────────────────
    const refRows: string[][] = [
      ['VALID PERIOD LABELS — Copy from this sheet into Period column'],
      [''],
      ['FY Periods (Indian Apr-Mar)', '', 'CY Periods (Calendar Jan-Dec)'],
      ...fyPeriods.map((fy, i) => [fy, '', cyPeriods[i] ?? '']),
    ];
    const refWs = XLSX.utils.aoa_to_sheet(refRows);
    refWs['!cols'] = [{ wch: 25 }, { wch: 5 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, refWs, 'Period Reference');

    // ── Download ──────────────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Cactus_MasterSheet_${today}.xlsx`);
    const ts = new Date().toLocaleString('en-IN');
    localStorage.setItem(LS_KEY, ts);
    setLastDownloaded(ts);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Download Master Sheet</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-3">
            Complete Excel workbook with all VC metrics, formulas, and calculations.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { sheet: 'Glossary', desc: 'All VC terms + formula reference' },
              { sheet: 'Return Metrics', desc: 'MOIC, IRR, DPI, RVPI, TVPI per company' },
              { sheet: 'Fund Performance', desc: 'DPI/TVPI + full waterfall calculator' },
              { sheet: 'J-Curve', desc: 'Year-by-year fund performance tracker' },
              { sheet: 'LP Economics', desc: 'Per-LP DPI, carry, preferred return' },
              { sheet: 'Operating Metrics', desc: 'ARR, NRR, CAC, LTV, burn, runway' },
              { sheet: 'Cap Table', desc: 'Dilution, pro-rata, liquidation pref' },
              { sheet: 'Deal Pipeline', desc: 'New deals — IRR targets, exit scenarios' },
              { sheet: '11 Sector Sheets', desc: 'One sheet per sector with full metrics' },
              { sheet: 'Fund Summary', desc: 'Top-level overview with breakdowns' },
            ].map(s => (
              <div key={s.sheet} className="bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100">
                <p className="font-semibold text-[#1C4B42]">{s.sheet}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>

          {lastDownloaded && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={12} />
              Last downloaded: {lastDownloaded}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#1C4B42' }}
      >
        <Download size={16} style={{ color: '#86CA0F' }} />
        Download Master Sheet (10 sheets + {store.sectors?.length ?? 0} sector sheets)
      </button>

      <p className="text-xs text-gray-400 text-center">
        Yellow cells = fill in. Green cells = auto-calculated by Excel formula. Upload to SharePoint → sync via Data Sync tab.
      </p>
    </div>
  );
}
