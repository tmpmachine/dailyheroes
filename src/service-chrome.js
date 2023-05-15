window.serviceChrome = (function() {
  
  let SELF = {
    GetData,
    SetData,
    RemoveData,
  };
  
  async function GetData(key) {
    return await chrome.storage.local.get(key);
  }  
  
  async function SetData(keyVal) {
    await chrome.storage.local.set(keyVal);
  }
  
  async function RemoveData(keyVal) {
    await chrome.storage.local.remove(keyVal);
  }
  
  return SELF;
  
})();