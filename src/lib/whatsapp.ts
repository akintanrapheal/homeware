import { STORE } from './config';
import { formatNaira } from './format';

interface WhatsAppOrderInput {
  reference: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  zoneLabel: string;
  note?: string | null;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/**
 * Builds the wa.me deep link the customer is sent to after checkout. Everything
 * the shop needs to pack and dispatch is in the message body, so an order never
 * depends on the operator opening the admin dashboard.
 */
export function buildOrderWhatsAppLink(order: WhatsAppOrderInput): string {
  const lines = [
    `*NEW ORDER — ${order.reference}*`,
    `From ${STORE.name}`,
    '',
    '*Items*',
    ...order.items.map(
      (i) => `• ${i.quantity} × ${i.name} — ${formatNaira(i.price * i.quantity)}`,
    ),
    '',
    `Subtotal: ${formatNaira(order.subtotal)}`,
    `Delivery (${order.zoneLabel}): ${
      order.deliveryFee === 0 ? 'Free' : formatNaira(order.deliveryFee)
    }`,
    `*Total: ${formatNaira(order.total)}*`,
    '',
    '*Deliver to*',
    order.customerName,
    order.phone,
    order.address,
    order.city,
  ];

  if (order.note) {
    lines.push('', `*Note:* ${order.note}`);
  }

  lines.push('', 'Please confirm availability and payment details. Thank you!');

  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/** Generic "chat to us" link used by the floating button and contact page. */
export function buildEnquiryLink(message?: string): string {
  const text =
    message ?? `Hello ${STORE.name}! I would like to ask about a product.`;
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
}
