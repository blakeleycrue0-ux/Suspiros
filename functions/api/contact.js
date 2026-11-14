// Cloudflare Pages Function: POST /api/contact
// Validates the enquiry form and emails it to the admissions inbox via Resend.
//
// Required environment variables (Cloudflare Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY  (Secret)  API key from resend.com
//   CONTACT_FROM    (Text)    Verified sender, e.g. "Suspiros Web <web@suspirosrehab.com>"
// Optional:
//   CONTACT_TO      (Text)    Recipient, defaults to info@suspirosrehab.com

const DEFAULT_TO = 'info@suspirosrehab.com';
const ALLOWED_ORIGINS = ['https://suspirosrehab.com', 'https://www.suspirosrehab.com'];
const MIN_FILL_MS = 3000;          // humans take longer than 3s to fill the form
const MAX_AGE_MS = 24 * 3600e3;    // form token older than a day is rejected
const LIMITS = { name: 120, phone: 40, email: 200, message: 5000 };
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clean = (v, max) =>
  String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function onRequestPost({ request, env }) {
  // Only accept requests coming from our own site (browsers always send Origin on POST)
  const origin = request.headers.get('Origin');
  const host = new URL(request.url).origin;
  if (origin && origin !== host && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/x-www-form-urlencoded') && !ct.includes('multipart/form-data')) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  let data;
  try {
    data = await request.formData();
  } catch (e) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Antispam 1: honeypot. Bots fill it; pretend success so they learn nothing.
  if (clean(data.get('bot-field'), 200)) return json({ ok: true });

  // Antispam 2: timing token set by the page's JS when it loaded.
  const ts = Number(data.get('ts'));
  const age = Date.now() - ts;
  if (!ts || age < MIN_FILL_MS) return json({ ok: true });
  if (age > MAX_AGE_MS) return json({ ok: false, error: 'expired' }, 400);

  const name = clean(data.get('name'), LIMITS.name);
  const phone = clean(data.get('phone'), LIMITS.phone);
  const email = clean(data.get('email'), LIMITS.email);
  const message = clean(data.get('message'), LIMITS.message);

  if (!name || !message || !EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid' }, 400);
  if (phone && !/^[0-9+()\-.\s]{5,40}$/.test(phone)) return json({ ok: false, error: 'invalid' }, 400);
  // Spam heuristic: link-stuffed messages
  if ((message.match(/https?:\/\//gi) || []).length > 2) return json({ ok: true });

  if (!env.RESEND_API_KEY || !env.CONTACT_FROM) {
    console.error('contact: RESEND_API_KEY / CONTACT_FROM not configured');
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  const to = env.CONTACT_TO || DEFAULT_TO;
  const text = `New enquiry from suspirosrehab.com\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\n\nMessage:\n${message}\n`;
  const html =
    `<p><strong>New enquiry from suspirosrehab.com</strong></p>` +
    `<p>Name: ${esc(name)}<br>Email: ${esc(email)}<br>Phone: ${esc(phone || '-')}</p>` +
    `<p>Message:</p><p style="white-space:pre-wrap">${esc(message)}</p>`;

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [to],
        reply_to: email,
        subject: `Admission enquiry - ${name.replace(/[\r\n]+/g, ' ')}`,
        text,
        html,
      }),
    });
  } catch (e) {
    console.error('contact: provider unreachable');
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  if (!res.ok) {
    // Log status only, never the visitor's personal data
    console.error('contact: provider error', res.status);
    return json({ ok: false, error: 'send_failed' }, 502);
  }
  return json({ ok: true });
}

// Anything but POST
export const onRequest = () => json({ ok: false, error: 'method_not_allowed' }, 405);
