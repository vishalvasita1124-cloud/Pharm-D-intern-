import { BookOpen, Users, Target, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-16">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">About Us</h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            We're on a mission to make clinical pharmacy education practical, concise and accessible.
          </p>
        </div>
      </div>

      <div className="container-custom py-16">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-medical-700" />
              </div>
              <h2 className="text-xl font-bold text-navy">Our Story</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Pharm D Intern Notes was born from the frustration of clinical pharmacy students who struggled to find concise, ward-ready learning resources. Our notes bridge the gap between theoretical pharmacology and real-world clinical practice.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: <Target className="w-5 h-5" />, title: 'Mission', desc: 'Make clinical pharmacy education practical and accessible for every Pharm D student.' },
              { icon: <Users className="w-5 h-5" />, title: 'Who We Serve', desc: 'Pharm D interns, students and clinical pharmacy professionals across India.' },
              { icon: <Heart className="w-5 h-5" />, title: 'Our Promise', desc: 'Every note is reviewed for clinical accuracy, conciseness and ward relevance.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 mx-auto mb-3">
                  {item.icon}
                </div>
                <h3 className="font-bold text-navy mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
