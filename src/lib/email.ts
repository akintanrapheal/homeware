import { getSecrets, getSettings } from './settings';
import { formatNaira } from './format';

/**
 * Transactional email over Resend's HTTP API — no SMTP, no dependency, and it
 * works from a serverless function where a long-lived SMTP connection does not.
 *
 * Every send is best-effort. A shop that cannot email must still be able to take
 * an order, so failures are logged and swallowed rather than thrown: losing a
 * receipt is an inconvenience, losing the sale is not.
 */

interface SendResult {
  sent: boolean;
  skipped?: string;
  error?: string;
}

async function send(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
}): Promise<SendResult> {
  const { emailApiKey, emailFrom, emailReplyTo } = await getSecrets();

  if (!emailApiKey) return { sent: false, skipped: 'no API key configured' };
  if (!emailFrom) return { sent: false, skipped: 'no from-address configured' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${emailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        ...(options.replyTo || emailReplyTo
          ? { reply_to: options.replyTo || emailReplyTo }
          : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[email] send failed', res.status, detail.slice(0, 300));
      return { sent: false, error: `${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error('[email] send threw', error);
    return { sent: false, error: 'network' };
  }
}

/** Minimal escaping — order data is customer-supplied and goes into HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(storeName: string, heading: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8f6f1;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1a17">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #f1ede5;border-radius:14px;overflow:hidden">
    <div style="padding:22px 26px;border-bottom:1px solid #f1ede5">
      <div style="font-size:17px;letter-spacing:.06em;font-weight:600">${esc(storeName)}</div>
    </div>
    <div style="padding:26px">
      <h1 style="margin:0 0 14px;font-size:21px;font-weight:600">${esc(heading)}</h1>
      ${body}
    </div>
    <div style="padding:16px 26px;border-top:1px solid #f1ede5;font-size:12px;color:#6b6459">
      ${esc(storeName)}
    </div>
  </div>
</body></html>`;
}

interface OrderEmailInput {
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  note?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: { name: string; quantity: number; price: number }[];
}

function itemRows(items: OrderEmailInput['items']): string {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:7px 0;font-size:14px">${i.quantity} × ${esc(i.name)}</td>
         <td style="padding:7px 0;text-align:right;font-size:14px">${formatNaira(i.price * i.quantity)}</td></tr>`,
    )
    .join('');
}

/** Receipt to the customer. */
export async function sendOrderConfirmation(order: OrderEmailInput): Promise<SendResult> {
  const settings = await getSettings();
  if (!settings.emailOnOrder) return { sent: false, skipped: 'order emails turned off' };

  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a443c">
      Thank you, ${esc(order.customerName.split(' ')[0])}. We have your order and will confirm
      dispatch on WhatsApp.
    </p>
    <div style="background:#f8f6f1;border-radius:10px;padding:14px 16px;margin-bottom:18px">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6b6459">Order reference</div>
      <div style="font-size:20px;font-weight:600;margin-top:3px">${esc(order.reference)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse">${itemRows(order.items)}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:1px solid #f1ede5">
      <tr><td style="padding:7px 0;font-size:14px;color:#6b6459">Subtotal</td>
          <td style="padding:7px 0;text-align:right;font-size:14px">${formatNaira(order.subtotal)}</td></tr>
      <tr><td style="padding:7px 0;font-size:14px;color:#6b6459">Delivery — ${esc(order.state)}</td>
          <td style="padding:7px 0;text-align:right;font-size:14px">${order.deliveryFee === 0 ? 'Free' : formatNaira(order.deliveryFee)}</td></tr>
      <tr><td style="padding:10px 0 0;font-size:16px;font-weight:600">Total</td>
          <td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:600">${formatNaira(order.total)}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b6459">
      Delivering to ${esc(order.address)}, ${esc(order.city)}.
    </p>`;

  return send({
    to: order.email,
    subject: `${settings.storeName} — order ${order.reference}`,
    html: shell(settings.storeName, 'Order received', body),
    replyTo: settings.email || null,
  });
}

/** Notification to the shop, so an order is not missed if nobody opens WhatsApp. */
export async function sendStoreNotification(order: OrderEmailInput): Promise<SendResult> {
  const settings = await getSettings();
  if (!settings.notifyStore) return { sent: false, skipped: 'store notifications turned off' };
  if (!settings.email) return { sent: false, skipped: 'no store email configured' };

  const body = `
    <table style="width:100%;border-collapse:collapse">${itemRows(order.items)}</table>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.7">
      <strong>${formatNaira(order.total)}</strong><br>
      ${esc(order.customerName)} · ${esc(order.phone)}<br>
      ${esc(order.email)}<br>
      ${esc(order.address)}, ${esc(order.city)} — ${esc(order.state)}
      ${order.note ? `<br><br><strong>Note:</strong> ${esc(order.note)}` : ''}
    </p>`;

  return send({
    to: settings.email,
    subject: `New order ${order.reference} — ${formatNaira(order.total)}`,
    html: shell(settings.storeName, `New order ${order.reference}`, body),
    replyTo: order.email,
  });
}

export async function sendPasswordReset(to: string, name: string, url: string): Promise<SendResult> {
  const settings = await getSettings();
  const body = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4a443c">
      Hello ${esc(name.split(' ')[0])}, use the button below to choose a new password. The link
      works once and expires in an hour.
    </p>
    <p style="margin:0 0 18px">
      <a href="${esc(url)}" style="display:inline-block;background:#a3603e;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px">Choose a new password</a>
    </p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6459">
      If you did not ask for this, ignore it — your password stays as it is.
    </p>`;

  return send({
    to,
    subject: `${settings.storeName} — reset your password`,
    html: shell(settings.storeName, 'Reset your password', body),
  });
}

/** Used by the settings screen to prove the configuration actually works. */
export async function sendTestEmail(to: string): Promise<SendResult> {
  const settings = await getSettings();
  return send({
    to,
    subject: `${settings.storeName} — test email`,
    html: shell(
      settings.storeName,
      'Email is working',
      '<p style="margin:0;font-size:14px;line-height:1.6;color:#4a443c">If you are reading this, order confirmations will reach your customers.</p>',
    ),
  });
}
