import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/dashboard-shell";
import { FundMetricsRows } from "@/components/fund-metrics-rows";
import { PerformanceTable } from "@/components/performance-table";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fund Overview · Cactus Partners" },
      { name: "description", content: "Snapshot of Cactus Partners fund: size, called capital, NAV, and Current vs Expected performance." },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <DashboardShell>
      <PageHeader title="Fund Overview" section="fund_overview" />
      <div className="px-6 md:px-10 py-8 space-y-8">
        <FundMetricsRows />
        <PerformanceTable />
      </div>
    </DashboardShell>
  );
}
