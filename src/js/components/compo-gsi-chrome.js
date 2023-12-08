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
    if (app.isPlatformChromeExt) {
      chrome.identity.getAuthToken({ 'interactive': true }, (access_token) => onTokenResponse(access_token));
    } else {
      local.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '254780146992-5j2ipsb9m60n1npo3v99ggb6l5017dj3.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
        callback: (tokenResponse) => onTokenResponse(tokenResponse.access_token),
      });
      RequestToken();
    }
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