"use strict";

// Storage module - handles localStorage, preferences, and runHistory persistence

// Function to show preferences screen
function showPrefs(show) {
  const prefsScreen = document.getElementById("prefsScreen");
  prefsScreen.style.display = show?"block":"none";
}

// Function to close preferences screen
function closePrefs() {
  const prefsScreen = document.getElementById("prefsScreen");
  prefsScreen.style.display = "none";
}

// Function to toggle preference values (boolean)
function togglePref(prefName, forcevalue = null, toggleIcon = null) {

  if (forcevalue !== null) {
    preferences[prefName] = forcevalue;
  } else {
    preferences[prefName] = !preferences[prefName]; // Toggle the boolean value
  }

  if (forcevalue === null) {
    localStorage.setItem(prefName, preferences[prefName]); // Save to localStorage
    console.log("Saved "+prefName+"="+preferences[prefName]);
  }

  let td = document.getElementById("td"+prefName);
  if (td !== null) {
    td.style.backgroundColor = preferences[prefName]?statsColor:togglePrefColor;
    td.style.opacity = preferences[prefName]?"1":"0.3";
  } else if (prefName === "enableVoice") {
    setVoiceIconColor();

    if (preferences[prefName]) {
      say("Voice on");
    } else {
      say("Voice off", true);
      setTimeout(resetVoiceAPI, 5000);
    }
  } else if (prefName === "barPresetAll") {
    let td = document.getElementById("toggleBarSelect");
    console.log("setting barpref label prefname="+prefName+" value:"+preferences[prefName]+" td="+td);
    td.innerHTML = ((preferences[prefName]) ? "<i class=\"fa-solid fa-arrow-rotate-right\"></i>All" : "<i class=\"fa-solid fa-arrow-rotate-right\"></i>Fav");; // redisplay
    computePriorStreakData(); // redisplay
  }

  if (forcevalue === null)
    loadPrefs(); // keep it in sync with saved values

  if (toggleIcon) {
    const icon = document.getElementById("prefIconToggle"+prefName);
    icon.className = "fa fa-toggle-"+(preferences[prefName]?"on":"off");
  }
}

// Function to set preference values (string) and save to localStorage
function setPref(prefName, value) {
  preferences[prefName] = value;
  localStorage.setItem(prefName, value);
  console.log("setPref set "+prefName+" to '"+value+"'");
}

function setVoiceIconColor() {
  let td = document.getElementById("toggleVoiceButton");
  const color = preferences["enableVoice"] ? "green" : "red";
  td.style.color = color;
  console.log("SETVOICEICON COLOR:"+color);
}

// Function to load preferences from localStorage
function loadPrefs() {
  console.log("###Loadprefs");

  if (typeof localStorage === "undefined" || localStorage === null) {
    warning("No local storage found");
    return;
  } else {
    console.log("**Reading Prefs from localStorage");
  }
  for (const prefName in preferences) {

    if (preferences.hasOwnProperty(prefName)) {
      const value = localStorage.getItem(prefName);

      if (!isAvail(value)) {
        continue;
      }

      if (prefName === 'bpmNoteValue' || prefName.startsWith('tone') || prefName === "noteFilter" ||
          prefName.startsWith('runCancelKey')) {
        // For the menu item, directly set the value as a string
        preferences[prefName] = value;
        // Update the menu display
        const menu = document.getElementById(prefName+'Menu');
        if (menu === null) {
          warning("Could not find menu with name "+prefName+'Menu');
        } else {
          menu.value = value;
        }

      } else if (prefName === 'metroVolume' || prefName === 'speakingVolume') {

        preferences[prefName] = value;

        const mv = document.getElementById(prefName+"Menu");
        if (mv === null) {
          warning("Could not find"+prefName+" volume menu");
        } else {
          mv.value = value;
        }

        if (prefName === 'metroVolume') {
          document.getElementById("metroVolumeSlider").value = Number(value);
        }

      } else {
        // For boolean preferences, convert the stored value to a boolean
        preferences[prefName] = (value === 'true');
        // Update the toggle display
        if (prefName === "enableVoice") {
          setVoiceIconColor();
        }

        const toggle = document.getElementById(prefName + 'Toggle');
        if (toggle === null) {
          //console.log("Could not find a toggle named "+prefName+'Toggle');
        } else {
          toggle.checked = preferences[prefName];
        }
      }
    }
  }
  console.log("####Completed LoadPrefs");
}

function checkBackupStatus() {
  const expbutton = document.getElementById("exportButton");

  const lastBackup = avail(localStorage.getItem(lastBackupKey),0);
  const daysSinceBackup = Math.trunc((Date.now() - lastBackup)/(60*60*24*1000));
  let color;
  if (daysSinceBackup > 3) {
    color = "red";
  } else if (daysSinceBackup > 1) {
    color = "orange";
  } else {
    color = "green";
  }
  expbutton.innerHTML = "<i class=\"fa-solid fa-file-arrow-down\"></i>&nbsp;Imp/Exp <span style=color:"+color+";font-size:xx-small>("+daysSinceBackup+")</span>";

  if (daysSinceBackup > 3) {
    expbutton.classList.add('flash-animation');
    // we're going to voice report the lack of a backup in one minute. This allows
    // time for a user interaction to activate the voice api, and gives the user a chance
    // to notice the flashing red export button.
    setTimeout(function() {
      const lastBackup = avail(localStorage.getItem(lastBackupKey),0);
      const daysSinceBackup = Math.trunc((Date.now() - lastBackup)/(60*60*24*1000));

      if (daysSinceBackup > 14) {
        alert("CRITICAL: Last data backup was over 14 days ago, click Export to backup now.");
      } else if (daysSinceBackup > 3) {
        say("You have not backed up your history data in over 3 days. Click Export to back up your data.");
      }
    }, 12000);

  } else {
    expbutton.style.border = "solid 1px black";
    expbutton.classList.remove('flash-animation');
  }
}

function handleImportFileSelect(evt) {
    console.log('=== IMPORT PROCESS STARTED ===');
    let file = evt.target.files[0]; // FileList object

    // Only proceed if a file was selected
    if (!file) {
        console.log('No file selected, aborting import');
        return;
    }

    console.log('File selected:', file.name, 'Size:', file.size, 'bytes');
    let reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            console.log('File read complete, length:', e.target.result.length);
            try {
                const importedJSON = e.target.result;
                console.log('Calling restoreRunHistoryFromJSON...');
                restoreRunHistoryFromJSON(importedJSON);
            } catch (error) {
                console.error('Error in handleImportFileSelect:', error);
                alert('Failed to import data. Please ensure the file is a valid JSON.');
            }
        };
    })(file);

    reader.onerror = function(e) {
        console.error('FileReader error:', e);
        alert('Failed to read file.');
    };

    // Read in the file as text.
    console.log('Starting to read file...');
    reader.readAsText(file);
}

function restoreRunHistoryFromJSON(importedJSON) {
  console.log('restoreRunHistoryFromJSON called, JSON length:', importedJSON.length);
  try {
      console.log('Parsing JSON...');
      const importedData = JSON.parse(importedJSON);
      console.log('JSON parsed successfully');
      console.log('Number of keys in imported data:', Object.keys(importedData).length);
      
      // Check for .PREF.FREEPLAY
      if (importedData[".PREF.FREEPLAY"]) {
        console.log('.PREF.FREEPLAY found in import, type:', typeof importedData[".PREF.FREEPLAY"], 
                    'isArray:', Array.isArray(importedData[".PREF.FREEPLAY"]),
                    'length:', importedData[".PREF.FREEPLAY"].length);
      } else {
        console.log('.PREF.FREEPLAY NOT found in imported data');
      }
      
      // Replace the existing runHistory with importedData
      console.log('Replacing runHistory with imported data...');
      runHistory = importedData;
      console.log('runHistory replaced, new key count:', Object.keys(runHistory).length);
      
      // Save the imported data to localStorage
      console.log('Saving to localStorage...');
      saveRunHistory();
      console.log('Save complete');
      
      // Reload freePlay array from the imported data
      console.log('Reloading freePlay from imported data...');
      loadFreePlay();
      console.log('FreePlay reloaded, count:', freePlay.length);
      
      console.log('=== IMPORT SUCCESSFUL ===');
      alert('Data successfully imported!');
      console.log('Reloading page...');
      location.reload(); // Reload the page to reflect the imported data
  } catch (error) {
      console.error('Error importing data:', error);
      console.error('Error stack:', error.stack);
      alert('Failed to import data. Please ensure the JSON is valid.');
  }
}

function loadRunHistory(force=false) {

  if (!force && runHistory !== null) {
    return;
  }
  runHistory = localStorage.getItem("runHistory");

  if (runHistory === null) {
    runHistory = {};
  } else {
    runHistory = JSON.parse(runHistory);
  }

  ////////////// Edits and fixes to bug-introduced or other history errors goes here /////////////
  let needSave = false;
  for (let key in runHistory) {

    if (!runHistory.hasOwnProperty(key)) {
      continue;
    }

    if (false) {
      if (key.includes("HCf B3-5")) {
        //runHistory[newkey] = deepcopy(runHistory[key]);
        delete runHistory[key];
        console.log("######### Deleted:"+key);
        needSave = true;
        continue;
      }

      function repkey(okey, nkey) {
        const newkey = key.replace(okey, nkey);
        runHistory[nkey] = deepcopy(runHistory[okey]);
        delete runHistory[okey];
      }

      if (key.includes("Free Play:CSA-FP")) {
        const newkey = key.replace("Free Play:CSA-FP", "Free Play:CSA");
        repkey("Free Play:CSA-FP", "Free Play:CSA");
        needSave = true;
        continue;
      }

      if (key === "Free Play:UCM-misc") {
        const newkey = "Free Play:UCM";
        runHistory[newkey] = deepcopy(runHistory[key]);
        delete runHistory[key];
        needSave = true;
        continue;
      }
      if (key === "Free Play:HRS-BT") {
        const newkey = "Free Play:HRS";
        runHistory[newkey] = deepcopy(runHistory[key]);
        delete runHistory[key];
        needSave = true;
        continue;
      }
    }
  }

  if (needSave) {
    saveRunHistory();
  }

  if (!isAvail(runHistory[".PREF.FREEPLAY"])) {
    console.log("NO FREEPLAY IN RUNHISTORY, initializing empty array");
    runHistory[".PREF.FREEPLAY"] = [];
  } else if (Array.isArray(runHistory[".PREF.FREEPLAY"])) {
    console.log("FREEPLAY LOADED FROM RUNHISTORY, length="+runHistory[".PREF.FREEPLAY"].length);
  }
}

function saveRunHistory() {
  localStorage.setItem("runHistory", JSON.stringify(runHistory));
}
