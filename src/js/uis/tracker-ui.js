let uiTracker = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    NewItem: Create,
    RefreshItemList,
    HandleClickListTracker,
    GetData,
  };
  
  let local = {
    title: null,
    totalTime: null,
    targetTime: 0,
  };
  
  let DOMActionEvents = {
    'toggle-active': (itemData) => toggleActiveById(itemData.id),
    'set': (itemData) => setActiveById(itemData.id),
    'delete': (itemData) => deleteById(itemData.id),
    'rename': (itemData) => renameById(itemData.id),
    'set-target': (itemData) => setTarget(itemData.id),
  };
  
  async function renameById(id) {
    
    let item = compoTracker.GetById(id);
    
    let userVal = await windog.prompt('Rename', item.title);
    if (!userVal) return;
    
    let updatedItem = compoTracker.UpdateById(id, {
      title: userVal,
    });
    
    if (!updatedItem) return;
    
    compoTracker.Commit();
    appSettings.Save();
    
    RefreshItemList();
  }
  
  async function setTarget(id) {
    
    let item = compoTracker.GetById(id);
    let defaultVal = helper.ToTimeString(item.targetTime, 'hms');
    
    let userVal = await windog.prompt('Target (in HMS format)', defaultVal);
    if (!userVal) return;
    
    let parsedVal = helper.ParseHmsToMs(userVal, {
      defaultUnit: 'm',
    });
    
    let updatedItem = compoTracker.UpdateById(id, {
      targetTime: parsedVal,
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
  
  async function deleteById(id) {
    let isConfirm = await windog.confirm('Are you sure?');
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
      local.targetTime = item.targetTime;
      
      showTracker();
    } else {
      hideTracker();
    }
    
    return {
      title: local.title,
      progressTimeStr: local.totalTime,
      progressTime: item?.progressTime,
      targetTime: local.targetTime,
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
  
  // # list
  function RefreshItemList() {

    let items = compoTracker.ListRO();
    let activeItemId = compoTracker.GetActiveId();
    
    helper.SortDesceding(items, 'createdDate');
    
    $('#container-list-tracker')?.replaceChildren();
    let docFrag = document.createDocumentFragment();
    
    items.sort()
    
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
  
  async function Create() {
    
    let title = await windog.prompt('Tracker title');
    if (!title) return;
    
    compoTracker.Add(title);
    compoTracker.Commit();
    
    saveAppData();
    RefreshItemList();
  }
  
  function saveAppData() {
    lsdb.save();
  }
  
  return SELF;
  
})();