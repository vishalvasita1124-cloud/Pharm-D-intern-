import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const FAQS = [
  { q: 'What are Pharm D Intern Notes?', a: 'These are concise, ward-ready PDF study notes created specifically for Pharm D students, pharmacy interns and clinical pharmacy learners. Each note covers a focused clinical topic with practical summaries.' },
  { q: 'How do I access my notes after purchase?', a: 'After successful purchase and payment verification, your notes will appear in your Dashboard under "My Notes" and can be downloaded as PDFs.' },
  { q: 'What payment methods are accepted?', a: 'We accept UPI payment. Secure payment processing is currently being set up and will be available very soon.' },
  { q: 'Are the notes suitable for Pharm D exams?', a: 'Yes. The notes are designed to be both ward-practical and exam-relevant. They cover core clinical concepts that are tested in Pharm D clinical rotations and examinations.' },
  { q: 'Can I print the PDFs?', a: 'Yes. All notes are available as standard PDFs which can be printed or used on any device.' },
  { q: 'Will notes be updated?', a: 'Yes. Purchased notes include access to future updates for the same title, delivered through your dashboard.' },
  { q: 'Do I need to create an account?', a: 'Yes. An account is required to purchase and access notes. Registration is free and only takes a minute.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-navy text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-3 animate-fade-in">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-16">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">FAQ</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">Frequently Asked Questions</p>
        </div>
      </div>
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto space-y-3">
          {FAQS.map((faq) => <FAQItem key={faq.q} {...faq} />)}
        </div>
      </div>
    </div>
  );
}
