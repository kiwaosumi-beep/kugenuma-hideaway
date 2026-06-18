// api/confirm-booking.js — 鵠沼 Hideaway
// Sends confirmation emails to guest + host via Resend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey    = process.env.RESEND_API_KEY;
  const hostEmail = process.env.HOST_EMAIL || 'kiwaosumi@hideaway-resort.net';

  const { guestName, guestEmail, checkIn, checkOut, nights, amount, paymentIntentId } = req.body || {};

  if (!guestEmail || !checkIn || !checkOut) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return res.status(200).json({ success: true, emailSkipped: true });
  }

  const amountStr = amount ? `¥${Number(amount).toLocaleString()}` : '—';
  const fromAddr  = 'noreply@hideaway-resort.net';

  const guestHtml = `
<div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;color:#1A1A14">
  <div style="background:#0A3D2E;padding:28px 32px">
    <h1 style="color:#fff;font-size:22px;font-weight:300;margin:0">鵠沼 <em style="color:#C8A96E">Hideaway</em></h1>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0">Kugenuma-Kaigan, Fujisawa, Kanagawa</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#0A3D2E;font-weight:400;font-size:18px;margin:0 0 20px">ご予約ありがとうございます</h2>
    <p style="color:#5A5C56;font-size:14px;line-height:1.8">
      ${guestName || 'お客様'} 様<br><br>
      ご予約を承りました。詳細は下記の通りです。
    </p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#5A5C56">チェックイン</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:400;text-align:right">${checkIn}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#5A5C56">チェックアウト</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:400;text-align:right">${checkOut}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#5A5C56">泊数</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:400;text-align:right">${nights || '—'}泊</td></tr>
      <tr><td style="padding:10px 0;color:#5A5C56">お支払い金額</td><td style="padding:10px 0;font-weight:600;color:#0A3D2E;text-align:right">${amountStr}</td></tr>
    </table>
    <p style="color:#5A5C56;font-size:13px;line-height:1.8">チェックイン: 16:00〜 / チェックアウト: 〜10:00<br>鵠沼海岸駅から徒歩3分。自転車の鍵はセルフチェックイン時にお渡しします。</p>
    <p style="color:#5A5C56;font-size:13px;line-height:1.8;margin-top:20px">ご不明な点はホスト Kiwa までお気軽にご連絡ください。</p>
    ${paymentIntentId ? `<p style="color:#aaa;font-size:11px;margin-top:24px">Payment ID: ${paymentIntentId}</p>` : ''}
  </div>
  <div style="background:#0A3D2E;padding:16px 32px;text-align:center">
    <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0">© 2025 鵠沼 Hideaway · Powered by Stripe</p>
  </div>
</div>`;

  const hostHtml = `
<div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;color:#1A1A14">
  <h2 style="color:#0A3D2E">🌊 新しいご予約 — 鵠沼 Hideaway</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#5A5C56">ゲスト名</td><td style="padding:8px 0;border-bottom:1px solid #eee">${guestName || '—'}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#5A5C56">メール</td><td style="padding:8px 0;border-bottom:1px solid #eee">${guestEmail}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#5A5C56">チェックイン</td><td style="padding:8px 0;border-bottom:1px solid #eee">${checkIn}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#5A5C56">チェックアウト</td><td style="padding:8px 0;border-bottom:1px solid #eee">${checkOut}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#5A5C56">泊数</td><td style="padding:8px 0;border-bottom:1px solid #eee">${nights || '—'}泊</td></tr>
    <tr><td style="padding:8px 0;color:#5A5C56">金額</td><td style="padding:8px 0;font-weight:600;color:#0A3D2E">${amountStr}</td></tr>
  </table>
  ${paymentIntentId ? `<p style="font-size:12px;color:#aaa;margin-top:16px">PI: ${paymentIntentId}</p>` : ''}
</div>`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const [guestResult, hostResult] = await Promise.allSettled([
      resend.emails.send({
        from:    `鵠沼 Hideaway <${fromAddr}>`,
        to:      guestEmail,
        subject: `【予約確認】鵠沼 Hideaway ${checkIn}〜${checkOut}`,
        html:    guestHtml,
      }),
      resend.emails.send({
        from:    `Kugenuma Booking <${fromAddr}>`,
        to:      hostEmail,
        subject: `[新予約] 鵠沼 Hideaway — ${guestName || guestEmail} ${checkIn}`,
        html:    hostHtml,
      }),
    ]);

    const guestOk = guestResult.status === 'fulfilled';
    const hostOk  = hostResult.status === 'fulfilled';
    return res.status(200).json({ success: true, guestEmail: guestOk, hostEmail: hostOk });
  } catch (err) {
    console.error('confirm-booking error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
