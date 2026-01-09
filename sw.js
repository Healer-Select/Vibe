
const CACHE_NAME = 'vibe-v4'; // Incremented version
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Handle incoming push messages from Ably/WebPush
self.addEventListener('push', (event) => {
  let data = { title: 'Vibe', body: 'Someone sent you a pulse! ❤️', type: 'tap', count: 1 };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Determine vibration pattern for background haptics
  let vibratePattern = [200];
  if (data.type === 'tap') {
    vibratePattern = Array(data.count || 1).fill(100).flatMap(v => [v, 50]);
  } else if (data.type === 'hold') {
    vibratePattern = [data.duration || 1000];
  } else if (data.type === 'pattern' && data.patternData) {
    vibratePattern = data.patternData;
  }

  const options = {
    body: data.body,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f43f5e"%3E%3Cpath d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f43f5e"%3E%3Cpath d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/%3E%3C/svg%3E',
    vibrate: vibratePattern,
    data: { url: self.location.origin },
    tag: 'vibe-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Vibe', options)
  );
});

// Open app on notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
