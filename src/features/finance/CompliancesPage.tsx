import { ComplianceCalendar } from './components/compliance-calendar';

export default function CompliancesPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--background)' }}>
      <div className="border-b px-6 md:px-10 py-6"
        style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(255,255,255,0.5)' }}>
        <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
          Compliances
        </h1>
        <p className="text-xs italic mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Click a date to add or view compliance events
        </p>
      </div>
      <div className="px-6 md:px-10 py-8">
        <ComplianceCalendar />
      </div>
    </div>
  );
}
