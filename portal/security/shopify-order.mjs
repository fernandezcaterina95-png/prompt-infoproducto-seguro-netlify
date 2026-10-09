import {createHmac, timingSafeEqual} from 'node:crypto';

export function verifyShopifySignature(body, signature, secret) {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  const received = Buffer.from(signature, 'base64');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function eligiblePurchase(order, variantIds) {
  if (order.financial_status !== 'paid' || order.cancelled_at) return null;
  const eligible = Array.isArray(order.line_items) && order.line_items.some(item =>
    variantIds.includes(String(item.variant_id)) && Number(item.quantity) > 0);
  const email = String(order.email || order.contact_email || '').trim().toLowerCase();
  if (!eligible || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !order.id) return null;
  return {order_id: String(order.id), email, active: true};
}
