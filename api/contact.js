// api/contact.js — 鵠沼 Hideaway
// Receives contact form submissions and sends email to host via Resend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey    = process.env.RESEND_API_KEY;
  const hostEmail = process.env.HOST_EMAIL || 'kiwaosumi@hideaway-resort.net';
  const fromAddr  = 'noreply@hideaway-resort.net';

  const { name, email, checkin, checkout, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return res.status(200).json({ success: true, emailSkipped: true });
  }

  const hostHtml = `
<div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;color:#1A1A14">
  <div style="background:#4A6E08;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;font-weight:300;margin:0">鵠沼 <em style="color:#E0C88A">Hideaway</em></h1>
    <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:4px 0 0">お問い合わせ通知</p>
  </div>
  <div style="padding:28px 32px;background:#f9f7f3">
    <h2 style="color:#4A6E08;font-weight:400;font-size:16px;margin:0 0 16px">📬 新着お問い合わせ</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #e8e4da;color:#5A5C56;width:40%">お名前</td><td style="padding:8px 0;border-bottom:1px solid #e8e4da">${name}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #e8e4da;color:#5A5C56">メール</td><td style="padding:8px 0;border-bottom:1px solid #e8e4da"><a href="mailto:${email}" style="color:#4A6E08">${email}</a></td></tr>
      ${checkin ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e8e4da;color:#5A5C56">チェックイン予定</td><td style="padding:8px 0;border-bottom:1px solid #e8e4da">${checkin}</td></tr>` : ''}
      ${checkout ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e8e4da;color:#5A5C56">チェックアウト予定</td><td style="padding:8px 0;border-bottom:1px solid #e8e4da">${checkout}</td></tr>` : ''}
    </table>
    <div style="margin-top:16px;padding:16px;background:#fff;border-left:3px solid #4A6E08">
      <p style="font-size:11px;color:#5A5C56;margin:0 0 6px;letter-spacing:0.06em">お問い合わせ内容</p>
      <p style="font-size:13px;line-height:1.8;margin:0;white-space:pre-wrap">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
    </div>
  </div>
  <div style="background:#4A6E08;padding:14px 32px;text-align:center">
    <p style="color:rgba(255,255,255,0.4);font-size:10px;margin:0">© 2025 鵠沼 Hideaway</p>
  </div>
</div>`;

  const guestHtml = `
<div style="font-family:'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;color:#1A1A14">
  <div style="background:#4A6E08;padding:24px 32px">
    <h1 style="color:#fff;font-size:20px;font-weight:300;margin:0">鵠沼 <em style="color:#E0C88A">Hideaway</em></h1>
    <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:4px 0 0">Kugenuma-Kaigan, Fujisawa, Kanagawa</p>
  </div>
  <div style="padding:28px 32px">
    <h2 style="color:#4A6E08;font-weight:400;font-size:17px;margin:0 0 12px">お問い合わせを受け付けました</h2>
    <p style="color:#5A5C56;font-size:13px;line-height:1.8">${name} 様<br><br>
    お問い合わせいただきありがとうございます。通常24時間以内にご返信いたします。</p>
    <div style="margin:20px 0;padding:14px 18px;background:#f4f8e8;border-left:3px solid #4A6E08;font-size:12px;color:#5A5C56;line-height:1.8">
      ${message.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}
    </div>
    <p style="color:#5A5C56;font-size:12px;line-height:1.8">ご不明な点がございましたら、このメールに直接ご返信ください。<br>
    引き続きよろしくお願いいたします。</p>
    <p style="color:#4A6E08;font-size:13px;font-style:italic;margin-top:20px">— Kiwa, 鵠沼 Hideaway</p>
  </div>
  <div style="background:#4A6E08;padding:14px 32px;text-align:center">
    <p style="color:rgba(255,255,255,0.4);font-size:10px;margin:0">© 2025 鵠沼 Hideaway · 神奈川県藤沢市鵠沼松が岡2-1-14</p>
  </div>
</div>`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const [hostResult, guestResult] = await Promise.allSettled([
      resend.emails.send({
        from:    `鵠沼 Hideaway <${fromAddr}>`,
        to:      hostEmail,
        subject: `[お問い合わせ] 鵠沼 Hideaway — ${name}`,
        html:    hostHtml,
      }),
      resend.emails.send({
        from:    `鵠沼 Hideaway <${fromAddr}>`,
        to:      email,
        subject: `【お問い合わせ受付】鵠沼 Hideaway`,
        html:    guestHtml,
      }),
    ]);

    return res.status(200).json({
      success: true,
      hostEmail: hostResult.status === 'fulfilled',
      guestEmail: guestResult.status === 'fulfilled',
    });
  } catch (err) {
    console.error('contact error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
