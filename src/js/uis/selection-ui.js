let uiSelection = (function() {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    ReloadSelection,
  };
  
  function ReloadSelection() {
    let ids = compoSelection.GetAllItems();
    let isScrollToView = false;
    
    clearSelection();
    
    for (let id of ids) {
      ui.FocusTaskElById(id, isScrollToView);
    }
    
  }
  
  function clearSelection() {
    for (let el of $$('[data-obj="task"].focused')) {
      el.classList.remove('focused');
    }
  }
  
  return SELF;
  
})();