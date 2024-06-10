let uiQuickAction = (function() {
  
  'use strict';
  
  let SELF = {
    HandleClick,
  };
  
  function handleClickAction(action, data) {
    let id = pageHome.GetSelectedTaskId();
    if (!id) return;
    
    switch (action) {
      case 'edit': uiTask.EditTask(id); break;
      case 'add-sequence': ui.AddSequenceTask(id); break;
      case 'manage-sequence': ui.ToggleManageSequenceByTaskId(id); break;
      case 'rename-alias': uiTask.RenameMisisonAliasAsync(id); break;
    }
  }
  
  function HandleClick(evt) {
    let targetEl = evt.target;
    let actionEl = targetEl?.closest('[data-action]');
    let action = actionEl?.dataset.action;
    
    handleClickAction(action);
  }
  
  return SELF;
  
})();