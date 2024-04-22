let uiTracker = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    NewItem,
    RefreshItemList,
    HandleClickListTracker,
    GetData,
  };
  
  let local = {
    title: null,
    totalTime: null,
  };
  
  let DOMActionEvents = {
    'toggle-active': (itemData) => toggleActiveById(itemData.id),
    'set': (itemData) => setActiveById(itemData.id),
    'delete': (itemData) => deleteById(itemData.id),
    'rename': (itemData) => renameById(itemData.id)
  };
  
  function renameById(id) {
    
    let item = compoTracker.GetById(id);
    
    let userVal = window.prompt('Value', item.title);
    if (!userVal) return;
    
    let updatedItem = compoTracker.UpdateById(id, {
      title: userVal,
    });
    
    if (!updatedItem) return;
    
    compoTracker.Commit();
    appSettings.Save();
    
    RefreshItemList();
  }
  
  function showTracker() {
    viewStateUtil.Add('features', ['tracker-overlay']);
  }
  
  function hideTracker() {
    viewStateUtil.Remove('features', ['tracker-overlay']);
  }
  
  function toggleActiveById(id) {
    let item = compoTracker.GetById(id);
    if (!item) return;
    
    let modelCheck = false;
    compoTracker.UpdateById(id, {
      isActive: !item.isActive,
    }, modelCheck);
    
    compoTracker.Commit();
    saveAppData();
    
    RefreshItemList();
  }
  
  function setActiveById(id) {
    let isSuccess = compoTracker.ToggleActiveById(id);
    if (!isSuccess) return;
    
    compoTracker.Commit();
    saveAppData();
    
    RefreshItemList();
  }
  
  function deleteById(id) {
    let isConfirm = window.confirm('Are you sure?');
    if (!isConfirm) return;
    
    compoTracker.DeleteById(id);
    compoTracker.Commit();
    appSettings.Save();
    
    RefreshItemList();
  }
  
  function getItemDataByEvent(evt) {
    let itemEl = evt.target.closest('[data-kind="item"]');
    if (!itemEl) return null;
    
    return {
      id: itemEl.dataset.id,
    };
  }
  
  function HandleClickListTracker(evt) {
    let actionEl = evt.target.closest('[data-action]');
    if (!actionEl) return;
    
    let action = actionEl.dataset.action;
    let callbackFunc = DOMActionEvents[action];
    if (!callbackFunc) return;
    
    let itemData = getItemDataByEvent(evt);
    if (!itemData) return;
    
    callbackFunc(itemData, evt);
  }
  
  function GetData() {
    let item = compoTracker.GetActive();
    
    if (item) {
      local.title = item.title;
      local.totalTime = minutesToHoursAndMinutes(msToMinutes(item.progressTime));
      
      showTracker();
    } else {
      hideTracker();
    }
    
    return {
      title: local.title,
      totalTime: local.totalTime,
    };
  }
  
  function updateActiveTrackerOverlay() {
    let item = compoTracker.GetActive();
    
    if (item) {
      local.title = item.title;
      local.totalTime = minutesToHoursAndMinutes(msToMinutes(item.progressTime));
      
      showTracker();
    } else {
      hideTracker();
    }
  }
  
  function RefreshItemList() {

    let items = compoTracker.List();
    let activeItemId = compoTracker.GetActiveId();
    
    $('#container-list-tracker')?.replaceChildren();
    let docFrag = document.createDocumentFragment();
    
    for (let item of items) {
      let el = window.templateSlot.fill({
        data: {
          title: item.title,
          progressTimeStr: minutesToHoursAndMinutes(msToMinutes(item.progressTime)),
        }, 
        template: document.querySelector('#tmp-list-tracker').content.cloneNode(true), 
      });
      
      el.querySelector('[data-kind="item"]').dataset.id = item.id;
      
      // set active
      if (activeItemId == item.id) {
        el.querySelector('[data-kind="item"]').classList.add('is-active');
      }
      if (item.isActive) {
        el.querySelector('[data-kind="item"]').classList.add('is-tracked');
      }
      
      docFrag.append(el);
    }
    
    $('#container-list-tracker')?.append(docFrag);
    
  }
  
  function NewItem() {
    
    let title = promptUser();
    if (!title) return;
    
    compoTracker.Add(title);
    compoTracker.Commit();
    
    saveAppData();
    RefreshItemList();
  }
  
  function saveAppData() {
    lsdb.save();
  }
  
  function promptUser(defaultValue = '') {
    return window.prompt('Tracker title', defaultValue);
  }
  
  return SELF;
  
})();