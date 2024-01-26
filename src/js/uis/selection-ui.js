let uiSelection = (function() {
  
  let $$ = document.querySelectorAll.bind(document);
  
  let SELF = {
    ReloadSelection,
  };
  
  function ReloadSelection() {
    let ids = compoSelection.GetAllItems();
    // console.log(ids)
    
    clearSelection();
    
    for (let id of ids) {
      ui.FocusTaskElById(id);
    }
    
  }
  
  function clearSelection() {
    for (let el of $$('[data-obj="task"].focused')) {
      el.classList.remove('focused');
    }
  }
  
  return SELF;
  
})();