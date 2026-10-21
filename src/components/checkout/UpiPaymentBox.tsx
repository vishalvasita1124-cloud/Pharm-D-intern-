import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, AlertCircle, ExternalLink, QrCode, UserCheck, Copy, Check, Download } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface UpiPaymentBoxProps {
  upiId: string;
  upiName: string;
  amount: number;
  orderNumber: string;
  note?: string;
  upiMobile?: string;
  qrImageUrl?: string;
}

/**
 * Builds a clean static UPI deep-link without order or merchant flags.
 */
function buildUpiLink(upiId: string) {
  const cleanId = upiId.trim();
  return `upi://pay?pa=${encodeURIComponent(cleanId)}&cu=INR`;
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
  const [activeTab, setActiveTab] = useState<'number' | 'qr'>('number');
  const [vcardDownloaded, setVcardDownloaded] = useState(false);
  const [mobileCopied, setMobileCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const upiLink = buildUpiLink(activeUpiId);
  const phonePeNumberLink = `phonepe://pay?pa=${cleanMobile}@ybl&cu=INR`;
  const gpayLink = `gpay://upi/pay?pa=${encodeURIComponent(activeUpiId)}&cu=INR`;
  const paytmNumberLink = `paytmmp://pay?pa=${cleanMobile}@paytm&cu=INR`;

  useEffect(() => {
    if (activeTab !== 'qr' || qrImageUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiLink, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => setQrError(true));
  }, [upiLink, qrImageUrl, activeTab]);

  const handleCopyMobile = async () => {
    try {
      await navigator.clipboard.writeText(cleanMobile);
      setMobileCopied(true);
      setTimeout(() => setMobileCopied(false), 2500);
    } catch {
      // fallback
    }
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
            <h3 className="font-bold text-navy text-sm">Direct Payment</h3>
            <p className="text-gray-500 text-xs">Direct transfer between normal personal accounts</p>
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
          onClick={() => setActiveTab('number')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'number'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-navy hover:bg-gray-100/60'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Pay to Mobile / Contact (Recommended)
        </button>
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
          Scan QR / UPI ID
        </button>
      </div>

      {/* Amount Callout (Always visible) */}
      <div className="bg-white rounded-xl border-2 border-teal-300 p-3.5 text-center mb-5 shadow-2xs">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Amount to Pay</p>
        <p className="text-3xl font-extrabold text-teal-700">₹{amount}</p>
        <p className="text-[11px] text-gray-400">Enter ₹{amount} manually when sending payment</p>
      </div>

      {/* ── TAB 1: PAY TO MOBILE / CONTACT ── */}
      {activeTab === 'number' && (
        <div className="space-y-4">
          {/* Main Mobile Contact Box */}
          <div className="bg-white rounded-xl border border-teal-100 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Direct Mobile Number</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                Person to Person
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
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
                  title={`Save ${displayName} to your phone contacts so you can send via PhonePe/GPay Contact`}
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

          {/* Quick open buttons for mobile apps: PhonePe, Google Pay, Paytm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a
              href={phonePeNumberLink}
              id="open-phonepe-number-btn"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#5f259f] hover:bg-[#4f1e84] text-white text-xs font-semibold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open PhonePe
            </a>
            <a
              href={gpayLink}
              id="open-gpay-btn"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Google Pay
            </a>
            <a
              href={paytmNumberLink}
              id="open-paytm-btn"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#002e6e] hover:bg-[#002252] text-white text-xs font-semibold transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Paytm
            </a>
          </div>
        </div>
      )}

      {/* ── TAB 2: SCAN QR / PAY TO UPI ID ── */}
      {activeTab === 'qr' && (
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          {/* QR Code */}
          <div className="flex-shrink-0 text-center">
            {qrImageUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                <img
                  src={qrImageUrl}
                  alt="UPI QR Code"
                  className="w-[190px] h-[190px] object-contain rounded"
                />
              </div>
            ) : qrError ? (
              <div className="w-[190px] h-[190px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                <p className="text-gray-400 text-xs text-center px-4">QR unavailable — use UPI ID or Mobile</p>
              </div>
            ) : (
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <canvas ref={canvasRef} className="block rounded" />
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-1.5">Scan with PhonePe, GPay, Paytm</p>
          </div>

          {/* UPI ID & Server Switch */}
          <div className="flex-1 w-full space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Personal UPI ID</p>
                {isPhonePe && (
                  <span className="text-[10px] text-teal-600 font-medium">Switch server if limit error &darr;</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-navy font-bold text-sm break-all font-mono">{activeUpiId}</code>
                <CopyButton text={activeUpiId} label="Copy UPI ID" />
              </div>

              {/* Alternative PhonePe handles for Bank Limit bypass */}
              {isPhonePe && (
                <div className="mt-3 pt-2.5 border-t border-gray-100">
                  <p className="text-[11px] text-gray-500 mb-1.5 font-medium">
                    If bank says &ldquo;Limit Exceeded&rdquo;, try Yes Bank (@ybl) or ICICI (@ibl):
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
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

            <a
              href={upiLink}
              id="open-upi-app-qr-btn"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-xs transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open UPI App &rarr; Enter ₹{amount}
            </a>
          </div>
        </div>
      )}

      {/* Reminder note */}
      <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
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
