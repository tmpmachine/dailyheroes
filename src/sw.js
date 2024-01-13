/*!
  increase below number to trigger service worker update/reactivation
  to deliver latest updates for all users automatically on page visit
  
  unique numer : 41
*/

let cacheName = 'dailyheroes-MjQzNTM2OTU';

// remove old caches
caches.keys().then(function(c){
  c.map(function(cacheName){
    if (cacheName.startsWith('sampleApp')) {
      caches.delete(cacheName).then(function(boolean) {
        // your cache is now deleted
      });
    }
  });
});

function extractUrlsFromJson(json) {
  let urls = [];
  for (let key in json) {
    if (key == "skip") {
      continue;
    }
    if (Array.isArray(json[key])) {
      urls = urls.concat(json[key]);
    }
  }
  return urls;
}

self.addEventListener('message', function(e) {
  if (e.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (e.data && e.data.type == 'extension' && e.data.name !== null && e.data.name.length > 0) {
    cacheExtension(e); 
  }
});

self.addEventListener('install', function(event) {
  event.waitUntil(
    recache()
  );
});

function recache() {
  
  return fetch('manifest-cache.json')
  .then(res => res.json())
  .then(json => {
    let cacheURLs = extractUrlsFromJson(json);
    caches.delete(cacheName)
    .then(() => {
      caches.open(cacheName)
      .then(function(cache) {
        return Promise.all(
          cacheURLs.map(function(url) {
            return cache.add(url).catch(function(error) {
              console.error('Failed to cache URL:', url, error);
            });
          })
        );
      })
      .then(function() {
        console.log('Files successfully cached.');
      })
      .catch(function(error) {
        console.log(error);
        console.log('Failed to cache all required files.');
      });
    });
  });
  
}

self.addEventListener('activate', function(e) {
  e.waitUntil(
    recache()
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(resp) {
      if (resp)
        return resp;
      
      return fetch(e.request).then(function(r) {
        return r;
      }).catch(function() {
        console.error('Check connection.');
      });
    })
  );
});

function cacheExtension(e) {
	e.waitUntil(Promise.all([
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(e.data.files);
    }),
    e.source.postMessage({ 
    	name: e.data.name, 
    	type: e.data.type,
    }),
  ]));
}


// handle notification click
self.addEventListener(
  'notificationclick',
  (event) => {
    
    if (event.action === 'close') {
      
      event.notification.close();
      
    } else if (event.action === 'start-next-sequence') {
      
      // Send a message to the client(s)
      event.waitUntil(
        clients.matchAll().then(function(clients) {
          
          for (const client of clients) {
            let url = new URL(client.url);
            if (url.pathname === '/' && 'focus' in client) {
              client.postMessage('start-next-sequence');
              return;
            }
          }
          if (clients.openWindow) return clients.openWindow('/');
          
        })
      );
      
    } else {
      
       event.waitUntil(
        clients.matchAll().then(function(clients) {
          
          for (const client of clients) {
            let url = new URL(client.url);
            if (url.pathname === '/' && 'focus' in client) {
              client.focus()
              return;
            }
          }
          if (clients.openWindow) return clients.openWindow('/');
          
        })
      );
    
    }
    
  },
  false,
);