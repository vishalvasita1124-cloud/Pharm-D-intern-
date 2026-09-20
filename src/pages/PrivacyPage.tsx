// Privacy Policy — placeholder for Stage 1
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-14">
        <div className="container-custom text-center">
          <h1 className="text-4xl font-extrabold text-white">Privacy Policy</h1>
        </div>
      </div>
      <div className="container-custom py-12 max-w-3xl">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 text-gray-700 text-sm leading-relaxed">
          <p><strong className="text-navy">Last updated:</strong> September 2026</p>
          <p>Pharm D Intern Notes collects only the information necessary to provide our service — including your name, email, mobile number, and username at registration. We do not sell your data to third parties.</p>
          <p>Your data is stored securely on Supabase's infrastructure. We use Supabase Row Level Security to ensure you can only access your own data.</p>
          <p>Cookies are used only for session management. We use no third-party tracking cookies.</p>
          <p>For any privacy-related queries, contact us at <a href="mailto:privacy@pharmdintern.notes" className="text-teal-600 hover:underline">privacy@pharmdintern.notes</a>.</p>
        </div>
      </div>
    </div>
  );
}
