const CACHE_NAME = 'lakeglass-v11';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './base.css',
  './app.js',
  './data.js',
  './dating.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

async function enhanceAppDocument(response){
  if(!response) return response;
  let text=await response.text();
  text=text
    .replace('<div class="rarity10"><span>Occurrence</span>','<div class="rarity10"><span>Color rarity</span>')
    .replaceAll('Color occurrence','Color rarity')
    .replaceAll('Form rarity','Form distinctiveness');
  if(!text.includes('src="./dating.js"')&&!text.includes('src="dating.js"')){
    text=text.replace('</body>','  <script src="./dating.js" defer></script>\n</body>');
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isAppDocument=event.request.mode==='navigate' && (url.pathname.endsWith('/lakeglass/')||url.pathname.endsWith('/lakeglass/index.html'));

  event.respondWith(
    fetch(event.request).then(async response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return isAppDocument?enhanceAppDocument(response):response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return isAppDocument?enhanceAppDocument(cached):cached;
      if (event.request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return isAppDocument?enhanceAppDocument(shell):shell;
      }
      throw new Error('Offline resource unavailable');
    })
  );
});