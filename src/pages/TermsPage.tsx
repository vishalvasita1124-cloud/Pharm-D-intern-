// Terms & Conditions — placeholder for Stage 1
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-medical-950 to-medical-800 py-14">
        <div className="container-custom text-center">
          <h1 className="text-4xl font-extrabold text-white">Terms & Conditions</h1>
        </div>
      </div>
      <div className="container-custom py-12 max-w-3xl">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 text-gray-700 text-sm leading-relaxed">
          <p><strong className="text-navy">Last updated:</strong> September 2026</p>
          <p>By using Pharm D Intern Notes, you agree to these terms. The clinical notes provided are for educational purposes only and do not constitute medical advice.</p>
          <p>Purchases are non-refundable once payment is verified and PDF access is granted. If there is a technical issue preventing access, contact support within 7 days.</p>
          <p>You may not redistribute, resell or share purchased PDFs. Each purchase grants a single-user personal licence.</p>
          <p>We reserve the right to update these terms. Continued use of the platform constitutes acceptance.</p>
        </div>
      </div>
    </div>
  );
}
