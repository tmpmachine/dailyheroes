let compoBackup = (function() {
  
  let $ = document.querySelector.bind(document);
  
  let SELF = {
    SetBackupFolderId,
    GetBackupFolderId,
    TaskBackupAndUploadToCloud,
    TaskRestore,
  };
  
  let local = {
    backupFolderId: '',
  };
  
  
  let idGenerator = {
    prefix: '#',
    counter: -1,
    generate: function() {
      this.counter += 1;
      return `${this.prefix}${this.counter}`;
    }
  };
  
  function SetBackupFolderId(id) {
    local.backupFolderId = id;
  }
  
  async function TaskRestore() {
    $('#btn-cloud-restore').disabled = true;
    $('#txt-restore-status').textContent = 'Downloading backup file ...';
    
    try {
      
      let result = await drive.listFiles([compoBackup.GetBackupFolderId()]);
      let files = result.files;
      files.sort((a,b) => {
          return new Date(a.createdTime) > new Date(b.createdTime) ? -1 : 1;
      });
      let recentFile = files.shift();
      
      let blob = await drive.TaskDownloadFileById(recentFile.id);
      
      $('#txt-restore-status').textContent = 'Restoring data';
      
      await new Promise(resolve => {
        
        let reader = new FileReader();
        reader.onload = async function(evt) {
          app.TaskImportDataFromJSON(reader.result);
          resolve();
        };
        reader.readAsText(blob);      
            
      });
      
    } catch (e) {
      console.error(e);
      app.Log(e);
    }
    
    $('#btn-cloud-restore').disabled = false;
    $('#txt-restore-status').textContent = 'Restore complete. Reload to take effect.';
    
    
  }
  
  function GetBackupFolderId() {
    return local.backupFolderId;
  }
  
  async function TaskBackupAndUploadToCloud() {
    let blob = await app.TaskExportDataToBlob();
    if (blob === null) return;
    
    let fileData = {
      blob,
      name: 'dailyheroes-backup-' + new Date().getTime(),
      mimeType: 'application/json',
    };
    
    $('#btn-cloud-backup').disabled = true;
    $('#txt-backup-status').textContent = 'Backup in progress';
    await drive.TaskUploadFile(fileData, local.backupFolderId);
    $('#btn-cloud-backup').disabled = false;
    $('#txt-backup-status').textContent = 'Backup complete';
  }
  
  function Add(itemData = { source, incoming }) {
    let item = {
      id: idGenerator.generate(),
      source: itemData.source,
      incoming: itemData.incoming,
      accepted: {},
      isResolved: false,
    };
    data.conflicts.push(item);
    
    return item;
  }
  
  function GetAll() {
    return data.conflicts;
  }
  
  function GetById(id) {
    let item = GetAll().find(x => x.id == id);
    if (item !== undefined) return item;
    
    return null;
  }
  
  function GetAllUnresolved() {
    return GetAll().filter(x => !x.isResolved);
  }
  
  function GetAllResolved() {
    return GetAll().filter(x => x.isResolved);
  }
  
  
  function setStatusResolved(id) {
    let item = GetById(id);
    item.isResolved = true;
  }
    
  function TakeSource(id) {
    let item = GetById(id);
    item.accepted = __clearReference(item.source);
    setStatusResolved(id);
  }
  
  function TakeIncoming(id) {
    let item = GetById(id);
    item.accepted = __clearReference(item.incoming);
    setStatusResolved(id);
  }
  
  function TakeSourceManually(id, data) {
    let item = GetById(id);
    item.accepted = __clearReference(data);
    setStatusResolved(id);
  }
  
  function CreateCopyIncoming(id) {
    let item = GetById(id);
    return __clearReference(item.incoming);
  }
  
  function __clearReference(data) {
    return JSON.parse( JSON.stringify(data) );
  }
    
  function RemoveById(id) {
    let delIndex = getIndexById(id);
    if (delIndex < 0) return null;
    
    let item = GetAll().splice(delIndex, 1);
    
    return item[0];
  }
   
    
  function getIndexById(id) {
    
    return GetAll().findIndex(item => item.id == id);
  }
  
  return SELF;
  
})();