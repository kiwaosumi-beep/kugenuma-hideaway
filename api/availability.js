// api/availability.js — 鵠沼 Hideaway
// Fetches Airbnb iCal and returns booked dates

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const icalUrl = process.env.AIRBNB_ICAL_URL;
  if (!icalUrl) {
    return res.status(500).json({ success: false, error: 'AIRBNB_ICAL_URL not set' });
  }

  try {
    const resp = await fetch(icalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; kugenuma-hideaway/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) throw new Error(`iCal fetch failed: ${resp.status}`);

    const ical = await resp.text();
    const bookedDates = new Set();

    // Parse VEVENT blocks
    const events = ical.split('BEGIN:VEVENT');
    for (let i = 1; i < events.length; i++) {
      const block = events[i];
      const statusMatch = block.match(/STATUS:([^\r\n]+)/);
      if (statusMatch && statusMatch[1].trim().toUpperCase() === 'CANCELLED') continue;

      const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
      const endMatch   = block.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);
      if (!startMatch || !endMatch) continue;

      const parseDate = (s) => new Date(
        parseInt(s.slice(0,4)), parseInt(s.slice(4,6))-1, parseInt(s.slice(6,8))
      );
      const start = parseDate(startMatch[1]);
      const end   = parseDate(endMatch[1]);

      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        bookedDates.add(`${y}-${m}-${day}`);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      bookedDates: Array.from(bookedDates).sort(),
    });
  } catch (err) {
    console.error('availability error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
