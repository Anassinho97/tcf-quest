/* Classic local scripts: works on file:// without fetch, server or ES modules. */
window.TCF_PACKS=window.TCF_PACKS||[];
window.TCF_LOAD_ERRORS=[];
window.TCF_CONTENT_READY=(async()=>{
const entries=window.TCF_CATALOG||[];
for(const entry of entries){try{if(!/^data\/[a-zA-Z0-9_./-]+\.js$/.test(entry.src)||entry.src.includes('..'))throw Error('Chemin invalide');await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=entry.src;script.async=false;script.onload=resolve;script.onerror=()=>reject(Error('Fichier inaccessible'));document.head.append(script);});if(!entry.packs.every(id=>window.TCF_PACKS.some(p=>p.id===id)))throw Error('Pack non enregistré');}catch(error){window.TCF_LOAD_ERRORS.push({src:entry.src,message:error.message});}}
if(!entries.length)window.TCF_LOAD_ERRORS.push({src:'data/catalog.js',message:'Catalogue absent ou vide'});
})();
