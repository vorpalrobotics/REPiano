"use strict";

// Manage module - manages preset items (scales, arpeggios, repertoire, drills)

let showManageHidden = false;

function showManage() {
    busyIndicator(true);

    setTimeout(() => {
      //populateManageTable();
      animateOpen("manageContainer");
      setTimeout(function() {
        displayManage();
      }, 300);
      busyIndicator(false);
    }, 50);
}

// IMPLEMENT: This needs to drive off the presets table.

function displayManage() {
  const tab = document.getElementById("manageTbody");
  let t = ""; // will build up table rows
  for (let i = 0; i < presets.length; i++) {
    if (presets[i].deleted && showManageHidden === false) {
      continue;
    }
    if (presets[i].isFreePlay) {
      continue; // freeplay items are managed on the freeplay screen
    }
    if (typeof(presets[i]) === "string") {
      // header, skip
      continue;
    }
    t += "<tr draggable=true id=manage_"+i+" data-index="+i+
          "><td style=text-align:center;min-width:2em;padding:4px>&vellip;&vellip;</td>";

    const cat = presetCats.find(cat => cat.name === presets[i].category);
    t += "<td onclick='gotoPreset(\""+presets[i].name+
          "\",\"manageContainer\")' title='Load this preset in the practice area' style=cursor:pointer>"+
          "<i class=\"fa-solid fa-square-arrow-up-right\" style=opacity:0.3;padding:3px></i> "+
          presets[i].name+
          "</td>"+
          "<td>"+presets[i].fullName+"</td>"+
          "<td>"+(cat?(avail(cat.description,'Miscellaneous')):"Miscellaneous")+"</td>";
    if (presets[i].deleted) {
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
            "MOVING: <strong>"+ row.cells[3].textContent+"</strong></td>"; // Adjust colspan as needed

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
