/* Increment VERSION after app/content changes. IndexedDB and localStorage are never cleared. */
const VERSION='tcf-quest-v1',PREFIX='tcf-quest-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-',SHELL=PREFIX+VERSION+'-shell',AUDIO=PREFIX+'audio';
self.addEventListener('install',event=>event.waitUntil((async()=>{const response=await fetch(new URL('precache.json',self.registration.scope),{cache:'no-store'});if(!response.ok)throw Error('Cache list unavailable');const files=await response.json();await (await caches.open(SHELL)).addAll(files.map(file=>new Request(new URL(file,self.registration.scope),{cache:"reload"})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==SHELL&&key!==AUDIO)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
event.respondWith((async()=>{
 const cached=await (await caches.open(SHELL)).match(req,{ignoreSearch:true})||await (await caches.open(AUDIO)).match(req);
 if(cached){const range=req.headers.get('range');if(!range)return cached;
 const bytes=await cached.arrayBuffer(),m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m)return fetch(req);
 const start=m[1]?Number(m[1]):Math.max(0,bytes.byteLength-Number(m[2])),end=m[1]?(m[2]?Math.min(Number(m[2]),bytes.byteLength-1):bytes.byteLength-1):bytes.byteLength-1;
 if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
 return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('Content-Type')||'audio/mpeg','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
 }
 try{const response=await fetch(req);if(url.pathname.includes('/assets/audio/')&&response.status===200)await (await caches.open(AUDIO)).put(req,response.clone());return response;}
 catch(error){if(req.mode==='navigate')return await caches.match(new URL('index.html',self.registration.scope));throw error;}
})());});
