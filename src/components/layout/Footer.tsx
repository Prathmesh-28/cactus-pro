import { useApp } from '../../context/AppContext';
import { Leaf, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const { store } = useApp();
  const { firm } = store;

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            {firm.logoUrl ? (
              <img src={firm.logoUrl} alt={firm.name} className="h-7 w-7 object-contain" />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: firm.primaryColor }}
              >
                <Leaf className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div>
              <p className="font-heading font-bold text-sm" style={{ color: firm.primaryColor }}>
                {firm.name}
              </p>
              <p className="text-xs text-gray-400 italic">{firm.tagline}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <a href={`mailto:${firm.email}`} className="flex items-center gap-1.5 hover:text-gray-700">
              <Mail className="w-3.5 h-3.5" />
              {firm.email}
            </a>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {firm.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {firm.locations.join(' · ')}
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {firm.name}. Internal use only.
        </p>
      </div>
    </footer>
  );
}
