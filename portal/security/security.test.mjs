import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyShopifySignature, eligiblePurchase} from './shopify-order.mjs';
import handler from './shopify-paid.mjs';

test('webhook accepts authentic bytes and rejects forged or modified payloads', () => {
  const body = Buffer.from('{"id":12}');
  const signature = createHmac('sha256', 'test-secret').update(body).digest('base64');
  assert.equal(verifyShopifySignature(body, signature, 'test-secret'), true);
  assert.equal(verifyShopifySignature(Buffer.from('{"id":13}'), signature, 'test-secret'), false);
  for (const bad of [null, '', 'invalid', 'A'.repeat(43) + '='])
    assert.equal(verifyShopifySignature(body, bad, 'test-secret'), false);
});

test('only completed purchases of an allowed product grant access', () => {
  const order = {id:123, email:' Buyer@Example.com ', financial_status:'paid',
    line_items:[{variant_id:42, quantity:1}]};
  assert.deepEqual(eligiblePurchase(order, ['42']), {order_id:'123', email:'buyer@example.com', active:true});
  for (const change of [{financial_status:'pending'}, {financial_status:'refunded'},
    {cancelled_at:'2026-10-09'}, {email:''}, {line_items:[{variant_id:99, quantity:1}]},
    {line_items:[{variant_id:42, quantity:0}]}])
    assert.equal(eligiblePurchase({...order, ...change}, ['42']), null);
});

test('unconfigured backend refuses delivery without granting access', async () => {
  const response = await handler(new Request('https://example.com/webhook', {method:'POST', body:'{}'}));
  assert.equal(response.status, 503);
});
