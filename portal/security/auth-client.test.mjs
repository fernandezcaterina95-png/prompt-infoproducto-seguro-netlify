import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortalAuth} from './auth-client.mjs';
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
test('remembered sessions survive a new browser session; unchecked sessions do not',()=>{
  const browser={localStorage:store(),sessionStorage:store()};let storage;
  const create=(_url,_key,options)=>{storage=options.auth.storage;return {auth:{}}};
  const portal=createPortalAuth(create,{url:'https://test.invalid',publishableKey:'public-test'},browser);
  storage.setItem('mis:buyer-session','fake-session');
  browser.sessionStorage=store();
  assert.equal(storage.getItem('mis:buyer-session'),'fake-session');
  portal.remember(false);
  assert.equal(browser.localStorage.getItem('mis:buyer-session'),null);
  assert.equal(storage.getItem('mis:buyer-session'),'fake-session');
  browser.sessionStorage=store();
  assert.equal(storage.getItem('mis:buyer-session'),null);
});
test('unconfirmed and unpaid accounts cannot pass the buyer gate',async()=>{
  let user={email_confirmed_at:null},paid=false;
  const client={auth:{getUser:async()=>({data:{user}})},rpc:async()=>({data:paid})};
  const portal=createPortalAuth(()=>client,{},{localStorage:store(),sessionStorage:store()});
  assert.equal(await portal.buyer(),false);
  user={email_confirmed_at:'2026-10-09'};
  assert.equal(await portal.buyer(),false);
  paid=true;assert.equal(await portal.buyer(),true);
});
test('logout clears both persistent and temporary sessions',async()=>{
  const browser={localStorage:store(),sessionStorage:store()};
  const portal=createPortalAuth(()=>({auth:{signOut:async()=>({error:null})}}),{},browser);
  browser.localStorage.setItem('mis:buyer-session','fake-session');
  browser.sessionStorage.setItem('mis:buyer-session','fake-session');
  await portal.logout();
  assert.equal(browser.localStorage.getItem('mis:buyer-session'),null);
  assert.equal(browser.sessionStorage.getItem('mis:buyer-session'),null);
});
