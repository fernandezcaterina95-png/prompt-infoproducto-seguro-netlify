Deno.serve(async (req: Request) => {
 const reply=(status:number,message:string)=>new Response(message,{status});
 if(req.method!=='POST')return reply(405,'Method not allowed');
 const secret=Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!key)return reply(503,'Not configured');
 const bytes=new Uint8Array(await req.arrayBuffer());
 const header=req.headers.get('x-shopify-hmac-sha256')||'';
 if(!/^[A-Za-z0-9+/]{43}=$/.test(header))return reply(401,'Invalid signature');
 const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const signature=Uint8Array.from(atob(header),c=>c.charCodeAt(0));
 if(!await crypto.subtle.verify('HMAC',cryptoKey,signature,bytes))return reply(401,'Invalid signature');
 const shop=req.headers.get('x-shopify-shop-domain')||'';
 if(!/^[a-z0-9-]+\.myshopify\.com$/.test(shop)||req.headers.get('x-shopify-topic')!=='orders/paid')return reply(403,'Unexpected delivery');
 let order;try{order=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply(400,'Invalid payload')}
 const email=String(order.email||order.contact_email||'').trim().toLowerCase();
 if(order.financial_status!=='paid'||order.cancelled_at||!order.id||!/^\S+@\S+\.\S+$/.test(email)||
 !Array.isArray(order.line_items)||!order.line_items.some((x:any)=>String(x.variant_id)==='63815359693177'&&x.quantity>0))return reply(200,'Ignored');
 const result=await fetch(url+'/rest/v1/portal_purchases?on_conflict=shop_domain,order_id',{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({shop_domain:shop,order_id:String(order.id),email,active:true,updated_at:new Date().toISOString()})});
 return result.ok?reply(200,'Accepted'):reply(503,'Please retry');
});
