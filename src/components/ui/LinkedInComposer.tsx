import { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface LinkedInComposerProps {
  isOpen: boolean;
  onClose: () => void;
  companyName?: string;
  context?: 'investment' | 'milestone' | 'portfolio' | 'general';
}

type PostType = 'Investment Announcement' | 'Portfolio Milestone' | 'Market Insight' | 'Hiring' | 'Custom';

const POST_TYPES: PostType[] = [
  'Investment Announcement',
  'Portfolio Milestone',
  'Market Insight',
  'Hiring',
  'Custom',
];

const LI_MAX = 3000;
const LI_WARN = 2700;

function buildTemplate(type: PostType, company: { name: string; sectorId: string; ceoName: string } | null): string {
  const name = company?.name ?? '[Company]';
  const founder = company?.ceoName ?? '[Founder Name]';

  switch (type) {
    case 'Investment Announcement':
      return `🌵 Excited to announce our investment in ${name} — [one-line what they do].\n\n${name} is [description]. We backed them because [thesis].\n\nJoining us as co-investors: [co-investors]\n\nThe team led by ${founder} is tackling [problem] with [solution].\n\nMore to come. 🚀\n\n#CactusPartners #VentureCapital #[Sector] #StartupIndia`;

    case 'Portfolio Milestone':
      return `📈 Portfolio spotlight: ${name} just [milestone].\n\nWhen we invested in ${name} at [stage], they had [early state]. Today, [current state].\n\nProud to partner with the ${name} team on this journey.\n\n#CactusPartners #PortfolioGrowth #[Sector]`;

    case 'Market Insight':
      return `💡 On [Sector] in India:\n\n[Key insight or trend]\n\nWe've been investing in this space since [year]. Our thesis: [thesis].\n\nPortfolio companies tackling this: [list companies]\n\nWhat are you seeing in this space? 👇\n\n#CactusPartners #VentureCapital #India`;

    case 'Hiring':
      return `🚀 ${name}, one of our portfolio companies, is hiring!\n\nRole: [Role]\nLocation: [Location]\n\n${name} is [description]. Great team, strong growth, exciting mission.\n\nDM me or apply at [link]\n\n#Hiring #[Sector] #StartupIndia`;

    case 'Custom':
    default:
      return '';
  }
}

export default function LinkedInComposer({
  isOpen,
  onClose,
  companyName,
  context = 'general',
}: LinkedInComposerProps) {
  const { store } = useApp();
  const companies = store.companies ?? [];

  const defaultContextType: PostType =
    context === 'investment' ? 'Investment Announcement'
    : context === 'milestone' ? 'Portfolio Milestone'
    : context === 'portfolio' ? 'Portfolio Milestone'
    : 'Custom';

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [postType, setPostType] = useState<PostType>(defaultContextType);
  const [postText, setPostText] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find(c => c.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );

  // Set default company from prop
  useEffect(() => {
    if (isOpen) {
      const match = companyName
        ? companies.find(c => c.name.toLowerCase() === companyName.toLowerCase())
        : null;
      setSelectedCompanyId(match?.id ?? (companies[0]?.id ?? ''));
      setPostType(defaultContextType);
      setCopied(false);
    }
  }, [isOpen]);

  // Regenerate post text when type or company changes
  useEffect(() => {
    setPostText(buildTemplate(postType, selectedCompany));
  }, [postType, selectedCompanyId]);

  const charCount = postText.length;
  const charColor =
    charCount >= LI_MAX ? '#EF4444'
    : charCount >= LI_WARN ? '#F97316'
    : '#9CA3AF';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select textarea
    }
  };

  const handleOpenLinkedIn = () => {
    window.open(
      'https://www.linkedin.com/sharing/share-offsite/?url=https://cactus-pro.vercel.app',
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 600 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E3EDE9' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#0A66C2' }}
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold" style={{ color: '#1C4B42' }}>LinkedIn Post Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-0 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          {/* Company selector */}
          <div className="px-6 py-4 border-b" style={{ borderColor: '#F2F7F1' }}>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Portfolio Company</label>
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 outline-none transition-colors"
              style={{ borderColor: '#D1D5DB', color: '#1f2937' }}
            >
              <option value="">— Select company —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Post type tabs */}
          <div className="px-6 py-4 border-b" style={{ borderColor: '#F2F7F1' }}>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Post Type</label>
            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setPostType(type)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={
                    postType === type
                      ? { backgroundColor: '#0A66C2', color: '#fff', borderColor: '#0A66C2' }
                      : { backgroundColor: '#fff', color: '#555', borderColor: '#D1D5DB' }
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Post textarea */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500">Post Content</label>
              <span className="text-xs font-mono" style={{ color: charColor }}>
                {charCount} / {LI_MAX}
                {charCount >= LI_WARN && charCount < LI_MAX && (
                  <span className="ml-1.5 text-orange-500 font-semibold">Approaching limit</span>
                )}
                {charCount >= LI_MAX && (
                  <span className="ml-1.5 text-red-500 font-semibold">Over limit!</span>
                )}
              </span>
            </div>
            <textarea
              rows={14}
              value={postText}
              onChange={e => setPostText(e.target.value)}
              placeholder="Select a post type to generate content, or write your own…"
              className="w-full text-sm text-gray-800 placeholder-gray-300 border rounded-xl p-3.5 outline-none resize-none transition-colors"
              style={{
                borderColor: charCount >= LI_MAX ? '#EF4444' : '#E3EDE9',
                lineHeight: '1.65',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Footer actions */}
          <div
            className="flex items-center justify-between px-6 py-4 border-t gap-3"
            style={{ borderColor: '#E3EDE9', backgroundColor: '#F9FBFA' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                style={
                  copied
                    ? { backgroundColor: '#E5F7DB', color: '#1C4B42', borderColor: '#86CA0F' }
                    : { backgroundColor: '#fff', color: '#374151', borderColor: '#D1D5DB' }
                }
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Post'}
              </button>
              <button
                onClick={handleOpenLinkedIn}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#0A66C2' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open LinkedIn
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
