let helper = (function() {
  
  let SELF = {
    ParseHmsToMs,
    ParseHoursMinutesToMinutes,
  };
  
  function ParseHoursMinutesToMinutes(timeString) {
    if (!timeString) {
      return null;
    }
    
    const regex = /^(\d+h)?(\d+m)?$/;
    const match = regex.exec(timeString);
    
    let hours = 0;
    let minutes = 0;
    
    if (match[1]) {
      hours = parseInt(match[1].slice(0, -1));
    }
    
    if (match[2]) {
      minutes = parseInt(match[2].slice(0, -1));
    }
    
    return (hours * 60) + minutes;
  }
  
  function ParseHmsToMs(timeString) {
  
    if (!timeString) return 0;
  
    try {
      const regex = /^(\d+h)?(\d+m)?(\d+s)?$/;
      const match = regex.exec(timeString);
    
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
    
      if (match[1]) {
        hours = parseInt(match[1].slice(0, -1));
      }
    
      if (match[2]) {
        minutes = parseInt(match[2].slice(0, -1));
      }
    
      if (match[3]) {
        seconds = parseInt(match[3].slice(0, -1));
      }
    
      return (hours * 3600000) + (minutes * 60000) + (seconds * 1000);
      
    } catch (e) {
      console.error(e);
    }
    
    return 0;
    
  }
  
  return SELF;
  
})();