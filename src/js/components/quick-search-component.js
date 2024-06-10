let compoQuickSearch = (function() {
  
  let SELF = {
    RefreshItems,
    SearchByTitle,
  };
  
  let data = {
    items: [],
  };
  
  function RefreshItems() {
    let lib = [];
    compoMission.GetGroups().map(x => { lib = [...lib, ...x.missionIds.map(z => compoTask.GetById(z.id))] });
    
    data.items = JSON.parse(JSON.stringify(lib));
  }
  
  function SearchByTitle(value) {
    let result = data.items.filter(x => x.title.toLowerCase().trim().includes(value.trim().toLowerCase()));
    return result;
  };
  
  return SELF;
  
})();