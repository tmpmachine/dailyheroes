let pageHome = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    Render,
    StopTracker,
    RefreshTrackerOverlay,
    IsTaskViewMode,
    IsMissionViewMode,
    IsVisible,
    ChangeViewMode,
  };
  
  function ChangeViewMode(evt) {
    let targetEl = evt.target;
    let type = targetEl?.closest('[data-kind="control"]')?.dataset.type;
    
    if (type == 'task') {
      viewStateUtil.Remove('active-task-info', ['has-ETA']);
      ChangeViewModeConfig('tasks');
    } else if (type == 'mission') {
      ChangeViewModeConfig('mission');
      app.TaskRefreshMissionTargetETA();
    }
    
    compoSelection.ClearItems();
    uiSelection.RefreshSelection();
    
    lsdb.save();
    ui.BuildBreadcrumbs();
    app.TaskListTask();
  }
  
  function RefreshCollections() {
    let groups = compoMission.GetGroups();
    let activeGroupId = compoMission.GetActiveGroupId();
    
    $('._collectionOpts')?.replaceChildren();
    let docFrag = document.createDocumentFragment();
    
    for (let item of groups) {
      let el = document.createElement('option');
      el.textContent = item.title;
      el.value = item.id;
      docFrag.append(el);
      
      if (item.id == activeGroupId) {
        el.selected = true;
      }
    }
    
    $('._collectionOpts')?.append(docFrag);
  }
  
  function ChangeViewModeConfig(mode) {
    lsdb.data.topMostMissionPath = '';
    lsdb.data.viewMode = mode;
    ui.UpdateViewModeState();
  }
  
  function Render() {
    RefreshTrackerOverlay();
    RefreshCollections();
  }
  
  function IsVisible() {
    return viewStateUtil.HasViewState('screens', 'home');
  }
  
  function IsTaskViewMode() {
    return viewStateUtil.HasViewState('task-view-mode', 'task');
  }
  
  function IsMissionViewMode() {
    return viewStateUtil.HasViewState('task-view-mode', 'mission');
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