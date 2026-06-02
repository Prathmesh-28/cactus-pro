import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, PageHeader } from "@/components/dashboard-shell";
import { ComplianceCalendar } from "@/components/compliance-calendar";

export const Route = createFileRoute("/work-updates")({
  head: () => ({
    meta: [
      { title: "Compliances · Cactus Partners" },
      { name: "description", content: "Calendar of upcoming compliance deadlines and important dates." },
    ],
  }),
  component: CompliancesPage,
});

function CompliancesPage() {
  return (
    <DashboardShell>
      <PageHeader title="Compliances" section="work_updates" />
      <div className="px-6 md:px-10 py-8">
        <ComplianceCalendar />
      </div>
    </DashboardShell>
  );
}
