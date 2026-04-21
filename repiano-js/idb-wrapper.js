"use strict";

// IndexedDB wrapper for runHistory storage
// Preferences and UI state remain in localStorage

const DB_NAME = "REPianoHistory";
const DB_VERSION = 1;
const STORE_NAME = "entries";

let db = null;

// Initialize IndexedDB
function initIDB() {
  return new Promise((resolve, reject) => {
    console.log("Initializing IndexedDB...");
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error("IndexedDB failed to open:", request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log("IndexedDB opened successfully");
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      console.log("IndexedDB upgrade needed, creating object store...");
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        console.log("Object store created:", STORE_NAME);
      }
    };
  });
}

// Save entire runHistory object to IDB
async function saveAllToIDB(runHistoryObject) {
  const saveId = Date.now();
  console.log(`[IDB ${saveId}] saveAllToIDB called`);
  
  if (!db) {
    console.error(`[IDB ${saveId}] Database not initialized`);
    throw new Error("Database not initialized. Call initIDB() first.");
  }
  
  const keyCount = Object.keys(runHistoryObject).length;
  console.log(`[IDB ${saveId}] Saving ${keyCount} keys to IDB`);
  
  return new Promise((resolve, reject) => {
    console.log(`[IDB ${saveId}] Creating transaction...`);
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    
    let successCount = 0;
    let errorCount = 0;
    let putCount = 0;
    
    console.log(`[IDB ${saveId}] Starting to put entries...`);
    // Convert runHistory object to key-value pairs and store each
    for (const [key, value] of Object.entries(runHistoryObject)) {
      putCount++;
      const request = objectStore.put({ key: key, value: value });
      
      request.onsuccess = () => {
        successCount++;
        if (successCount % 1000 === 0) {
          console.log(`[IDB ${saveId}] Progress: ${successCount}/${keyCount}`);
        }
      };
      
      request.onerror = () => {
        console.error(`[IDB ${saveId}] Error saving key:`, key, request.error);
        errorCount++;
      };
    }
    
    console.log(`[IDB ${saveId}] All ${putCount} put requests queued, waiting for transaction...`);
    
    transaction.oncomplete = () => {
      console.log(`[IDB ${saveId}] Transaction complete: ${successCount} succeeded, ${errorCount} failed`);
      resolve();
    };
    
    transaction.onerror = () => {
      console.error(`[IDB ${saveId}] Transaction error:`, transaction.error);
      reject(transaction.error);
    };
    
    transaction.onabort = () => {
      console.error(`[IDB ${saveId}] Transaction aborted:`, transaction.error);
      reject(new Error("Transaction aborted"));
    };
  });
}

// Get entire runHistory object from IDB
async function getAllFromIDB() {
  const loadId = Date.now();
  console.log(`[IDB-LOAD ${loadId}] getAllFromIDB called`);
  
  if (!db) {
    console.error(`[IDB-LOAD ${loadId}] Database not initialized`);
    throw new Error("Database not initialized. Call initIDB() first.");
  }
  
  console.log(`[IDB-LOAD ${loadId}] Creating transaction...`);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    console.log(`[IDB-LOAD ${loadId}] Calling getAll()...`);
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
      const entries = request.result;
      console.log(`[IDB-LOAD ${loadId}] getAll() returned ${entries.length} entries`);
      
      // Log sample entries
      if (entries.length > 0) {
        console.log(`[IDB-LOAD ${loadId}] Sample entries:`, entries.slice(0, 3).map(e => e.key));
      }
      
      // Convert array of {key, value} back to object
      const runHistoryObject = {};
      for (const entry of entries) {
        runHistoryObject[entry.key] = entry.value;
      }
      
      console.log(`[IDB-LOAD ${loadId}] Converted to object with ${Object.keys(runHistoryObject).length} keys`);
      resolve(runHistoryObject);
    };
    
    request.onerror = () => {
      console.error(`[IDB-LOAD ${loadId}] Error loading from IDB:`, request.error);
      reject(request.error);
    };
  });
}

// Clear all data from IDB (used before import)
async function clearIDB() {
  if (!db) {
    console.error("Database not initialized");
    throw new Error("Database not initialized. Call initIDB() first.");
  }
  
  console.log("Clearing all data from IDB...");
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();
    
    request.onsuccess = () => {
      console.log("IDB cleared successfully");
      resolve();
    };
    
    request.onerror = () => {
      console.error("Error clearing IDB:", request.error);
      reject(request.error);
    };
  });
}
