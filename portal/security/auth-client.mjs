// createClient is supplied by a locally bundled, pinned Supabase SDK.
// Config contains ONLY the project's public URL and publishable key.
export function passwordErrorMessage(error) {
  if(error?.code==='weak_password' || error?.name==='AuthWeakPasswordError' || /weak and easy to guess/i.test(error?.message || ''))
    return 'Esta contraseña es demasiado común o aparece en filtraciones. Elige una diferente, larga y única. Puedes volver a intentarlo aquí sin pedir otro enlace.';
  if(error?.code==='same_password') return 'Elige una contraseña diferente de la anterior.';
  return 'No pudimos cambiar la contraseña. Solicita un nuevo enlace e inténtalo otra vez.';
}
export function createPortalAuth(createClient, config, browser = window) {
  const preferenceKey = 'mis:remember-session';
  const sessionKey = 'mis:buyer-session';
  const preference = () => browser.localStorage.getItem(preferenceKey) !== 'no';
  const storage = {
    getItem: key => (preference() ? browser.localStorage : browser.sessionStorage).getItem(key),
    setItem: (key, value) => (preference() ? browser.localStorage : browser.sessionStorage).setItem(key, value),
    removeItem: key => {browser.localStorage.removeItem(key); browser.sessionStorage.removeItem(key);}
  };
  const client = createClient(config.url, config.publishableKey, {auth:{
    storage, storageKey:sessionKey, persistSession:true, autoRefreshToken:true,
    detectSessionInUrl:true, flowType:'implicit'
  }});
  function remember(enabled) {
    const oldStore = preference() ? browser.localStorage : browser.sessionStorage;
    const session = oldStore.getItem(sessionKey);
    browser.localStorage.setItem(preferenceKey, enabled ? 'yes' : 'no');
    browser.localStorage.removeItem(sessionKey);
    browser.sessionStorage.removeItem(sessionKey);
    if(session) storage.setItem(sessionKey, session);
  }
  async function buyer() {
    const {data:{user},error} = await client.auth.getUser();
    if(error || !user?.email_confirmed_at) return false;
    const result = await client.rpc('is_portal_buyer');
    if(result.error) throw Error('No pudimos comprobar tu acceso. Inténtalo nuevamente.');
    return result.data === true;
  }
  async function asset(path) {
    // Private storage enforces purchase authorization independently of this UI.
    const {data,error} = await client.storage.from('portal-library').createSignedUrl(path, 120);
    if(error || !data?.signedUrl) throw Error('No pudimos abrir este material. Vuelve a iniciar sesión.');
    return data.signedUrl;
  }
  async function logout() {
    const {error} = await client.auth.signOut({scope:'local'});
    storage.removeItem(sessionKey);
    if(error) throw Error('La sesión se borró de este navegador. No pudimos confirmar el cierre en el servidor.');
  }
  return {client, remember, buyer, asset, logout};
}

export function bindLogin(portal, document, location, recoveryRequested = false) {
  const form=document.querySelector('#account-form'),status=document.querySelector('#account-status');
  const submit=document.querySelector('#submit');
  let mode='login';
  function setMode(next) {
    mode=next;
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    const recovery=mode==='recover';
    form.elements.email.closest('label').hidden=mode==='reset';
    form.elements.email.required=mode!=='reset';
    document.querySelector('#password-label').hidden=recovery;
    form.elements.password.required=!recovery;
    form.elements.password.autocomplete=['signup','reset'].includes(mode)?'new-password':'current-password';
    document.querySelector('#remember-label').hidden=recovery;
    document.querySelector('#signup-note').hidden=mode!=='signup';
    submit.textContent=mode==='reset'?'Guardar nueva contraseña':recovery?'Enviar enlace de recuperación':mode==='signup'?'Crear mi cuenta':'Entrar a mi biblioteca';
    status.textContent='';
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  document.querySelector('#forgot').onclick=()=>setMode('recover');
  portal.client.auth.onAuthStateChange(event=>{
    if(event==='PASSWORD_RECOVERY') setMode('reset');
  });
  if(recoveryRequested) {
    setMode('reset');
    document.querySelector('h1').textContent='Crea tu nueva contraseña';
    document.querySelector('nav[aria-label="Acceso"]').hidden=true;
    document.querySelector('#forgot').hidden=true;
    status.textContent='Escribe una nueva contraseña de al menos 10 caracteres y pulsa Guardar nueva contraseña.';
  }
  form.onsubmit=async event=>{
    event.preventDefault();submit.disabled=true;status.textContent='Un momento…';
    const email=form.elements.email.value.trim(),password=form.elements.password.value;
    try{
      portal.remember(form.elements.remember.checked);
      const redirect=new URL(mode==='recover'?'/reset-password.html':'/login.html',location.origin).href;
      if(mode==='reset'){
        const {data:{session}}=await portal.client.auth.getSession();
        if(!session) throw Error('Este enlace ya no está activo. Vuelve a iniciar sesión y pulsa Olvidé mi contraseña para pedir otro.');
        const {error}=await portal.client.auth.updateUser({password});
        if(error && error.code!=='same_password') throw Error(passwordErrorMessage(error));
        setMode('login');
        status.textContent=error?.code==='same_password'?'Esa ya era tu contraseña actual. Tu acceso está listo.':'Tu contraseña se actualizó. Ya puedes entrar.';
        if(await portal.buyer()) location.assign('/');
      }else if(mode==='recover'){
        const {error}=await portal.client.auth.resetPasswordForEmail(email,{redirectTo:redirect});
        if(error) throw Error('No pudimos enviar el enlace. Inténtalo nuevamente.');
        status.textContent='Si existe una cuenta con ese correo, recibirás un enlace para recuperar tu contraseña.';
      }else if(mode==='signup'){
        const {error}=await portal.client.auth.signUp({email,password,options:{emailRedirectTo:redirect}});
        if(error?.code==='over_email_send_rate_limit' || error?.status===429) throw Error('Espera un minuto antes de solicitar otro correo. Si ya creaste tu cuenta, revisa tu bandeja de entrada y spam para confirmarla.');
        if(error) throw Error('No pudimos crear la cuenta. Revisa los datos o prueba iniciar sesión.');
        status.textContent='Revisa tu correo para confirmar tu cuenta. Si ya tenías una cuenta, inicia sesión.';
      }else{
        const {error}=await portal.client.auth.signInWithPassword({email,password});
        if(error) throw Error('Revisa tu correo y contraseña. Si acabas de registrarte, confirma primero tu correo.');
        if(await portal.buyer()) location.assign('/');
        else status.textContent='Tu cuenta está lista, pero todavía no encontramos una compra habilitada con este correo. Usa el mismo correo de tu compra.';
      }
    }catch(error){status.textContent=error.message;}finally{submit.disabled=false;}
  };
}
