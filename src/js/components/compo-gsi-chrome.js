let compoGsiChrome = (function() {
  
  let SELF = {
    InitTokenClient,
    RequestToken,
    RevokeToken,
    
    InitData,
  };
  
  let data = {
    userEmail: null,
  };
  
  let local = {
    access_token: '',
    tokenClient: null,
  };
  
  function InitData(_data) {
    data = clearReference(_data);
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
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email',
        callback: (tokenResponse) => onTokenResponse(tokenResponse.access_token),
      });
      RequestToken();
    }
  }
  
  function onTokenResponse(access_token) {
    local.access_token = access_token;
    commit();
    
    getTokenUserInfo(local.access_token);
    
    // todo: move
    TaskInitCompoDrive();
  }
  
  function getTokenUserInfo(access_token) {
    fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
      headers: {
        authorization: `Bearer ${access_token}`
      }
    })
    .then(r => r.json())
    .then(json => {
      data.userEmail = json.email;
      commit();
    });
  }
  
  // todo: move
  async function TaskInitCompoDrive() {
    await waitUntil(() => {
      return (typeof(drive) != 'undefined');
    });
    drive.SetToken(local.access_token);
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
    let opt = {};
    
    if (data.userEmail) {
      opt.hint = data.userEmail;
      opt.prompt = '';
    }
    
    local.tokenClient.requestAccessToken(opt);
  }
  
  function RevokeToken() {
    google.accounts.oauth2.revoke(local.access_token, () => { console.log('access token revoked'); });
  }
  
  function commit() {
    appSettings.SetComponentData('compoGsiChrome', clearReference(data));
    appSettings.Save();
  }
  
  return SELF;
  
})();