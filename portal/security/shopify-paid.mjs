import {verifyShopifySignature, eligiblePurchase} from './shopify-order.mjs';

export default async function handler(request) {
  const reply = (status, message) => new Response(message, {status});
  if (request.method !== 'POST') return reply(405, 'Method not allowed');
  const {SHOPIFY_WEBHOOK_SECRET, SHOPIFY_SHOP_DOMAIN, SHOPIFY_PORTAL_VARIANTS,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY} = process.env;
  if (![SHOPIFY_WEBHOOK_SECRET, SHOPIFY_SHOP_DOMAIN, SHOPIFY_PORTAL_VARIANTS,
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY].every(Boolean)) return reply(503, 'Not configured');
  const body = Buffer.from(await request.arrayBuffer());
  if (!verifyShopifySignature(body, request.headers.get('x-shopify-hmac-sha256'), SHOPIFY_WEBHOOK_SECRET))
    return reply(401, 'Invalid signature');
  if (request.headers.get('x-shopify-shop-domain') !== SHOPIFY_SHOP_DOMAIN ||
      request.headers.get('x-shopify-topic') !== 'orders/paid') return reply(403, 'Unexpected delivery');
  let order;
  try {order = JSON.parse(body.toString('utf8'));} catch {return reply(400, 'Invalid payload');}
  const purchase = eligiblePurchase(order, SHOPIFY_PORTAL_VARIANTS.split(',').map(x => x.trim()).filter(Boolean));
  if (!purchase) return reply(200, 'Ignored');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/portal_purchases?on_conflict=shop_domain,order_id`, {
    method: 'POST', headers: {'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'},
    body: JSON.stringify({...purchase, shop_domain: SHOPIFY_SHOP_DOMAIN, updated_at: new Date().toISOString()})
  });
  return response.ok ? reply(200, 'Accepted') : reply(503, 'Please retry');
}
