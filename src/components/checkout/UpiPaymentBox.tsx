import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, AlertCircle, ExternalLink } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface UpiPaymentBoxProps {
  upiId: string;
  upiName: string;
  amount: number;
  orderNumber: string;
  note?: string;
}

/**
 * Builds a static UPI deep-link (no pre-filled amount).
 * This ensures the link works with any personal UPI ID on any bank
 * without triggering "bank limit exceeded" errors caused by NPCI P2P
 * dynamic collection restrictions on personal savings accounts.
 */
function buildUpiLink(upiId: string, name: string, orderNumber: string) {
  const parts = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(name)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(`Order ${orderNumber}`)}`,
  ];
  return `upi://pay?${parts.join('&')}`;
}

export function UpiPaymentBox({ upiId, upiName, amount, orderNumber, note }: UpiPaymentBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);

  const upiLink = buildUpiLink(upiId, upiName, orderNumber);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiLink, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => setQrError(true));
  }, [upiLink]);

  return (
    <div className="bg-gradient-to-br from-teal-50 to-medical-50 border border-teal-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-navy text-sm">Pay via UPI</h3>
          <p className="text-gray-500 text-xs">Scan QR or tap the button below to open your UPI app</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        {/* QR Code */}
        <div className="flex-shrink-0 text-center">
          {qrError ? (
            <div className="w-[200px] h-[200px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
              <p className="text-gray-400 text-xs text-center px-4">QR unavailable — use UPI ID below</p>
            </div>
          ) : (
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <canvas ref={canvasRef} className="block rounded" />
            </div>
          )}
          <p className="text-[11px] text-gray-500 mt-1.5">Scan with any UPI app</p>
        </div>

        {/* Payment details */}
        <div className="flex-1 w-full space-y-3">
          {/* Amount callout — prominent, user enters this in UPI app */}
          <div className="bg-white rounded-xl border-2 border-teal-300 p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Enter this amount in your UPI app</p>
            <p className="text-4xl font-extrabold text-teal-700">₹{amount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Indian Rupees (INR)</p>
          </div>

          {/* UPI ID */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Pay to UPI ID</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-navy font-bold text-sm break-all">{upiId}</code>
              <CopyButton text={upiId} label="Copy UPI ID" />
            </div>
          </div>

          {/* Open UPI App button */}
          <a
            href={upiLink}
            id="open-upi-app-btn"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open UPI App &rarr; Enter ₹{amount}
          </a>

          {/* Order number reminder */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-700 text-xs leading-snug">
              {note ?? 'Add your order number '}
              <strong>{orderNumber}</strong>
              {' in the payment remarks / note field when paying.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
