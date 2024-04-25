let compoSelection = (function() {
  
  'use strict';
  
  let SELF = {
    AddItem,
    ClearItems,
    ReplaceItem,
    GetAllItems,
  };
  
  let local = {
    items: [],
  };
  
  function ReplaceItem(id) {
    ClearItems();
    AddItem(id);
  }
  
  function AddItem(id) {
    let index = GetItemIndexById(id);
    if (index >= 0) return;
    
    local.items.push(id);
  }
  
  function GetItemIndexById(id) {
    let items = GetAllItems();
    return items.findIndex(item => item.id == id);
  }
  
  function GetAllItems() {
    return local.items;
  }
  
  function ClearItems() {
    local.items.length = 0;
  }
  
  return SELF;
  
})();