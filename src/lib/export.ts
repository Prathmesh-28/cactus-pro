/**
 * Export library — PDF (jsPDF + autotable) and Excel (xlsx)
 * Covers: Portfolio Summary, Individual Company Report, Finance Summary, Deal Pipeline
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AppStore, PortfolioCompany } from '../data/types';

// ─── Brand colours ────────────────────────────────────────────────────────────
const C = {
  dark:    [10,  35,  33]  as [number,number,number],  // #0A2321
  primary: [28,  75,  66]  as [number,number,number],  // #1C4B42
  lime:    [134, 202, 15]  as [number,number,number],  // #86CA0F
  bg:      [246, 250, 247] as [number,number,number],  // #F6FAF7
  border:  [210, 219, 217] as [number,number,number],  // #D2DBD9
  text:    [25,  28,  20]  as [number,number,number],  // #191c14
  muted:   [85,  89,  81]  as [number,number,number],  // #555951
  white:   [255, 255, 255] as [number,number,number],
};

const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── Shared PDF helpers ───────────────────────────────────────────────────────

function addHeader(doc: jsPDF, title: string, subtitle: string, firmName: string) {
  const W = doc.internal.pageSize.getWidth();
  // Dark green header band
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 28, 'F');
  // Lime accent strip
  doc.setFillColor(...C.lime);
  doc.rect(0, 28, W, 2.5, 'F');
  // Firm name (left)
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(firmName.toUpperCase(), 14, 11);
  // Title (left)
  doc.setFontSize(16);
  doc.text(title, 14, 22);
  // Date (right)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${today()}`, W - 14, 11, { align: 'right' });
  // Subtitle (right)
  doc.setFontSize(9);
  doc.text(subtitle, W - 14, 22, { align: 'right' });
  doc.setTextColor(...C.text);
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...C.bg);
  doc.rect(14, y, doc.internal.pageSize.getWidth() - 28, 7, 'F');
  doc.setTextColor(...C.primary);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 16, y + 5);
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  return y + 10;
}

function kpiRow(doc: jsPDF, items: { label: string; value: string }[], y: number): number {
  const W = doc.internal.pageSize.getWidth();
  const colW = (W - 28) / items.length;
  items.forEach((item, i) => {
    const x = 14 + i * colW;
    doc.setFillColor(...C.bg);
    doc.roundedRect(x, y, colW - 3, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label.toUpperCase(), x + 4, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(...C.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + 4, y + 13);
  });
  doc.setTextColor(...C.text);
  doc.setFont('helvetica', 'normal');
  return y + 20;
}

const TABLE_STYLES = {
  headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold' as const, fontSize: 8 },
  bodyStyles: { fontSize: 8, textColor: C.text },
  alternateRowStyles: { fillColor: C.bg },
  margin: { left: 14, right: 14 },
  styles: { lineColor: C.border, lineWidth: 0.1 },
};

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...C.border);
    doc.line(14, H - 10, W - 14, H - 10);
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text('CONFIDENTIAL — Internal use only', 14, H - 5);
    doc.text(`Page ${i} of ${pages}`, W - 14, H - 5, { align: 'right' });
  }
}

// ─── 1. PORTFOLIO SUMMARY — PDF ───────────────────────────────────────────────

export function exportPortfolioPDF(store: AppStore) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { firm, companies, fundMetrics } = store;

  addHeader(doc, 'Portfolio Summary', `${companies.filter(c=>c.status!=='Exited').length} Active Companies`, firm.name);

  let y = 36;

  // KPI strip
  const aum  = fundMetrics.find(m => m.label.includes('AUM'))?.value ?? '—';
  const moic = fundMetrics.find(m => m.label.toLowerCase().includes('moic'))?.value ?? '—';
  const irr  = fundMetrics.find(m => m.label.toLowerCase().includes('irr'))?.value ?? '—';
  const cos  = String(companies.filter(c=>c.status!=='Exited').length);
  y = kpiRow(doc, [
    { label: 'Total AUM', value: aum },
    { label: 'Active Companies', value: cos },
    { label: 'Avg. MOIC', value: moic },
    { label: 'Avg. IRR', value: irr },
  ], y);

  y = addSectionTitle(doc, 'Portfolio Companies', y);

  const rows = companies.map(c => [
    c.name,
    store.sectors.find(s=>s.id===c.sectorId)?.name ?? '—',
    c.stage,
    c.hqCity,
    c.ceoName,
    c.cactusInvestment || '—',
    c.currentValuation || '—',
    `${c.ownershipPct}%`,
    c.moic > 0 ? `${c.moic}x` : '—',
    c.irr  > 0 ? `${c.irr}%`  : '—',
    c.revenue || '—',
    c.status,
  ]);

  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y,
    head: [['Company','Sector','Stage','HQ','CEO / Founder','Cactus Inv.','Valuation','Ownership','MOIC','IRR','Revenue','Status']],
    body: rows,
    didParseCell(data) {
      if (data.column.index === 11) { // Status
        const v = String(data.cell.raw);
        if (v === 'Active') data.cell.styles.textColor = [6, 95, 70];
        else if (v === 'Watch') data.cell.styles.textColor = [180, 83, 9];
        else if (v === 'Exited') data.cell.styles.textColor = [100, 100, 100];
      }
    },
  });

  addFooter(doc);
  doc.save(`${firm.name} Portfolio Summary ${new Date().getFullYear()}.pdf`);
}

// ─── 2. PORTFOLIO SUMMARY — Excel ────────────────────────────────────────────

export function exportPortfolioExcel(store: AppStore) {
  const { firm, companies, sectors, fundMetrics, lps } = store;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overview = [
    ['CACTUS PARTNERS — PORTFOLIO SUMMARY'],
    [`Generated: ${today()}`],
    [],
    ['FUND METRICS'],
    ...fundMetrics.filter(m=>m.visible).map(m => [m.label, m.value, m.delta]),
    [],
    ['COMPANY COUNT', companies.filter(c=>c.status!=='Exited').length],
    ['SECTORS COVERED', [...new Set(companies.map(c=>c.sectorId))].length],
  ];
  const ws0 = XLSX.utils.aoa_to_sheet(overview);
  ws0['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws0, 'Overview');

  // Sheet 2: Companies
  const headers = ['Company','Sector','Stage','Status','HQ City','Country','CEO','Founded',
    'Total Funding','Cactus Investment','Current Valuation','Ownership %','MOIC','IRR %',
    'Revenue','EBITDA','Employees','Website'];
  const compRows = companies.map(c => [
    c.name, sectors.find(s=>s.id===c.sectorId)?.name??'', c.stage, c.status,
    c.hqCity, c.country, c.ceoName, c.foundedYear,
    c.totalFunding, c.cactusInvestment, c.currentValuation, c.ownershipPct,
    c.moic, c.irr, c.revenue, c.ebitda, c.employees, c.websiteUrl,
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...compRows]);
  ws1['!cols'] = headers.map((_,i) => ({ wch: i < 2 ? 28 : 16 }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Portfolio Companies');

  // Sheet 3: Financial History (all companies)
  const finHeaders = ['Company','Year','Revenue','Net Profit','EBITDA','EBITDA Margin','Total Assets','Total Debt','Employees'];
  const finRows = companies.flatMap(c =>
    c.financialHistory.map(h => [c.name, h.year, h.revenue, h.netProfit, h.ebitda, h.ebitdaMargin, h.totalAssets, h.totalDebt, h.employees])
  );
  const ws2 = XLSX.utils.aoa_to_sheet([finHeaders, ...finRows]);
  ws2['!cols'] = finHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Financial History');

  // Sheet 4: Cap Tables
  const capHeaders = ['Company','Investor','Category','Holding %','Investment','Shares'];
  const capRows = companies.flatMap(c =>
    c.capTable.map(e => [c.name, e.investor, e.category, e.holdingPct, e.investment, e.shares])
  );
  const ws3 = XLSX.utils.aoa_to_sheet([capHeaders, ...capRows]);
  ws3['!cols'] = [{ wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Cap Tables');

  // Sheet 5: Funding Rounds
  const frHeaders = ['Company','Date','Round','Amount','Post-Money Val.','Lead Investors'];
  const frRows = companies.flatMap(c =>
    c.fundingRounds.map(r => [c.name, r.date, r.roundName, r.amount, r.postMoneyValuation, r.leadInvestors.join(', ')])
  );
  const ws4 = XLSX.utils.aoa_to_sheet([frHeaders, ...frRows]);
  ws4['!cols'] = frHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws4, 'Funding Rounds');

  // Sheet 6: LP Data
  if (lps.length) {
    const lpH = ['LP Name','Commitment','Called','Distributed','NAV'];
    const ws5 = XLSX.utils.aoa_to_sheet([lpH, ...lps.map(l=>[l.name,l.commitment,l.called,l.distributed,l.nav])]);
    ws5['!cols'] = lpH.map(()=>({wch:20}));
    XLSX.utils.book_append_sheet(wb, ws5, 'Limited Partners');
  }

  XLSX.writeFile(wb, `${firm.name} Portfolio ${new Date().getFullYear()}.xlsx`);
}

// ─── 3. INDIVIDUAL COMPANY REPORT — PDF ──────────────────────────────────────

export function exportCompanyPDF(company: PortfolioCompany, store: AppStore) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { firm, sectors } = store;
  const sector = sectors.find(s => s.id === company.sectorId)?.name ?? '—';

  addHeader(doc, company.name, `${sector} · ${company.stage} · ${company.status}`, firm.name);

  let y = 36;

  // KPI row
  y = kpiRow(doc, [
    { label: 'Cactus Investment', value: company.cactusInvestment || '—' },
    { label: 'Current Valuation', value: company.currentValuation || '—' },
    { label: 'Ownership', value: `${company.ownershipPct}%` },
    { label: 'MOIC', value: company.moic > 0 ? `${company.moic}x` : '—' },
    { label: 'IRR', value: company.irr > 0 ? `${company.irr}%` : '—' },
  ], y);

  // Company details
  y = addSectionTitle(doc, 'Company Details', y);
  const details = [
    ['CEO / Founder', company.ceoName],
    ['Headquarters', `${company.hqCity}, ${company.country}`],
    ['Founded', String(company.foundedYear || '—')],
    ['Website', company.websiteUrl || '—'],
    ['Legal Entity', company.legalEntityName || '—'],
    ['CIN', company.cin || '—'],
    ['Total Funding', company.totalFunding || '—'],
    ['Revenue', company.revenue || '—'],
    ['EBITDA', company.ebitda || '—'],
    ['Employees', String(company.employees || '—')],
  ].filter(r => r[1] && r[1] !== '—');

  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y,
    head: [],
    body: details,
    columnStyles: { 0: { fontStyle: 'bold', fillColor: C.bg, cellWidth: 45 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // About
  if (company.longDescription) {
    y = addSectionTitle(doc, 'About', y);
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(company.longDescription, doc.internal.pageSize.getWidth() - 28);
    doc.text(lines, 14, y);
    y += (lines.length * 4.5) + 6;
  }

  // Financial history
  if (company.financialHistory.length > 0) {
    y = addSectionTitle(doc, 'Financial History', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Year','Revenue','Net Profit','EBITDA','Margin','Assets','Debt','Employees']],
      body: company.financialHistory.map(h => [h.year,h.revenue,h.netProfit,h.ebitda,h.ebitdaMargin,h.totalAssets,h.totalDebt,h.employees||'—']),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Funding rounds
  if (company.fundingRounds.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Funding Rounds', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Date','Round','Amount','Post-Money','Lead Investors']],
      body: company.fundingRounds.map(r => [r.date, r.roundName, r.amount, r.postMoneyValuation, r.leadInvestors.join(', ')]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Cap table
  if (company.capTable.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Cap Table', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Investor','Category','Holding %','Investment','Shares']],
      body: company.capTable.map(e => [e.investor, e.category, `${e.holdingPct}%`, e.investment, e.shares]),
      didParseCell(data) {
        if (data.row.raw && String((data.row.raw as string[])[0]).includes('Cactus'))
          data.cell.styles.textColor = C.primary;
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Key people
  if (company.keyPeople.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Key People', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Name','Title','Background']],
      body: company.keyPeople.map(p => [p.name, p.title, p.background]),
      columnStyles: { 2: { cellWidth: 'auto' } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Patents
  if (company.patents.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Patents', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Title','Status','Location','Filed','Granted']],
      body: company.patents.map(p => [p.title, p.status, p.filingLocation, p.applicationDate, p.grantDate]),
    });
  }

  // IPO plans
  if (company.ipoPlans) {
    doc.addPage();
    y = 20;
    y = addSectionTitle(doc, 'IPO / Exit Plans', y);
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(company.ipoPlans, doc.internal.pageSize.getWidth() - 28), 14, y);
  }

  addFooter(doc);
  doc.save(`${company.name} — Company Report.pdf`);
}

// ─── 4. COMPANY REPORT — Excel ────────────────────────────────────────────────

export function exportCompanyExcel(company: PortfolioCompany, store: AppStore) {
  const wb = XLSX.utils.book_new();
  const sector = store.sectors.find(s => s.id === company.sectorId)?.name ?? '';

  // Summary sheet
  const summary = [
    [company.name],
    [sector, company.stage, company.status],
    [],
    ['CEO', company.ceoName], ['HQ', `${company.hqCity}, ${company.country}`],
    ['Founded', company.foundedYear], ['Website', company.websiteUrl],
    ['Total Funding', company.totalFunding], ['Cactus Investment', company.cactusInvestment],
    ['Current Valuation', company.currentValuation], ['Ownership %', company.ownershipPct],
    ['MOIC', company.moic], ['IRR %', company.irr],
    ['Revenue', company.revenue], ['EBITDA', company.ebitda], ['Employees', company.employees],
    [], ['About'], [company.longDescription],
  ];
  const ws0 = XLSX.utils.aoa_to_sheet(summary);
  ws0['!cols'] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws0, 'Summary');

  if (company.financialHistory.length) {
    const h = ['Year','Revenue','Net Profit','EBITDA','EBITDA Margin','Total Assets','Total Debt','Employees'];
    const ws = XLSX.utils.aoa_to_sheet([h, ...company.financialHistory.map(r=>[r.year,r.revenue,r.netProfit,r.ebitda,r.ebitdaMargin,r.totalAssets,r.totalDebt,r.employees])]);
    ws['!cols'] = h.map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb, ws, 'Financial History');
  }
  if (company.fundingRounds.length) {
    const h = ['Date','Round','Amount','Post-Money Valuation','Lead Investors','All Investors'];
    const ws = XLSX.utils.aoa_to_sheet([h, ...company.fundingRounds.map(r=>[r.date,r.roundName,r.amount,r.postMoneyValuation,r.leadInvestors.join(', '),r.allInvestors.join(', ')])]);
    ws['!cols'] = h.map(()=>({wch:22}));
    XLSX.utils.book_append_sheet(wb, ws, 'Funding Rounds');
  }
  if (company.capTable.length) {
    const h = ['Investor','Category','Holding %','Investment','Shares'];
    const ws = XLSX.utils.aoa_to_sheet([h, ...company.capTable.map(e=>[e.investor,e.category,e.holdingPct,e.investment,e.shares])]);
    ws['!cols'] = h.map(()=>({wch:20}));
    XLSX.utils.book_append_sheet(wb, ws, 'Cap Table');
  }
  if (company.keyPeople.length) {
    const h = ['Name','Title','Background'];
    const ws = XLSX.utils.aoa_to_sheet([h, ...company.keyPeople.map(p=>[p.name,p.title,p.background])]);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Key People');
  }
  if (company.patents.length) {
    const h = ['Title','Status','Location','Application Date','Grant Date'];
    const ws = XLSX.utils.aoa_to_sheet([h, ...company.patents.map(p=>[p.title,p.status,p.filingLocation,p.applicationDate,p.grantDate])]);
    ws['!cols'] = [{ wch: 50 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Patents');
  }

  XLSX.writeFile(wb, `${company.name} — Report.xlsx`);
}

// ─── 5. FINANCE SUMMARY — PDF ─────────────────────────────────────────────────

export function exportFinancePDF(store: AppStore) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { firm, fundMetrics, lps, companies, portfolioSnapshot, cashFlow } = store;

  addHeader(doc, 'Finance Summary', `Fund Performance Report`, firm.name);
  let y = 36;

  // Fund metrics KPI strip
  const vis = fundMetrics.filter(m => m.visible).slice(0, 5);
  if (vis.length) {
    y = kpiRow(doc, vis.map(m => ({ label: m.label, value: m.value })), y);
  }

  // LP Table
  if (lps.length) {
    y = addSectionTitle(doc, 'Limited Partners', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['LP Name','Commitment','Capital Called','Distributed','NAV']],
      body: lps.map(l => [l.name, l.commitment, l.called, l.distributed, l.nav]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Portfolio Snapshot
  const snap = (portfolioSnapshot ?? []).map(row => {
    const co = companies.find(c => c.id === row.companyId);
    const fmt = (n: number | null) => n === null ? '—' : `₹${(n/1e7).toFixed(2)} Cr`;
    return [co?.name ?? row.companyId, row.dateOfFirstInvestment, fmt(row.currentStake), fmt(row.currentEquityValue), fmt(row.valueOfInvestment), `${row.moic}x`, `${row.irr}%`];
  });
  if (snap.length) {
    if (y > 150) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Portfolio Snapshot', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Company','Date Invested','Current Stake','Equity Value','Inv. Value','MOIC','IRR']],
      body: snap,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Cash flow
  if (cashFlow.length) {
    if (y > 150) { doc.addPage(); y = 20; }
    y = addSectionTitle(doc, 'Fund Cash Flow', y);
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      head: [['Quarter','Contributions (₹ Cr)','Distributions (₹ Cr)','NAV (₹ Cr)']],
      body: cashFlow.map(cf => [cf.quarter, cf.contributions, cf.distributions, cf.nav]),
    });
  }

  addFooter(doc);
  doc.save(`${firm.name} Finance Summary ${new Date().getFullYear()}.pdf`);
}

// ─── 6. FINANCE SUMMARY — Excel ──────────────────────────────────────────────

export function exportFinanceExcel(store: AppStore) {
  const { firm, fundMetrics, lps, cashFlow, companies, portfolioSnapshot } = store;
  const wb = XLSX.utils.book_new();

  // Fund Metrics
  const ws0 = XLSX.utils.aoa_to_sheet([
    ['FUND METRICS'],
    [`Generated: ${today()}`],
    [],
    ['Metric','Value','Change'],
    ...fundMetrics.filter(m=>m.visible).map(m=>[m.label, m.value, m.delta]),
  ]);
  ws0['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws0, 'Fund Metrics');

  // LP Table
  if (lps.length) {
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['LP Name','Commitment','Capital Called','Distributed','NAV'],
      ...lps.map(l=>[l.name,l.commitment,l.called,l.distributed,l.nav]),
    ]);
    ws1['!cols'] = Array(5).fill({ wch: 22 });
    XLSX.utils.book_append_sheet(wb, ws1, 'Limited Partners');
  }

  // Portfolio Snapshot
  if (portfolioSnapshot?.length) {
    const fmt = (n: number | null) => n === null ? '' : n / 1e7;
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Company','Date of First Investment','Current Stake (₹ Cr)','Current Equity Value (₹ Cr)','Value of Investment (₹ Cr)','MOIC (x)','IRR (%)'],
      ...portfolioSnapshot.map(row => {
        const co = companies.find(c => c.id === row.companyId);
        return [co?.name ?? row.companyId, row.dateOfFirstInvestment, fmt(row.currentStake), fmt(row.currentEquityValue), fmt(row.valueOfInvestment), row.moic, row.irr];
      }),
    ]);
    ws2['!cols'] = [{ wch: 26 }, { wch: 22 }, ...Array(5).fill({ wch: 20 })];
    XLSX.utils.book_append_sheet(wb, ws2, 'Portfolio Snapshot');
  }

  // Cash Flow
  if (cashFlow.length) {
    const ws3 = XLSX.utils.aoa_to_sheet([
      ['Quarter','Contributions (₹ Cr)','Distributions (₹ Cr)','NAV (₹ Cr)'],
      ...cashFlow.map(cf=>[cf.quarter, cf.contributions, cf.distributions, cf.nav]),
    ]);
    ws3['!cols'] = Array(4).fill({ wch: 24 });
    XLSX.utils.book_append_sheet(wb, ws3, 'Cash Flow');
  }

  XLSX.writeFile(wb, `${firm.name} Finance Summary ${new Date().getFullYear()}.xlsx`);
}

// ─── 7. DEAL PIPELINE — Excel ─────────────────────────────────────────────────

export function exportPipelineExcel(store: AppStore) {
  const { firm, deals, sectors, people } = store;
  const wb = XLSX.utils.book_new();

  const headers = ['Company','Sector','Stage','Ticket Size','Lead Partner','Date Added','Notes'];
  const rows = deals.map(d => [
    d.companyName,
    sectors.find(s=>s.id===d.sectorId)?.name ?? '—',
    d.stage,
    d.ticketSize,
    people.find(p=>p.id===d.leadPartnerId)?.name ?? '—',
    d.dateAdded,
    d.notes,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Deal Pipeline');

  // Summary by stage
  const stages = [...new Set(deals.map(d=>d.stage))];
  const stageSummary = stages.map(s => [s, deals.filter(d=>d.stage===s).length]);
  const ws2 = XLSX.utils.aoa_to_sheet([['Stage','Count'], ...stageSummary]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Stage Summary');

  XLSX.writeFile(wb, `${firm.name} Deal Pipeline ${new Date().getFullYear()}.xlsx`);
}

// ─── 8. DEAL PIPELINE — PDF ───────────────────────────────────────────────────

export function exportPipelinePDF(store: AppStore) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { firm, deals, sectors, people } = store;

  addHeader(doc, 'Deal Pipeline', `${deals.length} Deals`, firm.name);
  let y = 36;

  // Stage summary KPIs
  const stages = ['Sourcing','Due Diligence','IC Review','Term Sheet','Closed','Passed'];
  const kpis = stages.map(s => ({ label: s, value: String(deals.filter(d=>d.stage===s).length) }));
  y = kpiRow(doc, kpis.slice(0, 6), y);

  y = addSectionTitle(doc, 'All Deals', y);
  autoTable(doc, {
    ...TABLE_STYLES,
    startY: y,
    head: [['Company','Sector','Stage','Ticket Size','Lead Partner','Date Added','Notes']],
    body: deals.map(d => [
      d.companyName,
      sectors.find(s=>s.id===d.sectorId)?.name ?? '—',
      d.stage,
      d.ticketSize,
      people.find(p=>p.id===d.leadPartnerId)?.name ?? '—',
      d.dateAdded,
      d.notes,
    ]),
    didParseCell(data) {
      if (data.column.index === 2) {
        const stage = String(data.cell.raw);
        if (stage === 'Closed') data.cell.styles.textColor = [6, 95, 70];
        else if (stage === 'Passed') data.cell.styles.textColor = [150, 50, 50];
        else if (stage === 'Term Sheet') data.cell.styles.textColor = [180, 83, 9];
      }
    },
  });

  addFooter(doc);
  doc.save(`${firm.name} Deal Pipeline ${new Date().getFullYear()}.pdf`);
}

// ─── Shared dropdown component helper ────────────────────────────────────────
export type ExportFormat = 'pdf' | 'excel';

// ─── Fund Investment Ledger — PDF ─────────────────────────────────────────────

export function exportFundLedgerPDF(
  investments: import('../data/types').FundInvestment[],
  companies: import('../data/types').PortfolioCompany[],
  firmName: string,
  fundFilter: string = 'All Funds',
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  void doc.internal.pageSize.getWidth();

  addHeader(doc, 'Fund Investment Ledger', `${fundFilter} · ${today()}`, firmName);

  const cMap = Object.fromEntries(companies.map(c => [c.id, c.name]));
  const list = fundFilter === 'All Funds'
    ? investments
    : investments.filter(i => i.fund === fundFilter);

  // ── Summary strip ────────────────────────────────────────────────────────────
  const totalInv = list.reduce((s, i) => s + parseFloat(i.totalInvested || '0'), 0);
  const totalFMV = list.reduce((s, i) => s + parseFloat(i.currentFMV || '0'), 0);
  const blendedMOIC = totalInv > 0 ? totalFMV / totalInv : 0;
  const weightedIRR = list.length
    ? list.reduce((s, i) => s + parseFloat(i.irr || '0') * parseFloat(i.totalInvested || '0'), 0) / (totalInv || 1)
    : 0;
  const distributions = list.reduce((s, i) => s + parseFloat(i.realizedValue || '0'), 0);

  let y = 34;
  y = kpiRow(doc, [
    { label: 'Total Invested',   value: `₹${totalInv.toFixed(2)} Cr` },
    { label: 'Total FMV (NAV)',  value: `₹${totalFMV.toFixed(2)} Cr` },
    { label: 'Blended MOIC',     value: `${blendedMOIC.toFixed(2)}x` },
    { label: 'Weighted Avg IRR', value: `${weightedIRR.toFixed(1)}%` },
    { label: 'Distributions',    value: `₹${distributions.toFixed(2)} Cr` },
    { label: 'Companies',        value: String(list.length) },
  ], y);

  y += 6;

  // ── Fund 1 section ──────────────────────────────────────────────────────────
  const funds = fundFilter === 'All Funds'
    ? ['Fund 1', 'Fund 2']
    : [fundFilter];

  for (const fund of funds) {
    const fundList = list.filter(i => i.fund === fund);
    if (!fundList.length) continue;

    y = addSectionTitle(doc, `${fund} — ${fundList.length} Investment${fundList.length !== 1 ? 's' : ''}`, y);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7, cellPadding: 2.5, font: 'helvetica', overflow: 'linebreak' },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [246, 250, 247] },
      head: [[
        '#', 'Company', 'Stage at Entry', 'Inv. Date', '1st Cheque (₹Cr)',
        'Follow-ons', 'Total (₹Cr)', 'Ownership %',
        'FMV (₹Cr)', 'Val (₹Cr)', 'MOIC', 'IRR %',
        'Revenue (₹Cr)', 'Rev Growth', 'Burn (₹Cr/mo)', 'Runway',
        'Status', 'Lead/Follow', 'Board',
      ]],
      body: fundList.map((inv, idx) => [
        idx + 1,
        cMap[inv.companyId] ?? inv.companyId,
        inv.stageAtEntry,
        inv.investmentDate,
        inv.firstCheque,
        inv.followOns?.length ?? 0,
        inv.totalInvested,
        inv.currentOwnership,
        inv.currentFMV,
        inv.currentValuation,
        `${inv.moic}x`,
        `${inv.irr}%`,
        inv.revenue || '—',
        inv.revenueGrowthYoY ? `${inv.revenueGrowthYoY}%` : '—',
        inv.monthlyBurn || '—',
        inv.runway ? `${inv.runway}mo` : '—',
        inv.status,
        inv.leadOrFollow,
        inv.boardSeat ? '✓' : '—',
      ]),
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 10) {
          const moic = parseFloat(String(data.cell.raw));
          if (moic >= 3) data.cell.styles.textColor = [6, 95, 70];
          else if (moic >= 2) data.cell.styles.textColor = [180, 83, 9];
          else if (moic < 1) data.cell.styles.textColor = [150, 50, 50];
        }
        if (data.section === 'body' && data.column.index === 16) {
          if (String(data.cell.raw) === 'Watch') data.cell.styles.textColor = [180, 83, 9];
          if (String(data.cell.raw) === 'Exited') data.cell.styles.textColor = [28, 75, 66];
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;

    // Follow-on detail per company
    const withFollowOns = fundList.filter(i => (i.followOns?.length ?? 0) > 0);
    if (withFollowOns.length > 0) {
      y = addSectionTitle(doc, `${fund} — Follow-on Round Detail`, y);
      autoTable(doc, {
        startY: y,
        margin: { left: 10, right: 10 },
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
        head: [['Company', 'Round', 'Date', 'Amount (₹Cr)', 'Pre-Money (₹Cr)', 'Post-Money (₹Cr)', 'Ownership Post', 'Lead Investor', 'Notes']],
        body: withFollowOns.flatMap(inv =>
          (inv.followOns ?? []).map(fo => [
            cMap[inv.companyId] ?? inv.companyId,
            fo.round, fo.date, fo.amount, fo.preMoneyVal, fo.postMoneyVal,
            fo.ownershipPost, fo.leadInvestor, fo.notes,
          ])
        ),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  addFooter(doc);
  doc.save(`${firmName}_Fund_Ledger_${fundFilter.replace(/\s+/g,'_')}_${new Date().getFullYear()}.pdf`);
}

// ─── Fund Investment Ledger — Excel ───────────────────────────────────────────

export function exportFundLedgerExcel(
  investments: import('../data/types').FundInvestment[],
  companies: import('../data/types').PortfolioCompany[],
  firmName: string,
  fundFilter: string = 'All Funds',
) {
  const wb = XLSX.utils.book_new();
  const cMap = Object.fromEntries(companies.map(c => [c.id, c.name]));
  const list = fundFilter === 'All Funds'
    ? investments
    : investments.filter(i => i.fund === fundFilter);

  const mainHeaders = [
    'Fund', 'Company', 'Stage at Entry', 'Investment Date', '1st Cheque (₹Cr)',
    'Follow-on Count', 'Total Invested (₹Cr)', 'Ownership at Entry', 'Current Ownership %',
    'Current FMV (₹Cr)', 'Current Valuation (₹Cr)', 'MOIC', 'IRR %', 'DPI',
    'Unrealized Value (₹Cr)', 'Realized Value (₹Cr)',
    'Revenue FY25 (₹Cr)', 'Revenue Growth YoY %', 'ARR (₹Cr)', 'MRR (₹Cr)',
    'Gross Margin %', 'EBITDA Margin %', 'Monthly Burn (₹Cr)', 'Cash (₹Cr)',
    'Runway (months)', 'Headcount', 'NRR %',
    'Status', 'Lead/Follow', 'Board Seat', 'Next Round Expected', 'Next Round Size',
    'Notes',
  ];

  const mainRows = list.map(inv => [
    inv.fund, cMap[inv.companyId] ?? inv.companyId, inv.stageAtEntry, inv.investmentDate,
    inv.firstCheque, inv.followOns?.length ?? 0, inv.totalInvested,
    inv.ownershipAtEntry, inv.currentOwnership, inv.currentFMV, inv.currentValuation,
    inv.moic, inv.irr, inv.dpi, inv.unrealizedValue, inv.realizedValue,
    inv.revenue, inv.revenueGrowthYoY, inv.arr, inv.mrr,
    inv.grossMargin, inv.ebitdaMargin, inv.monthlyBurn, inv.cash,
    inv.runway, inv.headcount, inv.nrr,
    inv.status, inv.leadOrFollow, inv.boardSeat ? 'Yes' : 'No',
    inv.nextRoundExpected, inv.nextRoundSize, inv.notes,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([mainHeaders, ...mainRows]);
  ws['!cols'] = Array(mainHeaders.length).fill({ wch: 18 });
  ws['!cols'][1] = { wch: 24 }; // Company name wider
  ws['!cols'][32] = { wch: 40 }; // Notes wider
  XLSX.utils.book_append_sheet(wb, ws, 'Fund Ledger');

  // Follow-on rounds sheet
  const foHeaders = ['Fund', 'Company', 'Round', 'Date', 'Amount (₹Cr)', 'Pre-Money (₹Cr)', 'Post-Money (₹Cr)', 'Ownership Post', 'Lead Investor', 'Notes'];
  const foRows = list.flatMap(inv =>
    (inv.followOns ?? []).map(fo => [
      inv.fund, cMap[inv.companyId] ?? inv.companyId,
      fo.round, fo.date, fo.amount, fo.preMoneyVal, fo.postMoneyVal,
      fo.ownershipPost, fo.leadInvestor, fo.notes,
    ])
  );
  const ws2 = XLSX.utils.aoa_to_sheet([foHeaders, ...foRows]);
  ws2['!cols'] = Array(foHeaders.length).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Follow-on Rounds');

  // Summary by fund sheet
  const funds = ['Fund 1', 'Fund 2'];
  const summaryRows = funds.map(f => {
    const fi = list.filter(i => i.fund === f);
    const ti = fi.reduce((s, i) => s + parseFloat(i.totalInvested || '0'), 0);
    const fmv = fi.reduce((s, i) => s + parseFloat(i.currentFMV || '0'), 0);
    const dist = fi.reduce((s, i) => s + parseFloat(i.realizedValue || '0'), 0);
    return [
      f, fi.length, ti.toFixed(2), fmv.toFixed(2),
      ti > 0 ? (fmv / ti).toFixed(2) : '—',
      fi.length ? (fi.reduce((s, i) => s + parseFloat(i.irr || '0') * parseFloat(i.totalInvested || '0'), 0) / (ti || 1)).toFixed(1) : '—',
      dist.toFixed(2),
      ti > 0 ? ((fmv + dist) / ti).toFixed(2) : '—',
    ];
  });
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['Fund', 'Companies', 'Total Invested (₹Cr)', 'Total FMV (₹Cr)', 'Fund MOIC', 'Avg IRR %', 'Distributions (₹Cr)', 'TVPI'],
    ...summaryRows,
  ]);
  ws3['!cols'] = Array(8).fill({ wch: 22 });
  XLSX.utils.book_append_sheet(wb, ws3, 'Fund Summary');

  XLSX.writeFile(wb, `${firmName}_Fund_Ledger_${fundFilter.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
