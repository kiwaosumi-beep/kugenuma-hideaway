// api/create-payment-intent.js — 鵠沼 Hideaway
// Creates a Stripe PaymentIntent (JPY, no decimals)

const RATES = {
  peak:     25000,  // GW / summer / year-end
  high:     20000,  // Saturdays
  standard: 15000,  // Regular nights
};
const CLEANING_FEE = 5000;

function getSeason(dateStr) {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (
    (m === 4 && day >= 28) ||
    (m === 5 && day <= 6) ||
    m === 7 || m === 8 ||
    (m === 12 && day >= 28) ||
    (m === 1 && day <= 3)
  ) return 'peak';
  if (dow === 6) return 'high';
  return 'standard';
}

function daysBetween(start, end) {
  const s = new Date(start), e = new Date(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ success: false, error: 'STRIPE_SECRET_KEY not set' });

  const { checkIn, checkOut, guestName, guestEmail } = req.body || {};
  if (!checkIn || !checkOut) {
    return res.status(400).json({ success: false, error: 'checkIn and checkOut are required' });
  }

  const nights = daysBetween(checkIn, checkOut);
  if (nights < 1) return res.status(400).json({ success: false, error: 'Invalid date range' });

  const season = getSeason(checkIn);
  const rate   = RATES[season];
  const amount = nights * rate + CLEANING_FEE;

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      automatic_payment_methods: { enabled: true },
      metadata: {
        property:   'kugenuma-hideaway',
        checkIn,
        checkOut,
        nights:     String(nights),
        season,
        guestName:  guestName || '',
        guestEmail: guestEmail || '',
      },
    });

    return res.status(200).json({
      success:      true,
      clientSecret: paymentIntent.client_secret,
      amount,
      nights,
      rate,
      season,
    });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
