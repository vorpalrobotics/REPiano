"use strict";

// Import/Export module - handles backup file export and advanced import/export UI

function exportBackupFile() {
    let jsonStr = JSON.stringify(runHistory, null, 2);

    let blob = new Blob([jsonStr], { type: "application/json" });

    // Generate current date in yyyy-mm-dd format
    let today = new Date();
    let yyyy = today.getFullYear();
    let mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    let dd = String(today.getDate()).padStart(2, '0');
    let formattedDate = `${yyyy}-${mm}-${dd}`;

    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // Update the filename to include the date
    a.download = `REPiano-backup-${formattedDate}.json`;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    //runHistory[".PREF.lastBackupDate"] = Date.now();
    localStorage.setItem(lastBackupKey, Date.now());
    saveRunHistory();
    checkBackupStatus();

    alert(`
Backup of history has downloaded to your browser\'s download folder.
Be sure to back it up to cloud storage using a syncing app or perhaps
attach it to an email to yourself. Your device may someday be lost or
stolen, or crash, and your practice history data is important.`
  );
}

function toggleAdvancedImportExport() {
  const aiediv = document.getElementById("advancedImportExportDiv");
  const style = window.getComputedStyle(aiediv);
  const button = document.getElementById("AdvancedButton");
  if (style.display === 'none') {
    aiediv.style.display = "block";
    button.innerHTML = "Hide Advanced";
  } else {
    aiediv.style.display = "none";
    button.innerHTML = "Show Advanced";
  }
}
