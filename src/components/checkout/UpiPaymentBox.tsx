import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, AlertCircle } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface UpiPaymentBoxProps {
  upiId: string;
  upiName: string;
  amount: number;
  orderNumber: string;
  note?: string;
}

/** Builds a UPI deep-link that opens any UPI app on mobile */
function buildUpiLink(upiId: string, name: string, amount: number, tn: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn,
  });
  return `upi://pay?${params.toString()}`;
}

export function UpiPaymentBox({ upiId, upiName, amount, orderNumber, note }: UpiPaymentBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);

  const upiLink = buildUpiLink(upiId, upiName, amount, `Payment for ${orderNumber}`);

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
          <p className="text-gray-500 text-xs">Scan or copy the UPI ID below</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        {/* QR Code */}
        <div className="flex-shrink-0">
          {qrError ? (
            <div className="w-[200px] h-[200px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
              <p className="text-gray-400 text-xs text-center px-4">QR unavailable — use UPI ID below</p>
            </div>
          ) : (
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <canvas ref={canvasRef} className="block rounded" />
            </div>
          )}
        </div>

        {/* Payment details */}
        <div className="flex-1 w-full space-y-4">
          {/* Amount */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Amount to Pay</p>
            <p className="text-3xl font-extrabold text-navy">₹{amount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Indian Rupees (INR)</p>
          </div>

          {/* UPI ID */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">UPI ID</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-navy font-bold text-sm break-all">{upiId}</code>
              <CopyButton text={upiId} label="Copy UPI ID" />
            </div>
          </div>

          {/* Order number reminder */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-amber-700 text-xs leading-snug">
              {note ?? `Please add your order number `}
              <strong>{orderNumber}</strong>
              {` in the payment remarks / note field.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
