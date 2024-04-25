let uiQuickAction = (function() {
  
  'use strict';
  
  let SELF = {
    HandleClick,
  };
  
  function handleClickAction(action, data) {
    let id = getTaskSelectionId();
    if (!id) return;
    
    switch (action) {
      case 'edit': app.EditTask(id); break;
      case 'add-sequence': ui.AddSequenceTask(id); break;
      case 'manage-sequence': ui.ToggleManageSequenceByTaskId(id); break;
    }
  }
  
  function getTaskSelectionId() {
    let selections = compoSelection.GetAllItems();
    if (selections.length != 1) return null;
    
    let taskId = selections[0];
    return taskId;
  }
  
  function HandleClick(evt) {
    let targetEl = evt.target;
    let actionEl = targetEl?.closest('[data-action]');
    let action = actionEl?.dataset.action;
    
    handleClickAction(action);
  }
  
  return SELF;
  
})();