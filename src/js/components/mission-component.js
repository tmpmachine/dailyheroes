let compoMission = (function() {
  
  'use strict';
  
  let SELF = {
    Init,
    GetMissionByTaskId,
    GetActiveGroup,
    GetActiveGroupId,
    GetGroups,
    GetGroupById,
    GetGroupByName,
    IsExistsMissionId,
    GetMissions,
    GetMissionById,
    SetActiveGroupById,
    Commit,
    MoveToArchive,
    MoveToActive,
    AddGroup,
    DeleteGroupById,
    UpdateGroupTitle,
    AddMission,
    CreateItemMission,
    RemoveMissionById,
    GetMissionsAllGroup,
    IsArchived,
    AddActiveMission,
  };
  
  const defaultGroupId = '#0';
  let data = {
    missionGroup: [{
      id: '#0',
      title: 'Active',
      missionIds: [],
    }, {
      id: '#1',
      title: 'Archive',
      missionIds: [],
    }],
    activeGroupId: defaultGroupId,
  };
  
  
  function IsArchived(id) {
    let item = GetMissionById(id, '#1');
    return item ? true : false;
  }
  
  function MoveToArchive(id) {
    let item = GetMissionById(id, '#0');
    let targetGroup = GetGroupById('#1'); // archive group
    if (!item || !targetGroup) return;
    
    delete item.lastStarredDate;
    let delItem = RemoveMissionById(id, '#0');
    targetGroup.missionIds.push(item);
  }
  
  function MoveToActive(id) {
    let item = GetMissionById(id, '#1');
    let targetGroup = GetGroupById('#0'); // archive group
    if (!item || !targetGroup) return;
    
    let delItem = RemoveMissionById(id, '#1');
    targetGroup.missionIds.push(item);
  }
  
  function AddGroup(title) {
    let id = generateId();
    let group = {
      id,
      title,
      missionIds: [],
    };
    data.missionGroup.push(group);
    commitData();
    
    return group;
  }
  
  function SetActiveGroupById(id) {
    let group = GetGroupById(id);
    if (group == null) return false;
  
    data.activeGroupId = id;
    commitData();
    
    return true;
  }
  
  function GetGroupByName(name) {
    let group = data.missionGroup.find(item => item.title == name);
    if (group !== undefined) return group;
    
    return null;
  }
  
  
  function DeleteGroupById(id) {
    let activeGroupId = GetActiveGroupId();
    if (id == activeGroupId) {
      console.log('Cannot remove active group');
      return null;
    }
  
    let delIndex = getGroupIndexById(id);
    if (delIndex < 0) return null;
    
    let group = data.missionGroup.splice(delIndex, 1);
    commitData();
    
    return group;
  }
  
  function getGroupIndexById(id) {
    return data.missionGroup.findIndex(item => item.id == id);
  }
  
  function generateId() {
    return (new Date()).getTime().toString();
  }
    
  function UpdateGroupTitle(id, title) {
    
    let group = GetGroupById(id);
    if (group == null) return false;
    
    group.title = title;
    commitData();
    
    return true;
  }
  
  function CreateItemMission(taskId) {
    return {
      id: taskId,
      lastStarredDate: null,
      lastUpdatedDate: new Date().getTime(),
      createdDate: new Date().getTime(),
    };
  }
  
  function AddMission(item) {
    let group = GetActiveGroup();
    if (group == null) return false;
    group.missionIds.push(item);
  }
  
  function AddActiveMission(item) {
    let group = GetGroupById('#0');
    if (group == null) return false;
    group.missionIds.push(item);
  }
  
  function GetMissions() {
    let group = GetActiveGroup();
    return group.missionIds;
  }
  
  function GetMissionsAllGroup() {
    let groups = GetGroups();
  }
  
  function Init() {
    checkDataIntegrity();
    initData();
  }
    
  function checkDataIntegrity() {
    runDataMigration9Nov23();
  }
  
  function initData() {
    let appDataManager = app.GetDataManager();
    data = clearReference(appDataManager.data.compoMission);
  }
  
  function runDataMigration9Nov23() {
    let appDataManager = app.GetDataManager();
    if (Object.keys(appDataManager.data.compoMission).length > 0) return;
    
    let group = GetGroupById(defaultGroupId);
    group.missionIds = clearReference(appDataManager.data.missionIds);
    commitData();
  }
  
  function getAppData() {
    return lsdb.data.compoMission;
  }
  
  function clearReference(data) {
    return JSON.parse(JSON.stringify(data));
  }
  
  function GetGroupById(id) {
    let group = data.missionGroup.find(x => x.id == id);
    if (group !== undefined) return group;
    
    return null;
  }
  
  function commitData() {
    let appDataManager = app.GetDataManager();
    appDataManager.data.compoMission = clearReference(data);
  }
  
  function Commit() {
    commitData();
  }
    
  function RemoveMissionById(id, groupId) {
    let delItem = removeMissionByIdFromGroup(id, groupId ?? GetActiveGroupId());
    return delItem;
  }
  
  function GetGroups() {
    return data.missionGroup;
  }
  
  function IsExistsMissionId(missionId) {
    let groupId = GetActiveGroupId();
    return IsExistsMissionInGroup(missionId, groupId);
  }
  
  function IsExistsMissionInGroup(missionId, groupId) {
    
    let group = GetGroupById(groupId);
    if (group == null) {
      console.log('group not found');
      return false;
    }
    
    let findIndex = group.missionIds.findIndex(item => item.id == missionId);
    let isExists = (findIndex >= 0);
    return isExists;
  }
  
  function GetMissionById(id, groupId = null) {
    let group = groupId ? GetGroupById(groupId) : GetActiveGroup();
    let mission = group?.missionIds.find(item => item.id == id);
    return mission;
  }
  
  function GetMissionByTaskId(id) {
    let group = GetActiveGroup();
    let mission = group.missionIds.find(item => item.taskId == id);
    return mission;
  }
  
  function GetActiveGroup() {
    return GetGroupById(GetActiveGroupId());
  }
  
  function GetActiveGroupId() {
    return data.activeGroupId;
  }
    
  function removeMissionByIdFromGroup(missionId, groupId) {
    let group = GetGroupById(groupId);
    if (group == null) {
      console.log('group not found');
      return null;
    }
    
    let delIndex = group.missionIds.findIndex(x => x.id == missionId);
    if (delIndex < 0) return null;
    
    let delItems = group.missionIds.splice(delIndex, 1);

    return delItems.length > 0 ? delItems.pop() : null;
  }

    
  return SELF;
  
})();