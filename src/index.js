window.$ = document.querySelector.bind(document);
window.qsa = document.querySelectorAll.bind(document);

window.componentLoader.load([
  {
    urls: [
      'dom-events.js',
      'ui.js',
      'lsdb.js',
    ],
    callback: function() { },
  },
  {
    urls: [
      'js/app.js',
    ],
    callback: function() {
      
      if (!window.modeChromeExtension) {
        initServiceWorker();
      }
      
    },
  },
]);


// service worker handler
function initServiceWorker() {
 
  let $ = document.querySelector.bind(document);
  let worker;
  let checkUpdate;
  
  function clientUpdateHandler(swo) {
    
    
    if (worker)
      worker.waiting.postMessage({action: 'skipWaiting'});
    else if (swo)
      swo.waiting.postMessage({action: 'skipWaiting'});
    new Promise(function(resolve, reject) {
      if ($('#update-notif') !== null) {
        $('#update-notif').classList.toggle('active', true);
        $('#btn-refresh').onclick = resolve;
        $('#btn-dismiss').onclick = reject;
      } else {
        checkUpdate = setInterval(function() {
          if ($('#update-notif') !== null) {
            clearInterval(checkUpdate);
            $('#update-notif').classList.toggle('active', true);
            $('#btn-refresh').onclick = resolve;
            $('#btn-dismiss').onclick = reject;
          }
        }, 1000);
      }
    }).then(function() {
      $('#update-notif').classList.toggle('active', false);
      location.href = location.href;
    }).catch(function() {
      $('#update-notif').classList.toggle('active', false);
    });
  }
  if (typeof(navigator) !== 'undefined' && 'serviceWorker' in navigator) {
    // uncomment to debug without SW
    // return;
    navigator.serviceWorker.register('/sw.js').then(function(swo) {
      if (!navigator.serviceWorker.controller)
        return;
      if (swo.waiting) {
        swo.waiting.postMessage({action: 'skipWaiting'});
        if (typeof(clientUpdateHandler) === 'undefined') {
          
          if (window.confirm('App updated. Reload?'))
            location.href = location.href;
        } else {
          worker = swo;
          clientUpdateHandler(swo);
        }
        return;
      }
      if (swo.installing) {
        swo.installing.addEventListener('statechange', function(e) {
          if (swo.installing.state == 'installed') {
            swo.waiting.postMessage({action: 'skipWaiting'});
            if (typeof(clientUpdateHandler) === 'undefined') {
              if (window.confirm('App updated. Reload?'))
                location.href = location.href;
            } else {
              worker = swo;
              clientUpdateHandler(swo);
            }
          }
        });
        return;
      }
      swo.addEventListener('updatefound', function() {
        swo.installing.addEventListener('statechange', function(e) {
          if (this.state == 'installed') {
            swo.waiting.postMessage({action: 'skipWaiting'});
            if (typeof(clientUpdateHandler) === 'undefined') {
              if (window.confirm('App updated. Reload?'))
                location.href = location.href;
            } else {
              worker = swo;
              clientUpdateHandler(swo);
            }
          }
        });
      });
    }).catch(function(e) {
      console.error('Something went wrong.');
    });
  }

  // PWA custom install

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPromotion();
  });

  let buttonInstall = $('#buttonInstall');

  buttonInstall.addEventListener('click', async () => {
    hideInstallPromotion();
    deferredPrompt.prompt();
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    hideInstallPromotion();
    deferredPrompt = null;
  });

  function showInstallPromotion() {
    buttonInstall.classList.toggle('d-none', false);
  }

  function hideInstallPromotion() {
    buttonInstall.classList.toggle('d-none', true);
  }
  
}