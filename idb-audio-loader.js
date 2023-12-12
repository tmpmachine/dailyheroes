async function retrieveAudioFile() {
  try {
    const file = await idbKeyval.get('audioFile');
    if (file) {
      return file;
    } else {
      console.log('File Handle not found in IndexedDB.');
    }
  } catch (error) {
    console.log('Error retrieving File Handle:', error);
  }
}

(async function() {
  
  let audioFile = await retrieveAudioFile();
  if (audioFile) {
    document.querySelector('#audio').src = URL.createObjectURL(audioFile);
    document.querySelector('#audio').play();
  }
  
})();