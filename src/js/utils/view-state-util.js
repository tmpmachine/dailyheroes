let viewStateUtil = (function() {
    
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    GetViewGroupNode,
    Init,
    
    Set: SetState,
    Toggle,
    Add,
    Remove,
    RemoveAll,
  };
  
  let data = {
    viewStateMap: {}
  };
  
  function Toggle(viewGroupName, viewNames, el) {
    let groupEl = GetViewGroupNode(viewGroupName, el);
    let viewStates = groupEl.dataset.viewStates.split(' ');
    
    for (let viewName of viewNames) {
      if (viewStates.includes(viewName)) {
        viewStates = Array.from(new Set(viewStates));
        viewStates = filterViewStates(viewStates, viewName);
      } else {
        viewStates.push(viewName);
      }
    }
    
    SetViewState(viewGroupName, viewStates);
  }
  
  function filterViewStates(viewStates, viewName) {
    return viewStates.filter(item => item != viewName);
  }
  
  function Add(viewGroupName, viewNames, el) {
    let groupEl = GetViewGroupNode(viewGroupName, el);
    let viewStates = groupEl.dataset.viewStates.split(' ');

    for (let viewName of viewNames) {
      viewStates.push(viewName);
    }
    viewStates = Array.from(new Set(viewStates));
    
    SetViewState(viewGroupName, viewStates);
  }
  
  function Remove(viewGroupName, viewNames) {
    let groupEl = GetViewGroupNode(viewGroupName);
    let viewStates = groupEl.dataset.viewStates.split(' ');
    
    for (let viewName of viewNames) {
      viewStates = filterViewStates(viewStates, viewName);
    }
    
    SetViewState(viewGroupName, viewStates);
  }
  
  function SetState(viewGroupName, viewNames) {
    RemoveAll(viewGroupName);
    Add(viewGroupName, viewNames);
  }
  
  function RemoveAll(viewGroupName) {
    let groupEl = GetViewGroupNode(viewGroupName);
    let viewStates = groupEl.dataset.viewStates.split(' ');
    let groupStates = [];
    let group = data.viewStateMap.find(x => x.group == viewGroupName);
    if (group.states) {
      for (let state of group.states) {
        groupStates.push(state);
      }
    }
    if (group.inverseStates) {
      for (let state of group.inverseStates) {
        groupStates.push(state);
      }
    }
    
    for (let viewName of groupStates) {
      viewStates = filterViewStates(viewStates, viewName);
    }
    
    SetViewState(viewGroupName, viewStates);
  }
  
  function SetViewState(viewGroupName, viewStates) {
    let groupEl = GetViewGroupNode(viewGroupName);
    groupEl.dataset.viewStates = viewStates.join(' ').trim();
  }
  
  function GetViewGroupNode(groupName, el) {
    if (el) {
      return el;
    }
    return $(`[data-view-group~="${groupName}"][data-view-states]`);
  }
  
  function Init(viewStateMap) {
    
    data.viewStateMap = viewStateMap;
    
    for (let map of viewStateMap) {
      
      let groupName = map.group;
      if ($(`style[data-view-group-control="${groupName}"]`)) continue;
      
      let childViewEls = document.querySelectorAll(`[data-view-group="${groupName}"][data-view-states] [data-view-group="${groupName}"]`);
      
      let elContainer = document.createElement('style');
      elContainer.dataset.viewGroupControl = groupName;
      
      if (map.states && map.states.length > 0) {
        let childViewSelectors = map.states.map(state => `[data-view-group~="${groupName}"][data-view-states~="${state}"] [data-view-group="${groupName}"][data-view-name~="${state}"]`)
        elContainer.innerHTML = `${childViewSelectors.join(',')} { display: revert; }`;
      }
      
      if (map.inverseStates && map.inverseStates.length > 0) {
        let childViewSelectorsInverse = map.inverseStates.map(state => `[data-view-group~="${groupName}"][data-view-states~="${state}"] [data-view-group="${groupName}"][data-view-name-not~="${state}"]`)
        elContainer.innerHTML += `${childViewSelectorsInverse.join(',')} { display: none; }`;
      }
      
      document.body.append(elContainer);
    }
    
    
  }
  
  return SELF;
  
})();