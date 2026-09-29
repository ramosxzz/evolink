const CACHE="evolink-v3";
const CORE=["/","/login","/offline","/manifest.webmanifest","/brand/evolink-mark-192.png","/brand/evolink-mark-512.png"];
self.addEventListener("install", event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate", event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
// Network-first for same-origin GETs only. Supabase (cross-origin) and /api
// responses carry user data and must never land in Cache Storage.
self.addEventListener("fetch", event=>{const url=new URL(event.request.url);if(event.request.method!=="GET"||url.origin!==self.location.origin||url.pathname.startsWith("/api/"))return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone))}return response}).catch(()=>caches.match(event.request).then(found=>found||caches.match("/offline"))));});
