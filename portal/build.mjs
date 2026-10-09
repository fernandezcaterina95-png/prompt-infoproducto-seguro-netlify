import {mkdir,copyFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js'])await copyFile(`portal/${file}`,`dist/${file}`);
await writeFile('dist/_headers',`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Cache-Control: private, max-age=0, must-revalidate\n`);
console.log('Portal ready. Library generated separately from local source ebooks.');
