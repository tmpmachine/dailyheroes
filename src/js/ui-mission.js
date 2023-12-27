let uiMission = (function() {
  
  let SELF = {
    ListGroup,
    OnChangeGroup,
  };
  
  function ListGroup() {
    __refreshGroupList();
  }
  
  function __refreshGroupList() {
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
  
  function __saveAppData() {
    lsdb.save();
  }
  
  function __promptUser(defaultValue = '') {
    return window.prompt('Enter collection name to delete (only inactive collection can be deleted)', defaultValue);
  }
  
  function __confirmUser(groupName) {
    return window.confirm(`Are you sure to delete this collection : ${groupName}?`);
  }
    
  function OnChangeGroup(inputSelectEvt) {
    
    let evt = inputSelectEvt;
    let id = evt.target.value;
    
    let success = compoMission.SetActiveGroupById(id);
    if (success) {
      __resetMissionView();
      __saveAppData();
      __refreshMissionList();
    } else {
      console.log('failed to change group');
    }
  }
  
  function __resetMissionView() {
    resetActiveGroupId();
    ui.BuildBreadcrumbs();
  }
  
  function __refreshMissionList() {
    app.TaskListTask();
  }
    
  function RemoveGroup(group) {
    let isConfirm = __confirmUser(group.title);
    if (!isConfirm) return;
    
    let deletedGroup = compoMission.DeleteGroupById(group.id);
    
    if (deletedGroup != null) {
      __saveAppData();
    } else {
      console.log('failed to delete group');
    }
      
    __refreshGroupList();
  }
      
  
  return SELF;
  
})();