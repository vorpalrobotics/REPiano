"use strict";

// Learning schedule configuration
const learningScheduleIconName = {
  "begin": "fa-regular fa-flag",
  "refine": "fa-solid fa-sliders",
  "maintain": "fa-solid fa-sync-alt",
  "archive": "fa-solid fa-archive"
};

const learningScheduleDayParams = {
  "begin": [1, 2, 3],
  "refine": [4, 7, 14],
  "maintain": [30, 45, 60],
  "archive": [180, 360, 600]
};

// Application states
const STATE = {
  SETTING_NOTES: 'SETTING_NOTES',
  TESTING_NOTES: 'TESTING_NOTES',
  WAITING_FOR_BUTTON: 'WAITING_FOR_BUTTON',
  TEST_FLUSHING: 'TEST_FLUSHING'
};

// Routine categories
const presetCats = [
  {name: 'scaleArp', description: 'Scale/Arpeggio'},
  {name: 'drill', description: 'Other Drill'},
  {name: 'repertoire', description: 'Repertoire'},
  {name: 'misc', description: 'Miscellaneous'},
];

// Musical symbol codepoints
const M = {
  "whole":    String.fromCodePoint(119133),
  "half":     String.fromCodePoint(119134),
  "quarter":  String.fromCodePoint(119135),
  "8th":      String.fromCodePoint(119136),
  "16th":     String.fromCodePoint(119137),
  "32nd":     String.fromCodePoint(119138),
  "barline":  String.fromCodePoint(119140),
  "multirest": String.fromCodePoint(119098),
  "wholerest": String.fromCodePoint(119099),
  "halfrest": String.fromCodePoint(119100),
  "quarterrest": String.fromCodePoint(119101),
  "8threst":  String.fromCodePoint(119102),
  "16threst": String.fromCodePoint(119103),
  "32ndrest": String.fromCodePoint(119104),
  "dot":      ".",                           // noto music is missing this: " "+String.fromCodePoint(119149),
                                             // so for now just use period
  "pedal":    String.fromCodePoint(119214),
  "pedalup":  String.fromCodePoint(119215),
  "forte":    String.fromCodePoint(119185),
  "piano":    String.fromCodePoint(119183),
  "mezzo":    String.fromCodePoint(119184),
  "keyboard": String.fromCodePoint(127929),
  "finalbar": String.fromCodePoint(0x1D102)
};

const RESTNOTE = -1;  // numerical value for a "rest" or lack of a note

// Meter and swing choices
const meterChoices = ["2", "4", "8", "16", "32"];
const sw8Choices = ["sw8", ""];

// Graph constants
const DEFAULTGRAPHMAG = 0.32;
const MAXGRAPHMAG = 3;

// Skill map section defaults
const skillMapSectionCollapsed = {
  scales: false,
  arps: false,
  drills: false,
  freeplay: false,
  repertoire: false
};

// Keyboard display options
const keyboardOptions = {
  canvasId: 'keyboardCanvas',
  numOctaves: 6,
  startingOctave: 1,
  notesOn: [],
};

// Default preferences
const preferences = {
  noteDebug: true,
  autoFullscreenStart: true,
  autoExitFullscreenStop: true,
  autoPauseClock: true,
  enableVoice: true,

  enableTones: true,
  toneOnNoteFail: "C2",
  toneOnQFail: "G2",
  toneOnPassing: "C5",
  toneOnGood: "E5",
  toneOnExcellent: "G5", // also this gets doubled
  toneDuration: "200",  // milliseconds
  toneVelocity: "100", // pretty loud
  toneFailVoice: "11", // vibraphone on most GM128 keyboards
  toneSuccessVoice: "52", // choir on most GM128 keyboards
  noteFilter: 3,
  scoreHTQ: true,
  scoreMetQ: true,
  scoreDynQ: true,
  scoreLegQ: true,
  scoreStaQ: true,
  showKeyboard: true,
  bpmNoteValue: "0.025",
  runCancelKeyLow: "A0",
  runCancelKeyHigh: "C8",
  metroVolume: 0.7,
  speakingVolume: 1.0,

  speakingRate: 1.2,  // slightly fast
  speechPauses: true, // use if BT is enabled

  barPresetAll: true,

  metroSmartExtraMax: 20,  // the maximum amount of BPM we will add when using smart metronome
  metroSmartInc: 2,        // how much do we increment smart metronome by
  metroSmartIncStrikes: 1, // the maximum number of strikes before incrementing smart metronom. 1 = "GOOD" or "EXCELLENT" run
  metroSmartResetStrikes: 3, // the minimum number of strikes before resetting to the base rate. 3 = QFAIL run.
                            // note: a notefail automatically resets smart metronome to base rate.
  synthLocalEcho: false,  // turn this to true if you are using a midi controller that doesn't generate sounds itself.
  synthPlaySongs: false   // turn this on and play buttons (both graph and score) as well as quality report sounds use internal polysynth
};

// UI Colors
const bodyColor = "rgba(173, 216, 230, 0.7)";
const bodyAlertColor = "yellow";
const staffColor = "rgba(216, 191, 216, 0.7)";
const staffScrollbarThumbColor = "rgba(200, 180, 200, 0.7)";
const staffScrollbarTrackColor = "rgba(240, 210, 240, 0.9)";
const statsColor = "rgba(152, 251, 152, 0.7)";
const togglePrefColor = "rgba(142,231,142,0.8)";

// Note name constants for preset definitions
const A1 = 'A1', A2 = 'A2', A3 = 'A3', A4 = 'A4', A5 = 'A5', A6 = 'A6';
const B1 = 'B1', B2 = 'B2', B3 = 'B3', B4 = 'B4', B5 = 'B5', B6 = 'B6';
const C1 = 'C1', C2 = 'C2', C3 = 'C3', C4 = 'C4', C5 = 'C5', C6 = 'C6';
const D1 = 'D1', D2 = 'D2', D3 = 'D3', D4 = 'D4', D5 = 'D5', D6 = 'D6';
const E1 = 'E1', E2 = 'E2', E3 = 'E3', E4 = 'E4', E5 = 'E5', E6 = 'E6';
const F1 = 'F1', F2 = 'F2', F3 = 'F3', F4 = 'F4', F5 = 'F5', F6 = 'F6';
const G1 = 'G1', G2 = 'G2', G3 = 'G3', G4 = 'G4', G5 = 'G5', G6 = 'G6';

// Sharps
const A1s = 'A#1', C1s = 'C#1', D1s = 'D#1', F1s = 'F#1', G1s = 'G#1';
const A2s = 'A#2', C2s = 'C#2', D2s = 'D#2', F2s = 'F#2', G2s = 'G#2';
const A3s = 'A#3', C3s = 'C#3', D3s = 'D#3', F3s = 'F#3', G3s = 'G#3';
const A4s = 'A#4', C4s = 'C#4', D4s = 'D#4', F4s = 'F#4', G4s = 'G#4';
const A5s = 'A#5', C5s = 'C#5', D5s = 'D#5', F5s = 'F#5', G5s = 'G#5';
const A6s = 'A#6', C6s = 'C#6', D6s = 'D#6', F6s = 'F#6', G6s = 'G#6';

// Flats
const A1b = 'G#1', B1b = 'A#1', D1b = 'C#1', E1b = 'D#1', G1b = 'F#1';
const A2b = 'G#2', B2b = 'A#2', D2b = 'C#2', E2b = 'D#2', G2b = 'F#2';
const A3b = 'G#3', B3b = 'A#3', D3b = 'C#3', E3b = 'D#3', G3b = 'F#3';
const A4b = 'G#4', B4b = 'A#4', D4b = 'C#4', E4b = 'D#4', G4b = 'F#4';
const A5b = 'G#5', B5b = 'A#5', D5b = 'C#5', E5b = 'D#5', G5b = 'F#5';
const A6b = 'G#6', B6b = 'A#6', D6b = 'C#6', E6b = 'D#6', G6b = 'F#6';

// Preset metric configurations
const scalemetrics = {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: false};
const bluesscalemetrics = {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: false};
const bluesSwungEighths = [[1/8], [1/8], 1/8, true];

// Free play presets
const freePlay = [
  {
    name: "Scales3",
    description: "Scales, 3 octaves in chromatic order",
    category: "scaleArp",
    deleted: false,
    isFreePlay: true
  },
  {
    name: "Scales4",
    description: "Scales, 4 octaves in chromatic order",
    category: "scaleArp",
    deleted: false,
    isFreePlay:true
  },
  {
    name: "Arps, various",
    description: "Arpeggios switching from 1 to 3 octaves and tonic",
    category: "scaleArp",
    deleted: false,
    isFreePlay:true
  }
];

// LocalStorage keys
const lastBackupKey = 'REPiano.lastBackupTimestamp';
