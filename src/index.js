window.$ = document.querySelector.bind(document);

componentLoader.load([
  {
    urls: [
      "js/view-states.js",
      "js/dom-events/pip-events.js",
      "js/dom-events.js",
      "js/utils/view-state-util.js",
      "js/ui.js",
      "js/uis/ui-pip.js",
      "js/uis/ui-mission.js",
      "js/uis/ui-collection.js",
      "js/uis/ui-tracker.js",
      "js/lib/lsdb.js",
    ],
    callback: function() { 
      
      viewStateUtil.Init(viewStates); 
      DOMEvents.Init();
      
      // check build mode
      if (!window.location.href.includes('https://dailyheroes.web.app/')) {
        viewStateUtil.Toggle('build', ['dev']);
      }
      
      // platform checking
      window.modeChromeExtension = false;
      try {
        if (chrome.storage.local.get) {
          window.modeChromeExtension = true;
        }
      } catch (e) {}
      
      if (window.modeChromeExtension) {
        window.service = window.serviceChrome;
      } else {
        viewStateUtil.Toggle('platform', ['web']);
      }

    },
  },
  {
    urls: [
      "js/utils/helper.js",
      "js/app-data.js",
      "js/utils/uuidv4-util.js",
      
      // app components
      "js/components/task-component.js",
      "js/components/mission-component.js",
      "js/components/tracker-component.js",
      "js/components/sequence-component.js",
      "js/components/time-streak-component.js",
    ],
    callback: function() { 
      
    },
  },
  {
    urls: [
      "js/lib/sortable@1.15.1.min.js",
      "js/app.js",
    ],
    callback: function() {
      
      if (!window.modeChromeExtension) {
        initServiceWorker();
      }
      
      // init app
      app.Init();
      
    },
  },
  {
    urls: [
      "js/components/priority-mapper-component.js",
    ],
  },
  {
    urls: [
      "js/lib/idb-keyval@6.js",
    ]
  },
  {
    urls: [
      "js/lib/drive-api.js",
      "js/components/gsi-chrome-component.js",
      "js/components/backup-component.js",
    ],
    callback: function() {
      
      if (app.isPlatformWeb) {
        componentLoader.load([{
            urls: [
              'https://accounts.google.com/gsi/client',
            ]
          },
        ]);
      }
            
    }
  }
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
      
      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data === 'start-timer') {
          toggleStartTimer();
        } else if (event.data === 'take-a-break') {
          toggleStartTimer();
        }
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