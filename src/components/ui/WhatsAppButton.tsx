import { useState } from 'react';
import { MessageCircle, Phone, Mail, X } from 'lucide-react';

export function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const phoneNumber = '9512184197';
  const displayPhone = '+91 95121 84197';
  const email = 'pharmdintern01@gmail.com';
  const whatsappUrl = `https://wa.me/91${phoneNumber}?text=Hi%2C%20I%20have%20a%20query%20about%20Pharm%20D%20Intern%20Notes`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Quick Help Popup */}
      {isOpen && (
        <div className="mb-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-navy text-sm leading-tight">Need Help?</p>
                <p className="text-[11px] text-emerald-600 font-medium">Online for student support</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label="Close help popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Have a question about notes, payment, or PDF access? Reach out directly:
          </p>

          <div className="space-y-2">
            {/* WhatsApp button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4 shrink-0 fill-current" />
              <span>Chat on WhatsApp</span>
            </a>

            {/* Direct Call button */}
            <a
              href={`tel:+91${phoneNumber}`}
              className="flex items-center gap-2.5 w-full bg-gray-50 hover:bg-gray-100 text-navy font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors border border-gray-200"
            >
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              <span>Call {displayPhone}</span>
            </a>

            {/* Email button */}
            <a
              href={`mailto:${email}?subject=Pharm%20D%20Intern%20Notes%20Query`}
              className="flex items-center gap-2.5 w-full bg-gray-50 hover:bg-gray-100 text-navy font-medium text-xs px-3.5 py-2.5 rounded-xl transition-colors border border-gray-200"
            >
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="truncate">{email}</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open support chat"
        className="group relative flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl px-4 py-3 rounded-full transition-all duration-200 hover:scale-105"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="font-semibold text-xs pr-1 hidden sm:inline-block">Need Help?</span>
      </button>
    </div>
  );
}
