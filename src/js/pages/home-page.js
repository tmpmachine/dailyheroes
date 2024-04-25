let pageHome = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    Render,
    StopTracker,
    RefreshTrackerOverlay,
    IsTaskViewMode,
    IsVisible,
  };
  
  function Render() {
    RefreshTrackerOverlay();
  }
  
  function IsVisible() {
    return viewStateUtil.HasViewState('screens', 'home');
  }
  
  function IsTaskViewMode() {
    return viewStateUtil.HasViewState('task-view-mode', 'task');
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