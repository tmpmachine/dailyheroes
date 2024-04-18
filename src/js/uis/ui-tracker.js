let uiTracker = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    Init,
    NewItem,
    RefreshItemList,
    HandleClickListTracker,
    StopTracker,
  };
  
  let DOMActionEvents = {
    'toggle-active': (itemData) => toggleActiveById(itemData.id),
    'set': (itemData) => setActiveById(itemData.id),
    'delete': (itemData) => deleteById(itemData.id),
    'rename': (itemData) => renameById(itemData.id)
  };
  
  function StopTracker() {
    compoTracker.UnsetActive();
    compoTracker.Commit();
    appSettings.Save();
    
    updateActiveTrackerOverlay();
    RefreshItemList();
  }
  
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
    updateActiveTrackerOverlay();
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
    updateActiveTrackerOverlay();
  }
  
  function deleteById(id) {
    let isConfirm = window.confirm('Are you sure?');
    if (!isConfirm) return;
    
    compoTracker.DeleteById(id);
    compoTracker.Commit();
    appSettings.Save();
    
    RefreshItemList();
    updateActiveTrackerOverlay();
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
  
  function Init() {
    RefreshItemList();
    updateActiveTrackerOverlay();
  }
  
  function updateActiveTrackerOverlay() {
    // check active tracker
    let item = compoTracker.GetActive();
    if (!item) {
      hideTracker();
      return;
    }
    
    showTracker();
    $('.tracker-overlay').querySelector('[data-slot="title"]').textContent = item.title;
    $('.tracker-overlay').querySelector('[data-slot="progressTimeStr"]').textContent = minutesToHoursAndMinutes(msToMinutes(item.progressTime));
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