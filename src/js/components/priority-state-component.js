let compoPriorityState = (function() {
  
  'use strict';
  
  let SELF = {
    Init,
    Save,
    Commit,
    GetPriorityState,
  };
  
  let data = {
    items: [],
  };
  
  let local = {
    componentStorageKey: 'compoPriorityState',
  };
  
  /* model data
    {
      taskId: '',
      state: 1,
    }
  */
  
  function Init(noReferenceData) {
    if (Object.keys(noReferenceData).length == 0) return;
    
    for (let key in noReferenceData) {
      if (typeof(data[key]) != 'undefined') {
        data[key] = noReferenceData[key];
      }
    }
  }
  
  function Save() {
    let taskId = lsdb.data.activeGroupId;
    let priorityState = $('._inROPConfigState')?.value;
    let item = GetById(taskId);
    
    if (priorityState == '') {
      deleteById(taskId);
      return;
    }
    
    if (!item) {
      data.items.push({
        taskId: taskId,
        state: priorityState,
      });
    } else {
      item.state = priorityState;
    }
  }
  
  function GetPriorityState() {
    let taskId = lsdb.data.activeGroupId;
    let item = GetById(taskId);
    
    if (item) return item.state;
    
    return null;
  }
  
  function deleteById(id) {
    let delIndex = getIndexById(id);
    if (delIndex < 0) return null;
    
    let item = data.items.splice(delIndex, 1);
    return item;
  }
  
  function getIndexById(id) {
    return data.items.findIndex(item => item.taskId == id);
  }
  
  function GetById(id) {
    let item = data.items.find(x => x.taskId == id);
    if (item !== undefined) return item;
    
    return null;
  }
  
  function Commit() {
    appSettings.SetComponentData(local.componentStorageKey, helper.ClearObjectReference(data));
  }
    
  return SELF;
  
})();