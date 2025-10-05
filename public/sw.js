// Service Worker for Bias-to-Profit Trading Journal
const CACHE_NAME = 'bias-to-profit-v3';
const OFFLINE_URL = '/offline.html';

// Assets to cache for offline functionality
const CACHE_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/placeholder.svg',
  '/robots.txt'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        // Cache files individually to handle failures gracefully
        return Promise.allSettled(
          CACHE_ASSETS.map(asset => 
            cache.add(asset).catch(err => {
              console.warn(`Service Worker: Failed to cache ${asset}:`, err);
              return null;
            })
          )
        );
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  
  // Force activation and skip waiting
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If network fails and it's a navigation request, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'sync-trades') {
    event.waitUntil(syncOfflineTrades());
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  let notificationData = {
    title: 'Bias-to-Profit',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'bias-to-profit',
    requireInteraction: true,
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Sync offline trades when connection is restored
async function syncOfflineTrades() {
  try {
    // Get offline trades from localStorage instead of IndexedDB
    const pendingChanges = localStorage.getItem('bias-to-profit-pending');
    if (!pendingChanges) return;
    
    const changes = JSON.parse(pendingChanges);
    const unsyncedChanges = changes.filter(change => !change.synced);
    
    if (unsyncedChanges.length > 0) {
      console.log('Service Worker: Syncing offline trades', unsyncedChanges.length);
      
      // Send trades to server via Supabase
      for (const change of unsyncedChanges) {
        try {
          const response = await fetch('/api/sync-trades', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              trade: change.data,
              action: change.action,
              timestamp: change.timestamp
            }),
          });
          
          if (response.ok) {
            // Mark as synced
            change.synced = true;
            console.log('Service Worker: Trade synced successfully', change.id);
          }
        } catch (error) {
          console.error('Service Worker: Failed to sync trade', change.id, error);
        }
      }
      
      // Update localStorage with synced changes
      localStorage.setItem('bias-to-profit-pending', JSON.stringify(changes));
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync offline trades', error);
  }
}

// Helper functions for localStorage operations
async function getOfflineTrades() {
  try {
    const pendingChanges = localStorage.getItem('bias-to-profit-pending');
    if (!pendingChanges) return [];
    
    const changes = JSON.parse(pendingChanges);
    return changes.filter(change => !change.synced);
  } catch (error) {
    console.error('Service Worker: Failed to get offline trades', error);
    return [];
  }
}

async function clearOfflineTrades() {
  try {
    localStorage.removeItem('bias-to-profit-pending');
    console.log('Service Worker: Cleared offline trades');
  } catch (error) {
    console.error('Service Worker: Failed to clear offline trades', error);
  }
}
