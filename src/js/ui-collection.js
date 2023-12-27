let uiCollection = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    Init,
    NewItem,
    ReloadList,
    HandleClickListContainer,
  };
  
  let DOMActionEvents = {
    // 'set': (itemData) => setActiveById(itemData.id),
    'delete': (itemData) => deleteById(itemData.id),
    'rename': (itemData) => renameById(itemData.id)
  };
  
  function renameById(id) {
    
    let item = compoMission.GetGroupById(id);
    
    let userVal = window.prompt('Collection title', item.title);
    if (!userVal) return;
    
    let updatedItem = compoMission.UpdateGroupTitle(id, userVal);
    
    if (!updatedItem) return;
    
    compoMission.Commit();
    appSettings.Save();
    
    ReloadList();
  }
  
  function setActiveById(id) {
    let isSuccess = compoTracker.ToggleActiveById(id);
    if (!isSuccess) return;
    
    compoTracker.Commit();
    __saveAppData();
    
    ReloadList();
  }
  
  function deleteById(id) {

    if (id == compoMission.GetActiveGroupId()) {
      alert('Cannot delete active collection. Change active collection then try again.');
      return;
    }

    let isConfirm = window.confirm('Are you sure?');
    if (!isConfirm) return;
    
    compoMission.DeleteGroupById(id);
    compoTracker.Commit();
    appSettings.Save();
    
    ReloadList();
  }
  
  function getItemDataByEvent(evt) {
    let itemEl = evt.target.closest('[data-kind="item"]');
    if (!itemEl) return null;
    
    return {
      id: itemEl.dataset.id,
    };
  }
  
  function HandleClickListContainer(evt) {
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
    ReloadList();
  }
  
  function ReloadList() {

    let items = compoMission.GetGroups();
    let activeItemId = compoMission.GetActiveGroupId();
    
    let container = $('[data-container="list-collection"]');
    container.innerHTML = '';
    let docFrag = document.createDocumentFragment();
    
    for (let item of items) {
      let el = window.templateSlot.fill({
        data: {
          title: item.title,
        }, 
        template: document.querySelector('#tmp-list-collection').content.cloneNode(true), 
      });
      
      el.querySelector('[data-kind="item"]').dataset.id = item.id;
      
      // set active
      if (activeItemId == item.id) {
        el.querySelector('[data-kind="item"]').classList.add('is-active');
      }
      
      docFrag.append(el);
    }
    
    container.append(docFrag);
    
    reloadSelectOptions();
  }
  
  function reloadSelectOptions() {
    let groups = compoMission.GetGroups();
    let activeGroupId = compoMission.GetActiveGroupId();
    
    $('#in-sel-mission-group').innerHTML = '';
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
    
    $('#in-sel-mission-group').append(docFrag);
  }
  
  function NewItem() {
    
    let title = promptUser();
    if (!title) return;
    
    compoMission.AddGroup(title);
    compoMission.Commit();
    
    __saveAppData();
    ReloadList();
  }
  
  function __saveAppData() {
    lsdb.save();
  }
  
  function promptUser(defaultValue = '') {
    return window.prompt('Collection title', defaultValue);
  }
  
  return SELF;
  
})();