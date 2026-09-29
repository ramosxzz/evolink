const CACHE="evolink-v2";
const CORE=["/","/login","/offline","/manifest.webmanifest","/brand/evolink-mark-192.png","/brand/evolink-mark-512.png"];
self.addEventListener("install", event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener("activate", event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event=>{if(event.request.method!=="GET")return;event.respondWith(fetch(event.request).then(response=>{const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));return response}).catch(()=>caches.match(event.request).then(found=>found||caches.match("/offline"))));});
