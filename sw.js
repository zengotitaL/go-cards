'use strict';
// Change this version whenever publishing an updated game or offline asset.
const CACHE_PREFIX = 'five-car-rally-cards:' + self.registration.scope + ':';
const CACHE_NAME = CACHE_PREFIX + 'offline-v4-manual-points';
const FILES = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
const shellURL = urls[0];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls.map(url => new Request(url, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request.mode === 'navigate' ? shellURL : request);
    if (cached) return cached;
    try { return await fetch(request); }
    catch { return new Response('This file is unavailable offline.', {status: 503, headers: {'Content-Type': 'text/plain'}}); }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'OFFLINE_STATUS' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const ready = (await Promise.all(urls.map(url => cache.match(url)))).every(Boolean);
    event.ports[0].postMessage({ready});
  })());
});
