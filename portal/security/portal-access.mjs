import {createClient} from './supabase.js';
import {createPortalAuth,bindLogin} from './auth-client.mjs';
const recoveryRequested = location.pathname.endsWith('/reset-password.html') || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
export const portal = createPortalAuth(createClient,{
  url:'https://rvypcouftbrstrezexer.supabase.co',
  publishableKey:'sb_publishable_d2y44Ra9z2q8PmRQ4yPw8A_zTLFhk2b'
});
const cache=new Map();
export async function assetUrl(path){
  path=path.replaceAll('/','__');
  const existing=cache.get(path);
  if(existing && existing.expires>Date.now())return existing.url;
  const url=await portal.asset(path);
  cache.set(path,{url,expires:Date.now()+90000});
  return url;
}
export async function privateJson(path){
  const response=await fetch(await assetUrl(path),{cache:'no-store'});
  if(!response.ok)throw Error('No pudimos abrir el material.');
  return response.json();
}
export async function requireBuyer(){
  if(await portal.buyer())return true;
  location.replace('/login.html');return false;
}
if(document.querySelector('#account-form')){
  bindLogin(portal,document,location,recoveryRequested);
}
