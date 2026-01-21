// public/service-worker.js

const CACHE_NAME = 'vibenotes-v1';

// 1. Install Event: Sets up the worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate Event: Cleans up old workers
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 3. Fetch Event: Required for the "Install" button to appear on Chrome Desktop
self.addEventListener('fetch', (event) => {
  // We simply pass the request to the network. 
  // We don't need complex caching logic, just the event listener itself.
  event.respondWith(fetch(event.request));
});