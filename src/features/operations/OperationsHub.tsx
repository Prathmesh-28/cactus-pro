import { useState } from 'react';
import { Phone, CheckSquare, RefreshCw, ArrowRightLeft, FileSignature, Calendar } from 'lucide-react';
import MeetingNotes from './MeetingNotes';
import TaskManager from './TaskManager';
import PortfolioUpdates from './PortfolioUpdates';
import IntroTracker from './IntroTracker';
import SigningWorkflow from './SigningWorkflow';
import EventCalendar from './EventCalendar';

type OpsTab = 'meetings' | 'tasks' | 'updates' | 'intros' | 'signing' | 'calendar';

const TABS: { key: OpsTab; label: string; Icon: React.ElementType }[] = [
  { key: 'meetings', label: 'Meeting Notes',      Icon: Phone },
  { key: 'tasks',    label: 'Tasks',               Icon: CheckSquare },
  { key: 'updates',  label: 'Portfolio Updates',   Icon: RefreshCw },
  { key: 'intros',   label: 'Intros',              Icon: ArrowRightLeft },
  { key: 'signing',  label: 'Doc Signing',         Icon: FileSignature },
  { key: 'calendar', label: 'Event Calendar',      Icon: Calendar },
];

export default function OperationsHub() {
  const [activeTab, setActiveTab] = useState<OpsTab>('meetings');

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Operations</h1>
        <p className="text-sm text-gray-500">Meeting notes, tasks, portfolio updates and more</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === key
                ? 'border-[#1C4B42] text-[#1C4B42]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'meetings'  && <MeetingNotes />}
        {activeTab === 'tasks'     && <TaskManager />}
        {activeTab === 'updates'   && <PortfolioUpdates />}
        {activeTab === 'intros'    && <IntroTracker />}
        {activeTab === 'signing'   && <SigningWorkflow />}
        {activeTab === 'calendar'  && <EventCalendar />}
      </div>
    </main>
  );
}
