let pageHome = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    Render,
    StopTracker,
    RefreshTrackerOverlay,
  };
  
  function Render() {
    RefreshTrackerOverlay();
  }
  
  function StopTracker() {
    compoTracker.UnsetActive();
    compoTracker.Commit();
    appSettings.Save();
    
    RefreshTrackerOverlay();
  }
  
  function RefreshTrackerOverlay() {
    let {title, totalTime} = uiTracker.GetData();
    let trackerEl = $('.tracker-overlay');
    
    trackerEl?.querySelector('[data-slot="title"]')?.replaceChildren(title);
    trackerEl?.querySelector('[data-slot="progressTimeStr"]')?.replaceChildren(totalTime);
  }
  
  return SELF;
  
})();