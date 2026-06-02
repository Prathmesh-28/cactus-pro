import { useApp } from '../../context/AppContext';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

export default function Footer() {
  const { store } = useApp();
  const { firm } = store;

  return (
    <footer className="mt-auto" style={{ backgroundColor: '#0A2321', borderTop: '3px solid #86CA0F' }}>
      <div className="max-w-screen-2xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start gap-8 justify-between">

          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {firm.logoUrl ? (
                <img src={firm.logoUrl} alt={firm.name} className="h-8 w-auto object-contain brightness-0 invert" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="28" height="28" rx="6" fill="#1C4B42"/>
                  <path d="M14 22V10M14 10C14 10 10 8 10 5C10 5 12 7 14 7C16 7 18 5 18 5C18 8 14 10 14 10Z" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 22V16C10 16 7 15 7 12" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M18 22V16C18 16 21 15 21 12" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
              <span className="font-heading font-bold text-xl text-white">{firm.name}</span>
            </div>
            <p className="text-sm italic" style={{ color: '#77918b' }}>{firm.tagline}</p>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: '#5d7f77' }}>
              Investing in resilient founders across advanced manufacturing, technology, and consumer sectors in India.
            </p>
          </div>

          {/* Contact + links */}
          <div className="flex flex-col gap-2.5 text-sm" style={{ color: '#77918b' }}>
            <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#86CA0F' }}>Contact</p>
            <a href={`mailto:${firm.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5" />{firm.email}
            </a>
            {firm.phone && (
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />{firm.phone}
              </span>
            )}
            {firm.locations.length > 0 && (
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />{firm.locations.join(' · ')}
              </span>
            )}
            {firm.websiteUrl && (
              <a href={firm.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors mt-1">
                <ExternalLink className="w-3.5 h-3.5" /> cactuspartners.in ↗
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 flex items-center justify-between flex-wrap gap-3"
          style={{ borderTop: '1px solid #1C4B42' }}>
          <p className="text-xs" style={{ color: '#555951' }}>
            © {new Date().getFullYear()} {firm.name}. Internal use only.
          </p>
          <p className="text-xs" style={{ color: '#555951' }}>
            We invest in the resilient. We nurture them to success.
          </p>
        </div>
      </div>
    </footer>
  );
}
