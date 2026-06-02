import { useApp } from '../../context/AppContext';
import { EditableTable } from './components/editable-table';
import { FundExpensesChart } from './components/fund-expenses-chart';
import type { Column } from './components/editable-table';



const actualBudgetedColumns: Column[] = [
  { key: 'category',  label: 'Category',         type: 'text',    width: '10%' },
  { key: 'budgeted',  label: 'Budgeted',          type: 'currency' },
  { key: 'q1',        label: 'Q1',                type: 'currency' },
  { key: 'var_q1',    label: 'Variance Q1 (%)',   type: 'number' },
  { key: 'q2',        label: 'Q2',                type: 'currency' },
  { key: 'var_q2',    label: 'Variance Q2 (%)',   type: 'number' },
  { key: 'q3',        label: 'Q3',                type: 'currency' },
  { key: 'var_q3',    label: 'Variance Q3 (%)',   type: 'number' },
  { key: 'q4',        label: 'Q4',                type: 'currency' },
  { key: 'var_q4',    label: 'Variance Q4 (%)',   type: 'number' },
];

export default function ExpensesPage() {
  const { store } = useApp();
  const fyColumns = (store.financeConfig?.fiscalYears ?? ['FY23','FY24','FY25','FY26','FY27','FY28','FY29','FY30','FY31']);
  const projectedColumns = [
    { key: 'category', label: 'Category', type: 'text' as const, width: '20%' },
    ...fyColumns.map(fy => ({ key: fy.toLowerCase(), label: fy, type: 'currency' as const })),
  ];
  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--background)' }}>
      <div className="border-b px-6 md:px-10 py-6"
        style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(255,255,255,0.5)' }}>
        <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
          Expenses
        </h1>
        <p className="text-xs italic mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Click any cell to edit · Upload Excel to bulk import · Amounts in INR Lakhs
        </p>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-12">
        {/* Projected Expenses */}
        <section id="projected" className="space-y-6 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-serif uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
              Projected Expenses
            </h2>
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              (Amounts in INR Lakhs)
            </span>
          </div>
          <EditableTable title="Fund Expenses" table="fund_expenses" columns={projectedColumns} tableKey="et:fund_expenses" />
          <EditableTable title="Investment Manager (IM) Expenses" table="im_expenses" columns={projectedColumns} tableKey="et:im_expenses" />
        </section>

        {/* Actual & Budgeted */}
        <section id="actual-budgeted" className="space-y-6 scroll-mt-24">
          <h2 className="text-xl font-serif uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            Actual &amp; Budgeted
          </h2>
          <EditableTable title="IM Expenses — Actual vs Budget" table="im_expenses_actual" columns={actualBudgetedColumns} centerHeaders tableKey="et:im_expenses_actual" />
        </section>

        {/* Fund Chart */}
        <section id="fund-chart" className="scroll-mt-24">
          <h2 className="text-xl font-serif uppercase tracking-wide mb-5" style={{ color: 'var(--foreground)' }}>
            Fund Chart
          </h2>
          <FundExpensesChart />
        </section>
      </div>
    </div>
  );
}
