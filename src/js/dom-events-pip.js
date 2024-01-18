let DOMEventsPiP = (function() {
  
  let eventsMap = {
    
  	onclick: {
  	  'start-or-restart-timer': () => uiPiP.StartOrRestartTimer(),
  	  'stop-timer': () => uiPiP.StopTimer(),
  	},
  	
  };
  
  let listening = function(docPiP, selector, dataKey, eventType, callbacks) {
    let elements = docPiP.querySelectorAll(selector);
    for (let el of elements) {
      let callbackFunc = callbacks[el.dataset[dataKey]];
      el.addEventListener(eventType, callbackFunc);
    }
  };
  
  function Init(docPiP) {
    listening(docPiP, '[data-onclick]', 'onclick', 'click', eventsMap.onclick);
  }
  
  return {
    Init,
  };
  
})();