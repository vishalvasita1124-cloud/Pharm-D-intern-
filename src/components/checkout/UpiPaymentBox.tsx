import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  AlertCircle,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Download,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface UpiPaymentBoxProps {
  upiId: string;
  upiName?: string;
  amount: number;
  orderNumber: string;
  note?: string;
  upiMobile?: string;
  qrImageUrl?: string;
}

/**
 * Builds a clean static UPI deep-link with payee name and amount.
 */
function buildUpiLink(upiId: string, name: string, amount: number) {
  const cleanId = upiId.trim();
  const cleanName = (name || 'Vishal Vasita').trim();
  return `upi://pay?pa=${encodeURIComponent(cleanId)}&pn=${encodeURIComponent(cleanName)}&am=${encodeURIComponent(amount.toString())}&cu=INR`;
}

export function UpiPaymentBox({
  upiId,
  upiName = 'Vishal Vasita',
  amount,
  orderNumber,
  note,
  upiMobile = '9512184197',
  qrImageUrl,
}: UpiPaymentBoxProps) {
  const [activeTab, setActiveTab] = useState<'qr' | 'number'>('qr');
  const [vcardDownloaded, setVcardDownloaded] = useState(false);
  const [mobileCopied, setMobileCopied] = useState(false);
  const [qrDownloaded, setQrDownloaded] = useState(false);
  const [appClickedMessage, setAppClickedMessage] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState(false);

  const cleanConfigId = (upiId || 'vasita.vishal@axl').trim();
  const isPhonePe = cleanConfigId.includes('@axl') || cleanConfigId.includes('@ybl') || cleanConfigId.includes('@ibl');
  const baseUsername = cleanConfigId.split('@')[0];

  const [activeUpiId, setActiveUpiId] = useState(cleanConfigId);

  useEffect(() => {
    setActiveUpiId(cleanConfigId);
  }, [cleanConfigId]);

  const displayName = upiName && upiName !== 'Pharm D Intern Notes' ? upiName : 'Vishal Vasita';
  const cleanMobile = upiMobile || '9512184197';

  // Direct UPI link using real UPI ID, name, and exact amount
  const directUpiLink = buildUpiLink(activeUpiId, displayName, amount);

  // App-specific direct UPI ID deep-links
  const phonePeDirectLink = `phonepe://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(displayName)}&am=${encodeURIComponent(amount.toString())}&cu=INR`;
  const gpayDirectLink = `tez://upi/pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(displayName)}&am=${encodeURIComponent(amount.toString())}&cu=INR`;
  const paytmDirectLink = `paytmmp://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(displayName)}&am=${encodeURIComponent(amount.toString())}&cu=INR`;

  // Pre-generate high-res QR code as data URL
  useEffect(() => {
    if (qrImageUrl) {
      setQrDataUrl(qrImageUrl);
      return;
    }
    QRCode.toDataURL(directUpiLink, {
      width: 400,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrError(true));
  }, [directUpiLink, qrImageUrl]);

  const handleCopyMobile = async () => {
    try {
      await navigator.clipboard.writeText(cleanMobile);
      setMobileCopied(true);
      setTimeout(() => setMobileCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const [activeAppModal, setActiveAppModal] = useState<{
    app: 'phonepe' | 'gpay' | 'paytm' | 'any';
    appName: string;
  } | null>(null);

  /** Downloads the QR code reliably across all mobile & desktop browsers (uses Blob to bypass cross-origin download restrictions) */
  const handleDownloadQR = async () => {
    try {
      const src = qrImageUrl || qrDataUrl;
      if (!src) return;

      let blob: Blob;
      if (src.startsWith('data:')) {
        // Base64 Data URL to Blob
        const parts = src.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        // Remote URL (e.g. Supabase storage) — fetch as blob to bypass browser cross-origin download blocks
        const res = await fetch(src);
        blob = await res.blob();
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Payment_QR_${amount}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      setQrDownloaded(true);
      setTimeout(() => setQrDownloaded(false), 3000);
    } catch (err) {
      console.warn('Direct blob download failed, falling back to window.open:', err);
      window.open(qrImageUrl || qrDataUrl, '_blank');
    }
  };

  /** Copies UPI ID and opens the guided 1-tap app payment flow */
  const handleSelectApp = async (app: 'phonepe' | 'gpay' | 'paytm' | 'any', appName: string) => {
    try {
      await navigator.clipboard.writeText(activeUpiId);
    } catch {
      // ignore
    }
    setActiveAppModal({ app, appName });
  };

  /** Launches the app directly without query parameters that trigger bank UPI Safeguard blocks */
  const launchAppDirect = (app: 'phonepe' | 'gpay' | 'paytm' | 'any') => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const cleanId = activeUpiId.trim();
    const cleanName = displayName.trim();

    if (isAndroid) {
      if (app === 'phonepe') {
        window.location.href = 'intent:#Intent;package=com.phonepe.app;end';
        return;
      }
      if (app === 'gpay') {
        window.location.href = 'intent:#Intent;package=com.google.android.apps.nbu.paisa.user;end';
        return;
      }
      if (app === 'paytm') {
        window.location.href = 'intent:#Intent;package=net.one97.paytm;end';
        return;
      }
    }

    if (app === 'phonepe') {
      window.location.href = 'phonepe://';
      return;
    }
    if (app === 'gpay') {
      window.location.href = 'gpay://';
      return;
    }
    if (app === 'paytm') {
      window.location.href = 'paytmmp://';
      return;
    }

    // Universal fallback
    window.location.href = `upi://pay?pa=${encodeURIComponent(cleanId)}&pn=${encodeURIComponent(cleanName)}&am=${amount}&cu=INR`;
  };

  /** Downloads a vCard (.vcf) contact file so mobile users can save Vishal Vasita in 1 tap */
  const handleSaveContact = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
N:${displayName};;;;
TEL;TYPE=CELL:${cleanMobile}
NOTE:Pharm D Intern Notes UPI Payment
END:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${displayName.replace(/\s+/g, '_')}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setVcardDownloaded(true);
    setTimeout(() => setVcardDownloaded(false), 4000);
  };

  return (
    <div className="bg-gradient-to-br from-teal-50 to-medical-50 border border-teal-200 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow-xs">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-navy text-sm">UPI Payment</h3>
            <p className="text-gray-500 text-xs">Direct transfer to personal account</p>
          </div>
        </div>
        <span className="text-[11px] bg-white border border-teal-200 text-teal-800 font-semibold px-3 py-1 rounded-full shadow-2xs">
          Payee: {displayName}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/80 p-1 rounded-xl border border-teal-100 mb-5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'qr'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-navy hover:bg-gray-100/60'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          Scan QR / Direct UPI ID (Recommended)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('number')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'number'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-navy hover:bg-gray-100/60'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Pay to Mobile Number
        </button>
      </div>

      {/* Amount Callout */}
      <div className="bg-white rounded-xl border-2 border-teal-300 p-3.5 text-center mb-5 shadow-2xs">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Amount to Pay</p>
        <p className="text-3xl font-extrabold text-teal-700">₹{amount}</p>
        <p className="text-[11px] text-gray-400">Pay exactly ₹{amount} to complete order</p>
      </div>

      {/* ── TAB 1: SCAN QR / PAY TO DIRECT UPI ID ── */}
      {activeTab === 'qr' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-5 items-center bg-white p-4 rounded-xl border border-teal-100 shadow-xs">
            {/* QR Code & Download Button */}
            <div className="flex-shrink-0 text-center">
              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-gray-200 inline-block">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI QR Code"
                    className="w-[180px] h-[180px] object-contain rounded"
                  />
                ) : qrError ? (
                  <div className="w-[180px] h-[180px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                    <p className="text-gray-400 text-xs text-center px-4">QR unavailable — copy UPI ID below</p>
                  </div>
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-50 rounded">
                    <span className="text-xs text-gray-400">Loading QR…</span>
                  </div>
                )}
              </div>

              {/* Download QR Button */}
              <div className="mt-2.5">
                <button
                  type="button"
                  id="download-qr-btn"
                  onClick={handleDownloadQR}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    qrDownloaded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 active:scale-95'
                  }`}
                >
                  {qrDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  {qrDownloaded ? 'QR Code Saved!' : 'Download QR Code'}
                </button>
                <p className="text-[10px] text-gray-500 mt-1">Save & scan from Gallery in GPay / PhonePe</p>
              </div>
            </div>

            {/* UPI ID & Handle Switcher */}
            <div className="flex-1 w-full space-y-3">
              <div className="bg-gray-50/90 rounded-xl border border-gray-200 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Direct UPI ID</p>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-bold">
                    Direct Account
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-gray-200">
                  <code className="text-navy font-bold text-sm break-all font-mono">{activeUpiId}</code>
                  <CopyButton text={activeUpiId} label="Copy" />
                </div>

                {/* Alternative PhonePe handles for Bank Limit bypass */}
                {isPhonePe && (
                  <div className="mt-2.5 pt-2 border-t border-gray-200">
                    <p className="text-[11px] text-gray-600 mb-1.5 font-medium">
                      If bank server has limits, switch UPI handle:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['@ybl', '@axl', '@ibl'].map((handle) => {
                        const id = `${baseUsername}${handle}`;
                        const isSelected = activeUpiId === id;
                        return (
                          <button
                            key={handle}
                            type="button"
                            onClick={() => setActiveUpiId(id)}
                            className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white font-bold shadow-xs'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {handle} {handle === '@ybl' ? '(Yes Bank)' : handle === '@axl' ? '(Axis)' : '(ICICI)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions banner */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Easiest 0-Error Payment Method:
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-teal-800 text-[11px]">
                  <li>Click <strong>Download QR Code</strong> above</li>
                  <li>Open PhonePe / Google Pay / Paytm</li>
                  <li>Tap <strong>Scan QR &rarr; Upload from Gallery</strong></li>
                  <li>Enter PIN &rarr; Done! No safeguard or limit issues.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Quick open buttons for mobile apps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 font-semibold">Or open directly in UPI app:</span>
              {appClickedMessage && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-pulse">
                  {appClickedMessage}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="open-phonepe-btn"
                onClick={() => handleSelectApp('phonepe', 'PhonePe')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#5f259f] hover:bg-[#4f1e84] text-white text-xs font-semibold transition-all shadow-xs active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                PhonePe
              </button>
              <button
                type="button"
                id="open-gpay-btn"
                onClick={() => handleSelectApp('gpay', 'Google Pay')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-all shadow-xs active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Google Pay
              </button>
              <button
                type="button"
                id="open-paytm-btn"
                onClick={() => handleSelectApp('paytm', 'Paytm')}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#002e6e] hover:bg-[#002252] text-white text-xs font-semibold transition-all shadow-xs active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Paytm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GUIDED 1-TAP APP PAYMENT MODAL ── */}
      {activeAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 border border-teal-100 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-navy text-sm">Pay via {activeAppModal.appName}</h4>
                  <p className="text-gray-400 text-[11px]">100% 0-Error Personal Transfer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Copied notification card */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  ✓ Copied to Clipboard
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded">
                  Ready to paste
                </span>
              </div>
              <p className="font-mono font-bold text-navy text-base break-all">{activeUpiId}</p>
              <p className="text-emerald-700 text-[11px]">Payee: {displayName} · Amount: ₹{amount}</p>
            </div>

            {/* 3 Simple Steps */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs text-gray-700">
              <p className="font-bold text-navy text-xs">How to complete payment:</p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</span>
                <p>Tap <strong>&ldquo;Launch {activeAppModal.appName}&rdquo;</strong> below to open the app.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">2</span>
                <p>Tap <strong>&ldquo;To UPI ID&rdquo;</strong> (or Mobile) &rarr; <strong>Paste</strong> the copied ID.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">3</span>
                <p>Enter <strong>₹{amount}</strong> and enter your UPI PIN.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => launchAppDirect(activeAppModal.app)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4" />
                Launch {activeAppModal.appName} App
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download QR Instead
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAppModal(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  I&apos;ve Paid &rarr; Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PAY TO MOBILE / CONTACT ── */}
      {activeTab === 'number' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-teal-100 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Direct Mobile Number</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                Person to Person
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50/90 rounded-xl border border-gray-200">
              <div>
                <p className="text-2xl font-black text-navy font-mono tracking-wider">{cleanMobile}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Name on PhonePe / GPay: <strong className="text-navy">{displayName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMobile}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    mobileCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                  }`}
                >
                  {mobileCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {mobileCopied ? 'Copied!' : 'Copy Number'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveContact}
                  title={`Save ${displayName} to your phone contacts`}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 active:scale-95 transition-all"
                >
                  {vcardDownloaded ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
                  {vcardDownloaded ? 'Saved to Contacts' : 'Add to Contacts'}
                </button>
              </div>
            </div>

            {/* How-to steps */}
            <div className="mt-3.5 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
              <p className="font-semibold text-navy">How to pay via mobile number:</p>
              <ol className="list-decimal pl-4 space-y-1 text-gray-600">
                <li>Copy <strong>{cleanMobile}</strong> (or tap &ldquo;Add to Contacts&rdquo;)</li>
                <li>Open <strong>PhonePe, Google Pay, or Paytm</strong></li>
                <li>Tap <strong>&ldquo;To Mobile Number&rdquo;</strong> &rarr; enter <strong>{cleanMobile}</strong></li>
                <li>Verify name shows <strong>{displayName}</strong> &rarr; enter <strong>₹{amount}</strong> &rarr; Pay</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Receipt Instruction */}
      <div className="mt-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 shadow-2xs">
        <MessageCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0 fill-emerald-600/20" />
        <div className="text-xs leading-relaxed text-emerald-950">
          <span className="font-bold text-emerald-800 uppercase tracking-wide text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded mr-1.5">
            Important Step
          </span>
          After completing the payment, please share your <strong>payment receipt / screenshot</strong> and <strong>course name</strong> to our WhatsApp at{' '}
          <a
            href={`https://wa.me/91${cleanMobile.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Hi, I have completed the payment of ₹${amount} (Order: ${orderNumber}). Here is my payment receipt screenshot:`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-emerald-700 underline hover:text-emerald-800 inline-flex items-center gap-1"
          >
            +91 {cleanMobile}
          </a>{' '}
          for instant verification.
        </div>
      </div>

      {/* Reminder note */}
      <div className="mt-2.5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-amber-800 text-xs leading-snug">
          {note ?? 'Add order number '}
          <strong>{orderNumber}</strong>
          {' in the payment note/remarks so we can approve your notes faster.'}
        </p>
      </div>
    </div>
  );
}

