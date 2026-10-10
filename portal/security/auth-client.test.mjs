import test from 'node:test';
import assert from 'node:assert/strict';
import {createPortalAuth,passwordErrorMessage,bindLogin} from './auth-client.mjs';

function resetFixture(result,session={}) {
  const label={hidden:false};
  const form={elements:{email:{value:'',closest:()=>label},password:{value:'synthetic-test-only'},remember:{checked:true}}};
  const status={textContent:''},submit={};
  const elements={'#account-form':form,'#account-status':status,'#submit':submit,'#password-label':{},'#remember-label':{},'#signup-note':{},'#forgot':{},'h1':{},'nav[aria-label="Acceso"]':{}};
  const document={querySelector:key=>elements[key],querySelectorAll:()=>[]};
  let destination=null,updates=0;
  const portal={remember:()=>{},buyer:async()=>true,client:{auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session}}),updateUser:async()=>{updates++;return result}}}};
  bindLogin(portal,document,{origin:'https://test.invalid',assign:path=>destination=path},true);
  return {form,status,submit,destination:()=>destination,updates:()=>updates};
}
test('recovery accepts an already-current password and opens the authorized library',async()=>{
  const fixture=resetFixture({error:{code:'same_password'}});
  await fixture.form.onsubmit({preventDefault(){}});
  assert.equal(fixture.updates(),1);
  assert.equal(fixture.destination(),'/');
  assert.match(fixture.status.textContent,/ya era tu contraseña actual/);
});
test('recovery confirms a successful new password and opens the authorized library',async()=>{
  const fixture=resetFixture({error:null});
  await fixture.form.onsubmit({preventDefault(){}});
  assert.equal(fixture.destination(),'/');
  assert.match(fixture.status.textContent,/se actualizó/);
});
test('an expired recovery session never changes a password or opens the library',async()=>{
  const fixture=resetFixture({error:null},null);
  await fixture.form.onsubmit({preventDefault(){}});
  assert.equal(fixture.updates(),0);
  assert.equal(fixture.destination(),null);
  assert.match(fixture.status.textContent,/ya no está activo/);
});
test('weak passwords prompt a retry without incorrectly requesting another email',()=>{
  assert.match(passwordErrorMessage({code:'weak_password'}),/sin pedir otro enlace/);
  assert.match(passwordErrorMessage({code:'same_password'}),/diferente de la anterior/);
  assert.match(passwordErrorMessage({code:'session_expired'}),/nuevo enlace/);
});
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
