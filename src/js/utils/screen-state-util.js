let screenStateUtil = (function() {
    
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    NavigateTo,
    SaveState,
    TaskRestoreStates,
    GetActiveScreenEl,
  };
  
  let data = {
    items: []
  };

  function GetActiveScreenEl() {
    let states = viewStateUtil.GetViewStates('screens');
    let containerEl = viewStateUtil.GetViewGroupNode('screens');
    return containerEl.querySelector(`[data-view-name="${states[0]}"]`);
  }
  
  function TaskWaitUntil(stateCheckCallback, delay = 100) {
    return new Promise(resolve => {
        let interval = window.setInterval(() => {
        let shouldResolve = stateCheckCallback();
        if (shouldResolve) {
            window.clearInterval(interval);
            resolve();
        }
        }, delay);
    });
  }
  
  async function TaskRestoreStates() {
    if (lsdb.data.viewStates?.name !== '') {
      
      try {
        
        switch (lsdb.data.viewStates.name) {
          case 'task-detail':
            {
              await TaskWaitUntil(() => typeof(pageDetail) != 'undefined');
              
              pageDetail.OpenByTaskId(lsdb.data.viewStates.data.taskId);
            }
            break;
        }
        
      } catch (e) {
        console.error(e);
      }
      
    }
  }
  
  function NavigateTo(screenName) {
    
    let currentState = viewStateUtil.GetViewStates('screens');
    let currentScreenViewName = currentState[0];
    let id = currentScreenViewName;
    let node = viewStateUtil.GetViewGroupNode('screens');

    // push current screen to docfrag
    let docFrag = document.createDocumentFragment();
    let screenEl = node.querySelector(`[data-view-group="screens"][data-view-name="${currentScreenViewName}"]`);
    
    docFrag.append(screenEl);
    
    AddItem(id, {
      id,
      docFrag,
    });
    
    
    let item = GetItemById(screenName);
    
    // if exists, bring back from docFrag
    if (item) {
      let itemIndex = GetItemIndexById(screenName);
      let screenItem = data.items.splice(itemIndex, 1).pop();
      node.append(screenItem.docFrag);
    }
    
    
    viewStateUtil.Set('screens', [screenName]);
    
    if (screenName == 'home') {
      SaveState();
      pageHome.Render();
    } else if (screenName == 'trackers') {
      uiTracker.RefreshItemList();
    }
    
  }
    
  function SaveState(stateData) {
    
    let currentState = viewStateUtil.GetViewStates('screens');
    let currentScreenViewName = currentState[0];
    
    switch (currentScreenViewName) {
      case 'task-detail':
        lsdb.data.viewStates = {
          name: currentScreenViewName,
          data: stateData,
        };
        break;
      default:
        lsdb.data.viewStates = {};
    }
    appData.Save();
    
  }
    
  function GetItemIndexById(id) {
    let items = GetAllItems();
    return items.findIndex(item => item.id == id);
  }
  
  function GetAllItems() {
    return data.items;
  }
  
  function AddItem(id, itemData) {
    let index = GetItemIndexById(id);
    if (index >= 0) return;
    
    data.items.push(itemData);
  }
  
  function GetItemById(id) {
    let item = data.items.find(x => x.id == id);
    if (item !== undefined) return item;
    
    return null;
  }
  
  return SELF;
  
})();