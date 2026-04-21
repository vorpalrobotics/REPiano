"use strict";

// Initialize global variables that need to exist before repiano.js loads
// This prevents errors if code tries to access them before they're properly initialized

// Initialize runHistory to empty object (will be populated by loadRunHistory)
let runHistory = {};
