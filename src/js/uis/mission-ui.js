let uiMission = (function() {
  
  let SELF = {
    OnChangeGroup,
    ExpandToolbar,
  };
  
  function ExpandToolbar(id) {
    viewStateUtil.Toggle('task', ['toolbarExpanded'], $(`._wgTaskList [data-id="${id}"]`));
  }
  
  function __saveAppData() {
    lsdb.save();
  }
  
  function OnChangeGroup(inputSelectEvt) {
    
    let evt = inputSelectEvt;
    let id = evt.target.value;
    
    let success = compoMission.SetActiveGroupById(id);
    if (success) {
      __saveAppData();
      __refreshMissionList();
    } else {
      console.log('failed to change group');
    }
  }

  function __refreshMissionList() {
    app.TaskListTask();
  }
  
  return SELF;
  
})();