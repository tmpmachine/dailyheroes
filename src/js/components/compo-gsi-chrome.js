let compoGsiChrome = (function() {
  
  let SELF = {
    InitTokenClient,
    RequestToken,
    RevokeToken,
    
    InitData,
  };
  
  let data = {
    access_token: '',
  };
  
  let local = {
    tokenClient: null,
  };
  
  function InitData(_data) {
    data = clearReference(_data);
    
    // todo: move
    TaskInitCompoDrive();
  }
  
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
  
  function InitTokenClient() {
    chrome.identity.getAuthToken({ 'interactive': true }, (access_token) => onTokenResponse(access_token));
  }
  
  function onTokenResponse(access_token) {
    data.access_token = access_token;
    commit();
    
    // todo: move
    TaskInitCompoDrive();
  }
  
  // todo: move
  async function TaskInitCompoDrive() {
    await waitUntil(() => {
      return (typeof(drive) != 'undefined');
    });
    drive.SetToken(data.access_token);
    drive.readAppData();
    
    viewStateUtil.Toggle('auth', ['authorized']);
  }
  
  function waitUntil(stateCheckCallback, delay = 100) {
    return new Promise(resolve => {
        let interval = window.setInterval(() => {
        let shouldResolve = stateCheckCallback();
        if (shouldResolve) {
            window.clearInterval(interval);
            resolve();
        }
        }, delay);
    });
  }
  
  function RequestToken() {
    local.tokenClient.requestAccessToken();
  }
  
  function RevokeToken() {
    google.accounts.oauth2.revoke(data.access_token, () => { console.log('access token revoked'); });
  }
  
  function commit() {
    // appSettings.SetComponentData('compoGsi', clearReference(data));
    // appSettings.Save();
  }
  
  return SELF;
  
})();