import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/dashboard-shell";
import { EditableTable, type Column } from "@/components/editable-table";
import { FundExpensesChart } from "@/components/fund-expenses-chart";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Projected Expenses · Cactus Partners" },
      { name: "description", content: "Projected and actual vs budgeted fund and IM expenses." },
    ],
  }),
  component: ExpensesPage,
});

const projectedColumns: Column[] = [
  { key: "category", label: "Category", type: "text", width: "20%" },
  { key: "fy23", label: "FY23", type: "currency" },
  { key: "fy24", label: "FY24", type: "currency" },
  { key: "fy25", label: "FY25", type: "currency" },
  { key: "fy26", label: "FY26", type: "currency" },
  { key: "fy27", label: "FY27", type: "currency" },
  { key: "fy28", label: "FY28", type: "currency" },
  { key: "fy29", label: "FY29", type: "currency" },
  { key: "fy30", label: "FY30", type: "currency" },
  { key: "fy31", label: "FY31", type: "currency" },
];

const actualBudgetedColumns: Column[] = [
  { key: "category", label: "Category", type: "text", width: "10%" },
  { key: "budgeted", label: "Budgeted", type: "currency" },
  { key: "q1", label: "Q1", type: "currency" },
  { key: "var_q1", label: "Variance Q1 (%)", type: "number" },
  { key: "q2", label: "Q2", type: "currency" },
  { key: "var_q2", label: "Variance Q2 (%)", type: "number" },
  { key: "q3", label: "Q3", type: "currency" },
  { key: "var_q3", label: "Variance Q3 (%)", type: "number" },
  { key: "q4", label: "Q4", type: "currency" },
  { key: "var_q4", label: "Variance Q4 (%)", type: "number" },
];

function ExpensesPage() {
  return (
    <DashboardShell>
      <PageHeader title="Expenses" section="expenses" />
      <div className="px-6 md:px-10 py-8 space-y-12">
        <section id="projected" className="space-y-6 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-foreground">
              Projected Expenses
            </h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              (Amounts in INR Cr)
            </span>
          </div>
          <EditableTable
            title="Fund Expenses"
            table="fund_expenses"
            columns={projectedColumns}
          />
          <EditableTable
            title="Investment Manager (IM) Expenses"
            table="im_expenses"
            columns={projectedColumns}
          />
        </section>

        <section id="actual-budgeted" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-foreground">
            Actual &amp; Budgeted
          </h2>
          <EditableTable
            title="Investment Manager (IM) Expenses"
            table="im_expenses_actual"
            columns={actualBudgetedColumns}
            centerHeaders
          />

        </section>

        <section id="fund-chart" className="space-y-6 scroll-mt-24">
          <h2 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-foreground">
            Fund Chart
          </h2>
          <FundExpensesChart />
        </section>
      </div>
    </DashboardShell>
  );
}
