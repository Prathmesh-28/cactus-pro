import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getBotResponse, buildPortfolioContext, genId, type BotMessage } from '../../lib/chatbot';
import { aiChat } from '../../lib/api';

const WELCOME: BotMessage = {
  id: 'welcome',
  role: 'bot',
  text: `👋 Hi! I'm the **Cactus Pro Assistant**.\n\nAsk me anything about the portal — company data, how to navigate, how to export, how to configure settings — I've got you covered.\n\nTry: *"Tell me about Lohum"* or *"How do I sync SharePoint?"*`,
  links: [
    { label: 'Portfolio', path: '/dashboard' },
    { label: 'Finance', path: '/finance' },
    { label: 'Admin', path: '/admin' },
  ],
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  'Fund TVPI and net IRR',
  'Which company has the highest MOIC?',
  'Compare Lohum and Auric',
  'Tell me about Lohum',
  'Fund carry waterfall',
  'Companies in EV',
  'How do I model a round?',
  'How do I export a PDF report?',
];

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export default function Chatbot() {
  const { store } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('cactus_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved) as BotMessage[];
        // Restore Date objects (JSON.parse turns them into strings)
        return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch {}
    return [WELCOME];
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    try {
      // Keep only last 40 messages to stay well under sessionStorage limits
      const toSave = messages.slice(-40);
      sessionStorage.setItem('cactus_chat_history', JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');

    const userMsg: BotMessage = { id: genId(), role: 'user', text: msg, timestamp: new Date() };
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, text: m.text }));
    setMessages(m => [...m, userMsg]);
    setTyping(true);

    // Local rule-based answer — used as a fallback and to surface the matched
    // company card / nav links alongside the AI's prose.
    const local = getBotResponse(msg, store);

    // Prefer the Claude-backed assistant; null means it's unavailable (no API
    // key) or the request failed, in which case we use the local engine.
    const aiText = await aiChat(msg, buildPortfolioContext(store), history);

    const response = aiText ? { ...local, text: aiText } : local;
    const botMsg: BotMessage = { id: genId(), timestamp: new Date(), ...response };
    setMessages(m => [...m, botMsg]);
    setTyping(false);
  };

  const reset = () => { setMessages([WELCOME]); setInput(''); };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-6 z-[150] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', background: open ? '#0A2321' : 'linear-gradient(135deg, #1C4B42, #254536)', border: '3px solid #86CA0F' }}
        aria-label="Open assistant"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />}
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: '#86CA0F' }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed right-6 z-[150] w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))', height: 'min(520px, calc(100dvh - 7rem - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px)))', border: '1px solid #E3EDE9', backgroundColor: '#ffffff' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1C4B42, #0A2321)', borderBottom: '2px solid #86CA0F' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: '#86CA0F' }}>
              🌵
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Cactus Pro Assistant</p>
              <p className="text-[10px]" style={{ color: '#95c840' }}>Always here to help</p>
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Clear chat">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ backgroundColor: '#F6FAF7' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'bot' && (
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-sm mt-1"
                    style={{ backgroundColor: '#1C4B42' }}>
                    🌵
                  </div>
                )}
                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm"
                    style={msg.role === 'user'
                      ? { backgroundColor: '#1C4B42', color: '#ffffff', borderRadius: '12px 12px 2px 12px' }
                      : { backgroundColor: '#ffffff', color: '#191c14', border: '1px solid #E3EDE9', borderRadius: '12px 12px 12px 2px' }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                  />
                  {/* Company card */}
                  {msg.company && (
                    <div className="rounded-xl p-3 text-xs space-y-1"
                      style={{ backgroundColor: '#E3EDE9', border: '1px solid #d2dbd9' }}>
                      <div className="flex items-center gap-2">
                        {msg.company.logoUrl
                          ? <img src={msg.company.logoUrl} alt="" className="w-6 h-6 object-contain rounded" />
                          : <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: '#1C4B42' }}>
                              {msg.company.name[0]}
                            </div>}
                        <span className="font-semibold" style={{ color: '#1C4B42' }}>{msg.company.name}</span>
                      </div>
                      <p style={{ color: '#555951' }}>{msg.company.stage} · {msg.company.hqCity}</p>
                    </div>
                  )}
                  {/* Link buttons */}
                  {msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.links.map(link => (
                        <button key={link.path + link.label}
                          onClick={() => { navigate(link.path); setOpen(false); }}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors hover:opacity-80"
                          style={{ backgroundColor: '#1C4B42', color: '#ffffff' }}>
                          <ExternalLink className="w-2.5 h-2.5" />
                          {link.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-sm"
                  style={{ backgroundColor: '#1C4B42' }}>🌵</div>
                <div className="rounded-xl px-4 py-3 flex items-center gap-1"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #E3EDE9' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: '#86CA0F', animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts (shown when only welcome message) */}
          {messages.length === 1 && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5 shrink-0 border-t" style={{ borderColor: '#E3EDE9', backgroundColor: '#F2F7F1' }}>
              {QUICK_PROMPTS.slice(0, 4).map(p => (
                <button key={p} onClick={() => send(p)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full border font-medium transition-colors hover:bg-white"
                  style={{ borderColor: '#d2dbd9', color: '#555951', backgroundColor: '#F6FAF7' }}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 shrink-0 flex gap-2 border-t" style={{ borderColor: '#E3EDE9', backgroundColor: '#ffffff' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask me anything…"
              className="flex-1 text-xs px-3 py-2 rounded-xl border outline-none focus:border-green-400 transition-colors"
              style={{ borderColor: '#E3EDE9', backgroundColor: '#F6FAF7', color: '#191c14' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || typing}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: '#1C4B42' }}
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
