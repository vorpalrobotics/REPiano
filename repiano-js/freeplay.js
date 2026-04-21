"use strict";

// Free Play module - manages free play items (practice outside of structured presets)

function freePlayDescription(name) {
  const fp = freePlay.find(p => p.name === name);

  return fp?fp.description:'';
}

function deepcopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function saveFreePlay() {
  console.log("SAVING FREEPLAY IN HISTORY, records:"+freePlay.length);
  runHistory[".PREF.FREEPLAY"] = deepcopy(freePlay); // deep copy
  for (let i = 0; i < runHistory[".PREF.FREEPLAY"].length; i++) {
    console.log(runHistory[".PREF.FREEPLAY"][i].name);
  }
  saveRunHistory();
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

function logFreePlay(elapsed, replace=false) {
  if (!testOptions.isFreePlay) {
    alert("Can't log freeplay, not in effect");
    return;
  }

  if (runHistory === null) {
    loadRunHistory();
  }

  const preset = "Free Play:"+testOptions.name;
  const hand = 'both';
  const date = todayDate();
  const key = date+"|"+preset+"|"+hand;

  if (!runHistory.hasOwnProperty(key) || replace) {
    runHistory[key] = {
      count: 0,
      elapsed: 0,
      isFreePlay: true
    };
  }

  runHistory[key].count++;
  runHistory[key].elapsed += elapsed;
  runHistory[key].reps = runHistory[key].count;

  saveRunHistory();
}

function showFreePlay() {
    animateOpen("freePlayContainer");
    setTimeout(function() {
      displayFreePlay();
    }, 300);
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
  let t = ""; // will build up table rows
  for (let i = 0; i < freePlay.length; i++) {
    if (freePlay[i].deleted && showFreePlayHidden === false) {
      continue;
    }
    if (edit == i) {
      // this item is being edited
      t +=
        "<tr data-index="+i+">"+
        "<td><strong><em>EDIT</em></strong></td>"+ // no drag symbol while editing
        "<td style=font-weight:bold>"+freePlay[i].name+"</td>"+
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


    const cat = presetCats.find(cat => cat.name === freePlay[i].category);
    t += "<td onclick='gotoPreset(\""+freePlay[i].name+"\",\"freePlayContainer\")' title='Load this preset in the practice area' style=cursor:pointer>"+
          "<i class=\"fa-solid fa-square-arrow-up-right\" style=opacity:0.3;padding:3px></i> "+freePlay[i].name+"</td>"+
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
    "<td><input type=text id=freePlayDescription placeholder='New item description of practice activity' maxlength=100 style=width:95%;x-overflow:auto></td>"+
    "<td><select id=freePlayCategory>";
    presetCats.forEach(cat => {
      t += "<option value='"+cat.name+"'>"+cat.description+"</option>";
    });
    t += "</select><td></td><td></td></tr>";

  tab.innerHTML = t;

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

function saveEditFreePlay(edit) {
  const desc = document.getElementById("freePlayEditDescription").value.trim();
  const cat = document.getElementById("freePlayEditCategory").value.trim();

  if (desc && cat) {
    freePlay[edit] = {name: freePlay[edit].name, description: desc, category: cat, deleted: false, isFreePlay: true};
    saveFreePlay();
    displayFreePlay();
    createPresetMenu(); // item modified
  }
}
