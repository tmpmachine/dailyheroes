let compoTargetTrackers = (function() {
  
  let SELF = {
    Init,
    TaskCommit,
  };
  
  let data = {
    items: [],
  };
  
  let dataModel = {
    version: 1,
    items: {
      taskId: '',
    }
  };
  
  let local = {
    componentStorageKey: 'compoTargetTrackers',
  };
  
  function AddItem(taskId) {
    data.items.push({
      taskId,
    });
  }
  
  function RemoveItemById(id) {
    let delIndex = getItemIndexById(id);
    if (delIndex < 0) return null;
    
    let item = data.items.splice(delIndex, 1);
    
    return item;
  }
  
  function getItemIndexById(id) {
    return data.items.findIndex(item => item.id == id);
  }
  
  function Init(noReferenceData) {
    if (Object.keys(noReferenceData).length == 0) return;
    
    for (let key in noReferenceData) {
      if (typeof(data[key]) != 'undefined') {
        data[key] = noReferenceData[key];
      }
    }
  }
  
  async function TaskCommit() {
    appSettings.SetComponentData(local.componentStorageKey, helper.ClearObjectReference(data));
  }
  
  return SELF;
  
})();