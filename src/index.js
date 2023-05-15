window.$ = document.querySelector.bind(document);
window.qsa = document.querySelectorAll.bind(document);
window.asd = console.log;

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
    callback: function() { },
  },
]);