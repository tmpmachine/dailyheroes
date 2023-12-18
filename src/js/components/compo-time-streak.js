let compoTimeStreak = (function() {
  
  'use strict';
  
  let SELF = {
    Init,
    TaskCommit,
    TaskUpdateTaskTimeStreak,
    isOnStreak,
    GetActive,
  };
  
  let data = {
    lastActiveId: null,
    totalTimeStreak: 0,
  };
  
  let local = {
    componentStorageKey: 'compoTimeStreak',
  };
  
  function Init(noReferenceData) {
    if (Object.keys(noReferenceData).length == 0) return;
    
    for (let key in noReferenceData) {
      if (typeof(data[key]) != 'undefined') {
        data[key] = noReferenceData[key];
      }
    }
  }
  
  function GetActive() {
    if (data.totalTimeStreak > 0) return clearReference(data);
    
    return null;
  }
  
  function isOnStreak() {
    return ;  
  }

  async function TaskUpdateTaskTimeStreak(distanceTime, activeTaskId) {
    if (activeTaskId === data.lastActiveId) {
      let totalTimeStreak = data.totalTimeStreak + distanceTime;
      data.totalTimeStreak = totalTimeStreak;
    } else {
      data.lastActiveId = activeTaskId;
      data.totalTimeStreak = distanceTime;
    }
  }
  
  async function TaskCommit() {
    if (window.modeChromeExtension) {
      await chrome.storage.local.set(data);
    } else {
      appSettings.SetComponentData(local.componentStorageKey, clearReference(data));
    }
  }
  
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
    
  return SELF;
  
})();