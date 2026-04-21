"use strict";

// Phase 1: Import config and utils modules
// The rest of the code is still in the monolithic file for now
import * as config from './config.js';
import * as utils from './utils.js';

// Make config and utils available globally for the legacy code
window.REPiano = window.REPiano || {};
window.REPiano.config = config;
window.REPiano.utils = utils;

// Also expose individual items to global scope for backward compatibility
// This allows the existing code to work without changes during the migration

// From config.js
window.learningScheduleIconName = config.learningScheduleIconName;
window.learningScheduleDayParams = config.learningScheduleDayParams;
window.STATE = config.STATE;
window.presetCats = config.presetCats;
window.M = config.M;
window.RESTNOTE = config.RESTNOTE;
window.meterChoices = config.meterChoices;
window.sw8Choices = config.sw8Choices;
window.DEFAULTGRAPHMAG = config.DEFAULTGRAPHMAG;
window.MAXGRAPHMAG = config.MAXGRAPHMAG;
window.skillMapSectionCollapsed = config.skillMapSectionCollapsed;
window.keyboardOptions = config.keyboardOptions;
window.preferences = config.preferences;
window.bodyColor = config.bodyColor;
window.bodyAlertColor = config.bodyAlertColor;
window.staffColor = config.staffColor;
window.staffScrollbarThumbColor = config.staffScrollbarThumbColor;
window.staffScrollbarTrackColor = config.staffScrollbarTrackColor;
window.statsColor = config.statsColor;
window.togglePrefColor = config.togglePrefColor;
window.scalemetrics = config.scalemetrics;
window.bluesscalemetrics = config.bluesscalemetrics;
window.bluesSwungEighths = config.bluesSwungEighths;
window.freePlay = config.freePlay;
window.lastBackupKey = config.lastBackupKey;

// Note name constants
window.A1 = config.A1; window.A2 = config.A2; window.A3 = config.A3; window.A4 = config.A4; window.A5 = config.A5; window.A6 = config.A6;
window.B1 = config.B1; window.B2 = config.B2; window.B3 = config.B3; window.B4 = config.B4; window.B5 = config.B5; window.B6 = config.B6;
window.C1 = config.C1; window.C2 = config.C2; window.C3 = config.C3; window.C4 = config.C4; window.C5 = config.C5; window.C6 = config.C6;
window.D1 = config.D1; window.D2 = config.D2; window.D3 = config.D3; window.D4 = config.D4; window.D5 = config.D5; window.D6 = config.D6;
window.E1 = config.E1; window.E2 = config.E2; window.E3 = config.E3; window.E4 = config.E4; window.E5 = config.E5; window.E6 = config.E6;
window.F1 = config.F1; window.F2 = config.F2; window.F3 = config.F3; window.F4 = config.F4; window.F5 = config.F5; window.F6 = config.F6;
window.G1 = config.G1; window.G2 = config.G2; window.G3 = config.G3; window.G4 = config.G4; window.G5 = config.G5; window.G6 = config.G6;

// Sharps
window.A1s = config.A1s; window.C1s = config.C1s; window.D1s = config.D1s; window.F1s = config.F1s; window.G1s = config.G1s;
window.A2s = config.A2s; window.C2s = config.C2s; window.D2s = config.D2s; window.F2s = config.F2s; window.G2s = config.G2s;
window.A3s = config.A3s; window.C3s = config.C3s; window.D3s = config.D3s; window.F3s = config.F3s; window.G3s = config.G3s;
window.A4s = config.A4s; window.C4s = config.C4s; window.D4s = config.D4s; window.F4s = config.F4s; window.G4s = config.G4s;
window.A5s = config.A5s; window.C5s = config.C5s; window.D5s = config.D5s; window.F5s = config.F5s; window.G5s = config.G5s;
window.A6s = config.A6s; window.C6s = config.C6s; window.D6s = config.D6s; window.F6s = config.F6s; window.G6s = config.G6s;

// Flats
window.A1b = config.A1b; window.B1b = config.B1b; window.D1b = config.D1b; window.E1b = config.E1b; window.G1b = config.G1b;
window.A2b = config.A2b; window.B2b = config.B2b; window.D2b = config.D2b; window.E2b = config.E2b; window.G2b = config.G2b;
window.A3b = config.A3b; window.B3b = config.B3b; window.D3b = config.D3b; window.E3b = config.E3b; window.G3b = config.G3b;
window.A4b = config.A4b; window.B4b = config.B4b; window.D4b = config.D4b; window.E4b = config.E4b; window.G4b = config.G4b;
window.A5b = config.A5b; window.B5b = config.B5b; window.D5b = config.D5b; window.E5b = config.E5b; window.G5b = config.G5b;
window.A6b = config.A6b; window.B6b = config.B6b; window.D6b = config.D6b; window.E6b = config.E6b; window.G6b = config.G6b;

// From utils.js
window.avail = utils.avail;
window.isAvail = utils.isAvail;
window.noteToMidiNumber = utils.noteToMidiNumber;
window.isChord = utils.isChord;
window.durUnicode = utils.durUnicode;
window.restUnicode = utils.restUnicode;
window.durFrac = utils.durFrac;
window.formatTime = utils.formatTime;
window.percent = utils.percent;
window.nonZero = utils.nonZero;
window.spokenNumber = utils.spokenNumber;
window.dateToDaysSince1970 = utils.dateToDaysSince1970;
window.getToday = utils.getToday;
window.message = utils.message;
window.warning = utils.warning;
window.limitNumber = utils.limitNumber;

// Initialize runHistory to empty object (will be populated by loadRunHistory)
// This prevents errors if code tries to access it before loadRunHistory is called
window.runHistory = {};

// Now load the rest of the legacy code
// IMPORTANT: We must use document.write to load synchronously BEFORE DOMContentLoaded fires
// Using createElement would load async and miss the DOMContentLoaded event
document.write('<script src="../repiano.js"><\/script>');
