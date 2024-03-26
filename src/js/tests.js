let tests = (function() {
  
  let SELF = {
    Run,
  };
  
  function Run() {
    // todo()
    TaskOpenDetail();
    
  }
  
  function TaskWaitUntil(stateCheckCallback, delay = 100) {
    return new Promise(resolve => {
        let interval = window.setInterval(() => {
        let shouldResolve = stateCheckCallback();
        if (shouldResolve) {
            window.clearInterval(interval);
            resolve();
        }
        }, delay);
    });
  }
  
  async function TaskOpenDetail() {
    
    await TaskWaitUntil(() => typeof(pageDetail) != 'undefined');
    
    pageDetail.OpenByTaskId('lbgo8x8l1709950371519')
  }
  
  
  return SELF;
  
})();