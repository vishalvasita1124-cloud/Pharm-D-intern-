/**
 * Razorpay Standard Checkout SDK Loader & Helper
 * Opens payment popup supporting UPI (GPay, PhonePe, Paytm), Cards, NetBanking
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface OpenRazorpayParams {
  keyId?: string;
  orderNumber: string;
  productTitle: string;
  amount: number; // in INR
  userEmail?: string;
  userName?: string;
  userContact?: string;
  onSuccess: (paymentId: string) => void;
  onError: (errorMsg: string) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout({
  keyId,
  orderNumber,
  productTitle,
  amount,
  userEmail,
  userName,
  userContact,
  onSuccess,
  onError,
  onDismiss,
}: OpenRazorpayParams): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onError('Failed to load Razorpay payment gateway. Please check your internet connection.');
    return;
  }

  // Use provided key or fallback to environment variable
  const activeKey = keyId || (import.meta.env.VITE_RAZORPAY_KEY_ID as string);

  if (!activeKey) {
    onError(
      'Razorpay Key ID is not configured. Please add VITE_RAZORPAY_KEY_ID in your .env file or use Manual UPI.'
    );
    return;
  }

  const options = {
    key: activeKey,
    amount: Math.round(amount * 100), // Razorpay accepts amount in paise (1 INR = 100 paise)
    currency: 'INR',
    name: 'Pharm D Intern Notes',
    description: `${productTitle} (${orderNumber})`,
    image: 'https://cdn-icons-png.flaticon.com/512/3063/3063823.png',
    handler: function (response: { razorpay_payment_id: string }) {
      if (response && response.razorpay_payment_id) {
        onSuccess(response.razorpay_payment_id);
      } else {
        onError('Payment was processed but payment ID was missing.');
      }
    },
    prefill: {
      name: userName || '',
      email: userEmail || '',
      contact: userContact || '',
    },
    notes: {
      order_number: orderNumber,
      product: productTitle,
    },
    theme: {
      color: '#0d9488', // Medical teal brand color
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (resp: any) {
      onError(resp.error?.description || 'Payment failed. Please try again.');
    });
    rzp.open();
  } catch (err) {
    onError((err as Error).message || 'Unable to open Razorpay payment popup.');
  }
}
