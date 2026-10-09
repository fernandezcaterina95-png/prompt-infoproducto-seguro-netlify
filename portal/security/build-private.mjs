import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const output=path.join(root,'dist-private');
await mkdir(output,{recursive:true});
for(const file of ['style.css','kitchen.css','kitchen-math.mjs'])
  await copyFile(path.join(root,'portal',file),path.join(output,file));
for(const file of ['auth-client.mjs','portal-access.mjs','supabase.js','login.css'])
  await copyFile(path.join(root,'portal/security',file),path.join(output,file));
await copyFile(path.join(root,'dist/logo.webp'),path.join(output,'logo.webp'));
let login=await readFile(path.join(root,'portal/security/login.html'),'utf8');
login=login.replace('</head>','<script type="module" src="portal-access.mjs"></script></head>');
await writeFile(path.join(output,'login.html'),login);
await writeFile(path.join(output,'reset-password.html'),login);
let html=await readFile(path.join(root,'portal/index.html'),'utf8');
html=html.replace('<script src="app.js" defer></script>','<script type="module" src="app.js"></script>');
html=html.replace('<span class="pill">Tu espacio de lectura</span>', '<button id="logout" class="pill">Cerrar sesión</button>');
await writeFile(path.join(output,'index.html'),html);
let app=await readFile(path.join(root,'portal/app.js'),'utf8');
app="import {portal,assetUrl,privateJson,requireBuyer} from './portal-access.mjs';\n"+app;
app=app.replace('init();',`if(await requireBuyer()) init();
document.querySelector('#logout').onclick=async()=>{try{await portal.logout()}finally{location.replace('/login.html')}};
async function hydrateImages(){
  await Promise.allSettled([...document.querySelectorAll('img[data-private]')].map(async img=>{
    const source=img.dataset.private;img.removeAttribute('data-private');
    try{img.src=await assetUrl(source)}catch{img.alt='No pudimos cargar la portada'}
  }));
}`);
app=app.replaceAll('src="library/${b.id}/','data-private="library/${b.id}/');
app=app.replace("$('#stage-search')?.addEventListener", "hydrateImages();\n$('#stage-search')?.addEventListener");
app=app.replace('const response=await fetch(`library/${id}/text.json`);if(!response.ok)throw Error(\'text\');const data=await response.json();', 'const data=await privateJson(`library/${id}/text.json`);');
app=app.replace('function renderPage(){','async function renderPage(){');
app=app.replace('$(\'#page-image\').src=`library/${current.id}/${page}.webp`;', `try{const url=await assetUrl(\`library/\${current.id}/\${page}.webp\`);if(ticket!==loadId)return;$('#page-image').src=url}catch{if(ticket===loadId)$('#page-status').textContent='Acceso no disponible. Vuelve a iniciar sesión.';return}`);
app=app.replace('img.src=`library/${current.id}/${page+1}.webp`','assetUrl(`library/${current.id}/${page+1}.webp`).then(url=>img.src=url).catch(()=>{})');
app=app.replace("const res=await fetch('catalog.json');if(!res.ok)throw Error('catalog');catalog=await res.json();", "catalog=await privateJson('catalog.json');");
await writeFile(path.join(output,'app.js'),app);
let kitchen=await readFile(path.join(root,'portal/kitchen.js'),'utf8');
kitchen="import {privateJson} from './portal-access.mjs';\n"+kitchen;
kitchen=kitchen.replace("fetch('recipes.json').then(r=>{if(!r.ok)throw Error('recipes');return r.json()})", "privateJson('recipes.json')");
await writeFile(path.join(output,'kitchen.js'),kitchen);
await writeFile(path.join(output,'_headers'),'/*\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n');
console.log('Private build prepared; paid content is excluded from the public deployment.');
