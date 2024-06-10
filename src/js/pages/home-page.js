let pageHome = (function() {
  
  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    Render,
    StopTracker,
    RefreshTrackerOverlay,
    IsTaskViewMode,
    IsMissionViewMode,
    IsVisible,
    ChangeQuestView,
    ChangeViewMode,
    EditTargetThreshold,
    EditSelectedTask,
    GetSelectedTaskId,
    RefreshPriorityStateBadgeAsync,
  };
  
  function EditSelectedTask() {
    let id = GetSelectedTaskId();
    if (!id) return;
    
    uiTask.EditTask(id);
  }
  
  function GetSelectedTaskId() {
    let selections = compoSelection.GetAllItems();
    if (selections.length != 1) return null;
    
    let taskId = selections[0];
    return taskId;
  }
  
  async function EditTargetThreshold() {
    let targetVal = lsdb.data.targetThreshold ? helper.ToTimeString(lsdb.data.targetThreshold, 'hms') : '';
    let userVal = await windog.prompt('Target threshold (hours minutes), example : 1h30m or 30m', targetVal);
    if (!userVal) return;
    
    try {
      let val = helper.ParseHmsToMs(userVal, {
        defaultUnit: 'm',
      });
      if (typeof(val) != 'number') return;
      
      lsdb.data.targetThreshold = val;
      appData.Save();
      
      app.TaskListTask();
      refreshTargetThresholdBadge();
    } catch (err) {
      console.error(err);
    }
  }
  
  async function RefreshPriorityStateBadgeAsync() {
    await onComponentReady(() => compoPriorityState);
    
    $('label._priorityState')?.classList.remove('.D', '.F');
    
    let priorityState = compoPriorityState.GetPriorityState();
    if (!priorityState) return;
    
    $('label._priorityState')?.classList.add(priorityState);
  }
  
  function onComponentReady(objCheckCallback) {
    return new Promise(async resolve => {
      await wait.Until(() => {
        return (typeof(objCheckCallback()) != 'undefined');
      }, 100);
      resolve();
    });
  }
  
  function refreshTargetThresholdBadge() {
    let val = lsdb.data.targetThreshold ? helper.ToTimeString(lsdb.data.targetThreshold, 'hms') : '';
    $('._targetThresholdStr')?.replaceChildren(val);
  }
  
  function ChangeQuestView(evt) {
    let targetEl = evt.target;
    let target = targetEl?.closest('[data-target]')?.dataset.target;
    
    if (['active', 'available', 'archive'].includes(target)) {
      changeQuestViewConfig(target);
      
      if (target == 'active') {
        compoMission.SetActiveGroupById('#0');
      } else if (target == 'archive') {
        compoMission.SetActiveGroupById('#1');
      }
    }
    
    // clear selections
    compoSelection.ClearItems();
    uiSelection.RefreshSelection();
    
    lsdb.save();
    // ui.BuildBreadcrumbs();
    app.TaskListTask();
  }
  
  function ChangeViewMode(evt) {
    let targetEl = evt.target;
    let type = targetEl?.closest('[data-kind="control"]')?.dataset.type;
    
    if (type == 'task') {
      ChangeViewModeConfig('tasks');
    } else if (type == 'mission') {
      ChangeViewModeConfig('mission');
    }
    
    app.TaskRefreshMissionTargetETA();
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
  
  function changeQuestViewConfig(mode) {
    lsdb.data.questView = mode;
    RefreshQuestViewTab();
  }
  
  function RefreshQuestViewTab() {
    let tabId = lsdb.data.questView ?? 'active';
    let activeClass = 'is-active';
    $$(`._questViewTab [data-target]`).forEach(el => el.classList.remove(activeClass));
    $(`._questViewTab [data-target="${tabId}"]`)?.classList.add(activeClass);
  }
  
  function Render() {
    RefreshTrackerOverlay();
    RefreshCollections();
    RefreshQuestViewTab();
    refreshTargetThresholdBadge();
    RefreshPriorityStateBadgeAsync();
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
  
  // # overlay, # tracker
  function RefreshTrackerOverlay() {
    let {title, progressTimeStr, progressTime, targetTime} = uiTracker.GetData();
    let trackerEl = $('.tracker-overlay');
    let blockCount = 10;
    let blockDuration = targetTime / blockCount;
    let blockProgressCount = Math.floor(progressTime / blockDuration);
    let newBlockProgress = progressTime % blockDuration;

    $('._feverBar')?.replaceChildren();
    let docFrag = document.createDocumentFragment();
    for (let i=0; i<blockCount; i++) {
      let feverBlockEl = $('#tmp-fever-bock')?.content.cloneNode(true);
      docFrag.append(feverBlockEl);
    }
    if (blockDuration > 0) {
      for (let i=0; i<blockProgressCount; i++) {
        let fillClass = i < 4 ? '__filled1' : i < 7 ? '__filled2' : '__filled3';
        docFrag.querySelectorAll('._block')[i].classList.add(fillClass);
      }
      if (newBlockProgress > 0) {
        docFrag.querySelectorAll('._block')[blockProgressCount].classList.add('__filled4');
      }
      
      // fever meter
      $('._feverMeter').style.width = Math.min(100, newBlockProgress / blockDuration * 100) + '%';
    }
    $('._feverBar')?.append(docFrag);
    
    trackerEl?.querySelector('[data-slot="title"]')?.replaceChildren(title);
    trackerEl?.querySelector('[data-slot="progressTimeStr"]')?.replaceChildren(progressTimeStr);
  }
  
  return SELF;
  
})();