"use strict";

// Free Play module - manages free play items (practice outside of structured presets)

function freePlayDescription(name) {
  const fp = freePlay.find(p => p.name === name);

  return fp?fp.description:'';
}

function deepcopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function saveFreePlay() {
  console.log("SAVING FREEPLAY IN HISTORY, records:"+freePlay.length);
  runHistory[".PREF.FREEPLAY"] = deepcopy(freePlay); // deep copy
  for (let i = 0; i < runHistory[".PREF.FREEPLAY"].length; i++) {
    console.log(runHistory[".PREF.FREEPLAY"][i].name);
  }
  await saveRunHistory();
  console.log("saveFreePlay completed");
}

function loadFreePlay() {
  if (runHistory === null) {
    loadRunHistory();
  }
  // load free play items
  let key = ".PREF.FREEPLAY";
  if (runHistory.hasOwnProperty(key) && runHistory[key] !== null && runHistory[key].length !== 0) {
    freePlay = deepcopy(runHistory[key]); // deep copy for safety
  } else {
    console.log("NO FREEPLAY IN RUNHISTORY:"+runHistory[key]);
  }

  for (let i = 0; i < freePlay.length; i++) {
    if (!isAvail(freePlay[i].category)) {
      freePlay[i].category = 'misc';
    }
  }
  // whether or not we found it in history it has to be loaded into the presets menu
  // first delete any old ones already there

  createPresetMenu();
}

async function logFreePlay(elapsed, replace=false) {
  console.log("[LOGFREEPLAY] Starting, elapsed:", elapsed, "replace:", replace);
  console.trace("[LOGFREEPLAY] Call stack:");
  
  if (!testOptions.isFreePlay) {
    alert("Can't log freeplay, not in effect");
    return;
  }

  if (runHistory === null) {
    console.log("[LOGFREEPLAY] runHistory is null, loading...");
    await loadRunHistory();
  }

  const preset = "Free Play:"+testOptions.shortName;
  const hand = 'NA';  // Must match format used by getTodayFreePlayTime()
  const date = todayDate();
  const key = date+"|"+preset+"|"+hand;
  
  console.log("[LOGFREEPLAY] Key:", key);

  if (!runHistory.hasOwnProperty(key) || replace) {
    console.log("[LOGFREEPLAY] Creating new entry");
    runHistory[key] = {
      count: 0,
      elapsed: 0,
      isFreePlay: true
    };
  }

  const oldElapsed = runHistory[key].elapsed;
  runHistory[key].count++;
  runHistory[key].elapsed += elapsed;
  runHistory[key].wallTime = runHistory[key].elapsed;  // wallTime should match elapsed for free play
  runHistory[key].reps = runHistory[key].count;
  
  console.log("[LOGFREEPLAY] Updated: count:", runHistory[key].count, 
              "elapsed:", oldElapsed, "->", runHistory[key].elapsed);

  console.log("[LOGFREEPLAY] Calling saveRunHistory (awaiting)...");
  await saveRunHistory();
  console.log("[LOGFREEPLAY] saveRunHistory returned");
  console.log("[LOGFREEPLAY] Completed, total elapsed:", runHistory[key].elapsed);
}

function showFreePlay() {
    animateOpen("freePlayContainer");
    setTimeout(function() {
      displayFreePlay();
    }, 300);
}

// Calculate days since a given date (YYYY-MM-DD format)
function daysSince(date) {
  const past = new Date(date);
  const today = new Date();
  today.setHours(0,0,0,0);
  const millis = today - past;
  const days = Math.trunc(millis/(1000*60*60*24));
  return days;
}

// Format milliseconds as "Xd X.Xh"
function formatTimeAsDaysHours(milliseconds) {
  if (!milliseconds || milliseconds === 0) {
    return "0h";
  }
  
  const hours = milliseconds / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days === 0) {
    return remainingHours.toFixed(1) + "h";
  } else {
    return days + "d " + remainingHours.toFixed(1) + "h";
  }
}

// Build a cache of practice statistics for all free play items
function buildPracticeStatsCache() {
  const stats = {}; // { itemName: { lastDate: "YYYY-MM-DD", totalTime: ms } }
  
  for (const key in runHistory) {
    if (key.includes("|Free Play:") && key.endsWith("|NA")) {
      const [date, presetPart, hand] = key.split("|");
      const itemName = presetPart.replace("Free Play:", "");
      
      if (!stats[itemName]) {
        stats[itemName] = { lastDate: date, totalTime: 0 };
      }
      
      // Update last date if this is more recent
      if (date > stats[itemName].lastDate) {
        stats[itemName].lastDate = date;
      }
      
      // Add to total time
      const elapsed = runHistory[key].elapsed || runHistory[key].wallTime || 0;
      stats[itemName].totalTime += elapsed;
    }
  }
  
  return stats;
}

// Format practice statistics for display
function formatPracticeStats(itemName, statsCache) {
  const stats = statsCache[itemName];
  
  if (!stats) {
    return "<span style='color:#999'>last: never<br>total: 0h</span>";
  }
  
  const daysSinceLast = daysSince(stats.lastDate);
  const totalFormatted = formatTimeAsDaysHours(stats.totalTime);
  
  // Color code based on recency
  let lastColor = "#999"; // gray for never
  if (daysSinceLast === 0) {
    lastColor = "#0a0"; // green for today
  } else if (daysSinceLast <= 3) {
    lastColor = "#080"; // darker green for recent
  } else if (daysSinceLast <= 7) {
    lastColor = "#660"; // orange for a week
  } else {
    lastColor = "#900"; // red for old
  }
  
  return `<span style='color:${lastColor}'>last: ${daysSinceLast}d</span><br>` +
         `<span style='color:#666'>total: ${totalFormatted}</span>`;
}

// Track current sort state
let freePlaySortBy = 'practice'; // 'name', 'practice', 'category'
let freePlaySortDirection = 'asc'; // 'asc' or 'desc'

function sortFreePlayBy(column) {
  // Toggle direction if clicking the same column, otherwise reset to ascending
  if (freePlaySortBy === column) {
    freePlaySortDirection = freePlaySortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    freePlaySortBy = column;
    freePlaySortDirection = 'asc';
  }
  displayFreePlay();
}

function showFreePlayHiddenItems() {
  showFreePlayHidden = !showFreePlayHidden;
  if (showFreePlayHidden) {
    document.getElementById("showFreePlayHiddenButton").innerHTML = "Hide Hidden Items";
  } else {
    document.getElementById("showFreePlayHiddenButton").innerHTML = "Show Hidden Items";
  }
  displayFreePlay();
}

function displayFreePlay(edit=-1) {
  const tab = document.getElementById("freePlayTbody");
  
  // Build practice stats cache once for all items
  const practiceStats = buildPracticeStatsCache();
  
  // Create sorted index array
  const sortedIndices = freePlay.map((item, index) => index);
  
  // Sort based on current sort column
  sortedIndices.sort((aIdx, bIdx) => {
    const a = freePlay[aIdx];
    const b = freePlay[bIdx];
    let comparison = 0;
    
    if (freePlaySortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (freePlaySortBy === 'category') {
      const catA = a.category || 'misc';
      const catB = b.category || 'misc';
      comparison = catA.localeCompare(catB);
    } else if (freePlaySortBy === 'practice') {
      // Sort by days since last practice (most recent first when asc)
      const statsA = practiceStats[a.name];
      const statsB = practiceStats[b.name];
      
      // Items never practiced go to the end
      if (!statsA && !statsB) comparison = 0;
      else if (!statsA) comparison = 1;
      else if (!statsB) comparison = -1;
      else {
        const daysA = daysSince(statsA.lastDate);
        const daysB = daysSince(statsB.lastDate);
        comparison = daysA - daysB; // ascending = most recent first (0d, 1d, 2d...)
      }
    }
    
    return freePlaySortDirection === 'asc' ? comparison : -comparison;
  });
  
  let t = ""; // will build up table rows
  for (let idx = 0; idx < sortedIndices.length; idx++) {
    const i = sortedIndices[idx];
    if (freePlay[i].deleted && showFreePlayHidden === false) {
      continue;
    }
    if (edit == i) {
      // this item is being edited
      const stats = formatPracticeStats(freePlay[i].name, practiceStats);
      t +=
        "<tr data-index="+i+">"+
        "<td><strong><em>EDIT</em></strong></td>"+ // no drag symbol while editing
        "<td style=font-weight:bold>"+freePlay[i].name+"</td>"+
        "<td style='font-size:small;white-space:nowrap'>"+stats+"</td>"+
        "<td><input type=text id=freePlayEditDescription value='"+freePlay[i].description+"' maxlength=100 style=width:95%;x-overflow:auto></td>"+
        "<td><select id=freePlayEditCategory>";
        presetCats.forEach(cat => {
          t += "<option value='"+cat.name+"'>"+cat.description+"</option>";
        });
        t += "</select>"+
        "<td colspan=2 style=text-align:center>"+
         "<button onclick='saveEditFreePlay("+i+")' "+
                      " title='Save edited Free Play item' style=font-size:medium;display:inline-block;padding:4px;margin:0><i class=\"fa-regular fa-floppy-disk\"></i> Save</button>"+
          "&nbsp;<button onclick='displayFreePlay()' "+
                       " title='Cancel edit' style=font-size:medium;display:inline-block;padding:4px;margin:0><i class=\"fa-regular fa-rectangle-xmark\"></i> Cancel</button>"+
         "</td>"+
        "</tr>";
      continue;
    }

    // if we get to here edit is not in effect
    t += "<tr draggable=true id=freeplay_"+i+" data-index="+i+"><td style=text-align:center;min-width:2em;padding:4px>&vellip;&vellip;</td>";

    const stats = formatPracticeStats(freePlay[i].name, practiceStats);
    const cat = presetCats.find(cat => cat.name === freePlay[i].category);
    t += "<td onclick='gotoPreset(\""+freePlay[i].name+"\",\"freePlayContainer\")' title='Load this preset in the practice area' style=cursor:pointer>"+
          "<i class=\"fa-solid fa-square-arrow-up-right\" style=opacity:0.3;padding:3px></i> "+freePlay[i].name+"</td>"+
          "<td style='font-size:small;white-space:nowrap;padding:4px'>"+stats+"</td>"+
          "<td>"+freePlay[i].description+"</td>"+
          "<td>"+avail(cat.description,'Miscellaneous')+"</td>";
    if (freePlay[i].deleted) {
      t += "<td style=text-align:center;min-width:2eml;padding:4px>"+
            "<div onclick='deleteFreePlay("+i+", false)' style=display:inline-block title='Item is hidden in Presets menu. Click to make visible.'><i class='fa-solid fa-eye-slash'></i></div></td>";
    } else {
      t += "<td style=text-align:center;min-width:2em;padding:4px>"+
            "<div onclick='deleteFreePlay("+i+")' style=display:inline-block title='Item is visible in Presets menu. Click to hide it.'><i class='fa-solid fa-eye'></i></div></td>";
    }
    t += "<td onclick='displayFreePlay("+i+")' style=min-width:2em;text-align:center><i class='fa-solid fa-pencil'></i></td>";
    t += "</tr>";
  }

  // allow user to add a new one

  t += "<tr><td style=text-align:center><div onclick='addNewFreePlay()' "+
                 " title='Create a new Free Play item' style=font-size:x-large;font-weight:bold;cursor:pointer>&#65291;</div></td>"+
    "<td><input type=text id=freePlayName placeholder='New item short name' maxlength=32></td>"+
    "<td></td>"+ // empty Practice column for new item row
    "<td><input type=text id=freePlayDescription placeholder='New item description of practice activity' maxlength=100 style=width:95%;x-overflow:auto></td>"+
    "<td><select id=freePlayCategory>";
    presetCats.forEach(cat => {
      t += "<option value='"+cat.name+"'>"+cat.description+"</option>";
    });
    t += "</select><td></td><td></td></tr>";

  tab.innerHTML = t;
  
  // Update sort indicators in headers
  const indicators = {
    name: document.getElementById("sortIndicatorName"),
    practice: document.getElementById("sortIndicatorPractice"),
    category: document.getElementById("sortIndicatorCategory")
  };
  
  // Clear all indicators
  for (const key in indicators) {
    if (indicators[key]) indicators[key].innerHTML = "";
  }
  
  // Set indicator for current sort column
  if (indicators[freePlaySortBy]) {
    indicators[freePlaySortBy].innerHTML = freePlaySortDirection === 'asc' ? '▼' : '▲';
  }

  // attach drag events
  setTimeout(function() {
      let placeholder;

      const rows = document.querySelectorAll("#freePlayTbody tr[draggable=true]");
      let draggedItem = null;

      rows.forEach((row) => {

        row.cells[0].style.touchAction = "none"; // the drag icon is in cell[0] and we want to handle touches there

        // Touch Start
        row.cells[0].addEventListener('touchstart', function(e) {
          draggedItem = row;

          // Enhanced Placeholder
          placeholder = document.createElement('tr');
          placeholder.style.border = "3px dashed #ccc"; // Example styling
          placeholder.style.height = `${row.offsetHeight}px`; // Match the height of the original row
          placeholder.innerHTML = "<td colspan='6' style=text-align:center;background-color:lightgray>"+
            "MOVING: <strong>"+ row.cells[1].textContent+"</strong></td>"; // Adjust colspan as needed

          // Insert placeholder
          row.parentNode.insertBefore(placeholder, row);
          row.style.opacity = "0.5"; // Optional: make the dragged row semi-transparent

          e.preventDefault();
        }, {passive: false});

        // Touch Move
        row.cells[0].addEventListener('touchmove', function(e) {
          if (!draggedItem) return;

          const touchLocation = e.targetTouches[0];
          const targetElement = document.elementFromPoint(touchLocation.clientX, touchLocation.clientY);

          if (targetElement && targetElement.closest('tr') && targetElement.closest('tr') !== placeholder) {
            const targetRow = targetElement.closest('tr');
            const comparisonRect = targetRow.getBoundingClientRect();

            // Move placeholder
            if (touchLocation.clientY > comparisonRect.top + comparisonRect.height / 2) {
              targetRow.parentNode.insertBefore(placeholder, targetRow.nextSibling);
            } else {
              targetRow.parentNode.insertBefore(placeholder, targetRow);
            }
          }
          e.preventDefault();
        }, {passive: false});

        // Touch End
        row.cells[0].addEventListener('touchend', function(e) {
          if (draggedItem && placeholder) {
           // Finalize the drop
           const oldIndex = parseInt(draggedItem.getAttribute('data-index'));
           let newIndex = Array.from(placeholder.parentNode.children).indexOf(placeholder);

           // If dragging down, adjust for the removal of the original position
           if (newIndex > oldIndex) newIndex -= 1;

           // Reorder the freePlay array
           const [reorderedItem] = freePlay.splice(oldIndex, 1); // Remove item from old position
           freePlay.splice(newIndex, 0, reorderedItem); // Insert item at new position

           placeholder.parentNode.insertBefore(draggedItem, placeholder);
           placeholder.parentNode.removeChild(placeholder);
           draggedItem.style.opacity = "1"; // Restore opacity

           // Save the reordered array
           saveFreePlay();
           displayFreePlay(); // redraw
           createPresetMenu(); // items have changed order

           draggedItem = null; // Clear references
         }
          e.preventDefault();
        }, {passive: false});

        // Add drag and drop handlers

        row.addEventListener('dragstart', (event) => {
          freePlayDragIndex = row.getAttribute("data-index");
        });

        row.addEventListener('dragover', (event) => {
          event.preventDefault();
        });

        row.addEventListener('drop', (event) => {
          event.preventDefault();
          // Calculate target index and perform the swap
          const targetIndex = [...row.parentNode.children].indexOf(event.currentTarget);
          if (freePlayDragIndex !== targetIndex) {
            const itemToMove = freePlay[freePlayDragIndex];
            freePlay.splice(freePlayDragIndex, 1); // Remove the item from its original position
            freePlay.splice(targetIndex, 0, itemToMove); // Insert it at the new position
            saveFreePlay();
            displayFreePlay(); // redraw
            createPresetMenu(); // items changed order
          }
        });
      });  // end of foreach row
    }, 100);
}

function deleteFreePlay(index, value=true) {
  freePlay[index].deleted = value;
  saveFreePlay();
  displayFreePlay(); // redisplay
  createPresetMenu(); // items changed
}

function addNewFreePlay() {
  const name = document.getElementById("freePlayName").value.trim();
  const desc = document.getElementById("freePlayDescription").value.trim();
  const cat = document.getElementById("freePlayCategory").value.trim();

  if (name && desc && cat) {
    freePlay.push({name: name, description: desc, category: cat, deleted: false, isFreePlay: true});
    saveFreePlay();
    displayFreePlay();
    createPresetMenu(); // item added
    document.getElementById("freePlayName").value = "";
    document.getElementById("freePlayDescription").value = "";
  }
}

async function saveEditFreePlay(edit) {
  const desc = document.getElementById("freePlayEditDescription").value.trim();
  const cat = document.getElementById("freePlayEditCategory").value.trim();

  if (desc && cat) {
    freePlay[edit] = {name: freePlay[edit].name, description: desc, category: cat, deleted: false, isFreePlay: true};
    await saveFreePlay();
    displayFreePlay();
    createPresetMenu(); // item modified
  }
}
