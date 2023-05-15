window.service = (function() {
  
  let SELF = {
    GetData,
    SetData,
    RemoveData,
  };
  
  function GetData(keyVal) {
    return new Promise(resolve => {
      let data = {};
      if (typeof(keyVal) == 'string') {
        data[keyVal] = window.lsdb.data[keyVal];
      } else {
        for (let key of keyVal) {
          data[key] = window.lsdb.data[key];
        }
      }
      resolve(data);
    });
  }  
  
  async function SetData(keyVal) {
    for (let key in keyVal) {
      window.lsdb.data[key] = keyVal[key];
    }
    window.lsdb.save();
  }
  
  async function RemoveData(keyVal) {
    for (let key of keyVal) {
      delete window.lsdb.data[key];
    }
    window.lsdb.save();
  }
  
  return SELF;
  
})();