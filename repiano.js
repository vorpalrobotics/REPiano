"use strict";

// MOVED TO config.js: const learningScheduleIconName = {...};
// MOVED TO config.js: const learningScheduleDayParams = {...};

// global variables. Yeah there are way too many and some day I would restructure
// so that, for example, statistics about the current run are held in an object.

    // States
    // MOVED TO config.js: const STATE = {...};

    let currentState = STATE.WAITING_FOR_BUTTON;

    // routine categories
    // MOVED TO config.js: const presetCats = [...];

    // Musical symbol codepoints
    // MOVED TO config.js: const M = {...};
    // MOVED TO config.js: const RESTNOTE = -1;

    let currentBPMNote = M["quarter"]; // what note time is BPM measured in, this is usually associated with the routine being tested

    // MOVED TO audio.js: let synth = null;

    // Variables for note tracking
    let notesToPlay = [[], []];
    let fingersToPlay = [];
    let fingerEdits = [];
    let playedNotes = [[], []];  // lh, rh
    let errorNotes = [[],[]];    // number of errors made at each note position
    let noteStartBeat = [[],[]]; // what beat number does the note start on
    let durationsToPlay = null;
    let holdsToPlay = null;
    let beatsToPlay = [0,0]; // lh, rh number of beats in selected preset.
    let noteScope = null;    // which notes within selected bars are to be tested
    let activeBars = {first:1, last:1000};
    let midiNotes = []; // for replay feature
    let waitNotes = null;  // played notes transfer here while awaiting the final notes to stop playing
    let nnAccuracy = {success:0, fail:0};
    let goodNotes = 0;  // number of good notes just in current run
    let currentErrorNote = null; // tracks hand and index of current error note for logging
    let maxBar;  // the highest bar number of the active preset.
    let barAnnotations = null;  // notes to display with a bar
    let testOptions = {};
    let barReps = null;
    let BPMRecommendedRange = [0,100000];
    let PriorStreak = [0,0,0,0];
    let practiceStrategy = "";
    let personalBestStreakBPM = 0;
    let personalBestStreakBPMDate = "0000-00-00";
    let personalBestStreakBPMToday = 0;
    let draggingWarning = 0;
    let rushingWarning = 0;

    let repCount = 0;
    let successCount = 0;
    let failCount = 0;
    let noteFailCount = 0;
    let softFailCount = 0;
    let startTime = null;
    let testStartTime = null;
    let testPauseTime = 0;
    let timerPaused = false;
    let lastNoteTime = 0;
    let totalDuration = 0;
    let currentHand = 'right';
    let wrongNotePlayed = false;
    let wrongNoteNumber = -1;
    let averageBPM = 0;
    let maxBPM = 0; // highest bpm not worrying about quality (but notes have to all be correct)
    let bestBPM = 0;  // best bpm among high quality runs
    let sumQBPM = [0,0,0,0];
    let numQBPM = [0,0,0,0];
    let noteFilterHigh = -1;
    let noteFilterLow = 1000;
    let flushRight = false;
    let midiOutput = null;
    let priorFailed = false;

    let curStreak = [0,0,0,0]; // indexed by high quality:0, at least medium: 1, at least low: 2
    let curStreakBPM = [0,0,0,0];
    let maxStreak = [0,0,0,0];
    let maxStreakBPM = [0,0,0,0];

    let canvasLarge = null;    // buffer used for full resolution graph
    // MOVED TO config.js: const DEFAULTGRAPHMAG = 0.32;
    // MOVED TO config.js: const MAXGRAPHMAG = 3;
    let graphMag = DEFAULTGRAPHMAG;
    let graphOffset = {x:0, y:0};

    let freePlayDragIndex = -1;
    let showFreePlayHidden = false;

    // MOVED TO config.js: let runHistory = null;
    let freePlayPresetIndex = -1;
    // MOVED TO config.js: let freePlay = [...]

    let curPresetName = "";
    let curPresetIndex = -1;
    let keyboardStatus = 'disconnected';
    // MOVED TO config.js: const meterChoices = ["2", "4", "8", "16", "32"];
    // MOVED TO config.js: const sw8Choices = ["sw8", ""];
    let meter = "4";

    // metronome variables
    let metroBPM = 120;
    let metroBeat = 4;
    let nextTickTime = 0; // When the next tick is scheduled to play
    let tickInterval = 0; // The interval between ticks, based on BPM
    let metronomeRunning = false; // Whether the metronome is currently running
    let metroSmart = false;  // if true, use smart metronome that auto-adjusts based on quality of runs
    let metroSmartExtra = 0;  // this holds how many "extra BPM" are added based on quality
    let metroExpanded = false;

    const personalBest = {};
    const personalBestDate = {};

    let totalReps = {};  // generateSkillMap computes total success reps based on preset name, used for display.

    // skill map variables
    // MOVED TO config.js: const skillMapSectionCollapsed = {...};

    // Array of presets
    let presets = [];

    let dayChartPie = null;

    // MOVED TO config.js: let keyboardOptions = {...};

    // busy indicator
    let isBusy = false;
    let priorIsBusy = false;

    let priorRunEval = null;

    let totNotesInSelection = [0,0];

// Global object to store preferences
// MOVED TO config.js: const preferences = {...};

let whiteNoiseStarted = false;  // used for certain bluetooth speakers that sleep, this keeps them awake

function cycleConstDur() { sco
  if (testOptions.constDur === false) {
    return; // we don't allow changing the meter if there are different durations of note.
            // this feature only really applies to things like scales and arps that have same note values
  }
  const dd = document.getElementById("constDurDiv");
  const durChoices = [ 1/32, 1/16, 3/32, 1/8, 3/16, 1/4, 3/8, 1/2, 3/4, 1 ];

  for (let i = 0; i < durChoices.length; i++) {
      if (parseFloat(testOptions.constDur) === durChoices[i]) {
        testOptions.constDur = durChoices[(i+1)%durChoices.length];
        break;
      }
  }

  durationsToPlay[0] = durationsToPlay[1] = [testOptions.constDur];

  updateDisplayedNotesToPlay();
  document.getElementById("constDurDiv").innerHTML = "<i class=\"fa-solid fa-arrow-rotate-right\"></i>c="+durUnicode(testOptions.constDur);
}

function cycleMeter() {
  if (testOptions.constDur === false) {
    return; // we don't allow changing the meter if there are different durations of note.
            // this feature only really applies to things like scales and arps that have same note values
  }
  const md = document.getElementById("meterDiv");

  for (let i = 0; i < meterChoices.length; i++) {
    if (meter === meterChoices[i]) {
      meter = meterChoices[ (i+1)%meterChoices.length];
      md.innerHTML = meter;
      break;
    }
  }
  md.innerHTML = "<span style=font-size:small;color:gray;display:inline-block;><i class=\"fa-solid fa-arrow-rotate-right\"></i></span>" + meter;
  testOptions.beatDur =  (1/parseInt(meter));
  updateDisplayedNotesToPlay();
}

function cycleBeatsPerBar() {
  if (testOptions.constDur === false) {
    return; // we don't allow changing this if there are different durations of note.
            // this feature only really applies to things like scales and arps that have same note values
  }
  const bpb = document.getElementById("beatsPerBarDiv");
  const beatsPerBarChoices = [1,2,3,4,5,6,8,12]; // in theory it could be anything but this is enough for now

  for (let i = 0; i < beatsPerBarChoices.length; i++) {
    if (testOptions.beatsPerBar === beatsPerBarChoices[i]) {
      testOptions.beatsPerBar = beatsPerBarChoices[ (i+1)%beatsPerBarChoices.length];
      bpb.innerHTML = "<span style=font-size:small;color:gray;display:inline-block;><i class=\"fa-solid fa-arrow-rotate-right\"></i></span>"+testOptions.beatsPerBar;
      updateDisplayedNotesToPlay();
      metroBeat = testOptions.beatsPerBar;
      drawMetronomeIndicators();
      return;
    }
  }
}

let keyboardHidden = false;

function hideOrDisplayKeyboard() {
  const button = document.getElementById("keyboardCollapseExpandButton");
  const div = document.getElementById("keyboardAndPresetsDiv")
  if (keyboardHidden) {
    button.innerHTML= "<i class=\"fa-solid fa-minimize\"></i>"; // collapse
    div.style.display = "inline-block";
    button.style.transform = "";
  } else {
    button.innerHTML= M["keyboard"]; // keyboard
    div.style.display = "none";
    button.style.transform = "translateX(55vw)";
  }
  keyboardHidden = !keyboardHidden;
}

function clearNotesToPlaySelection() {
  noteScope[0].first = noteScope[1].first = 0;
  noteScope[0].last = notesToPlay[0].length-1;
  noteScope[1].last = notesToPlay[1].length-1;
  removeTrailingRestsFromNoteScope();
  recolorNoteScope(0);
  recolorNoteScope(1);
  computeBeatsToPlay();
  clearAllBarPresetButtons();
  setFavoriteIcon(false);
}

// MOVED TO skillmap.js: function showSkillMap()

function showHelp(helpdiv) {
  console.log("showHelp:"+helpdiv);
  animateOpen(helpdiv);
}

// MOVED TO ui.js: function animateOpen(divelement, delay=0)
// MOVED TO ui.js: function animateClose(divelement)

// MOVED TO daychart.js: function showDayChart()
// MOVED TO daychart.js: function updateDayChartNote(event)

function hideSkillMap() {
  document.getElementById("skillMapContainer").style.display = "none";
}

// MOVED TO storage.js: function showPrefs(show)
// MOVED TO storage.js: function closePrefs()

// MOVED TO storage.js: function togglePref(prefName, forcevalue = null, toggleIcon = null)

// MOVED TO storage.js: function setPref(prefName, value)
// MOVED TO storage.js: function setVoiceIconColor()

let summary = null;

// MOVED TO storage.js: function loadPrefs()

// set colors
// MOVED TO config.js: const bodyColor = ...
// MOVED TO config.js: const bodyAlertColor = ...
// MOVED TO config.js: const staffColor = ...
// MOVED TO config.js: const staffScrollbarThumbColor = ...
// MOVED TO config.js: const staffScrollbarTrackColor = ...
// MOVED TO config.js: const statsColor = ...
// MOVED TO config.js: const togglePrefColor = ...

document.addEventListener('DOMContentLoaded', function () {

  document.body.style.backgroundColor = bodyColor;
  document.getElementById("statsArea").style.backgroundColor = statsColor;
  document.getElementById("staffArea").style.backgroundColor = staffColor;
  document.getElementById("staffArea").style.scrollbarColor = staffScrollbarThumbColor+" "+staffScrollbarTrackColor;
  document.getElementById("consoleTD").style.backgroundColor = statsColor;

  setInterval(function() {
    // keep the status of the keyboard up to date based on incoming keys pressed.
    drawPianoKeyboard(keyboardOptions);
    // update the busy indicator
    updateBusyIndicator();
  }, 40);

  summary = document.getElementById("runSummary");
  summary.innerHTML="";
  changeSelectedHand('both');

  let syms = "";
  for (let key in M) {
    if (M.hasOwnProperty(key)) {
      syms += M[key];
    }
  }
  syms += "";
  message("symbols:<span class=mf style=font-size:32px>"+syms+"<span>");
  message("symbols2:<span class=mf style=font-size:24px><i class=\"fa-regular fa-rectangle-xmark\"></i>&#x1F5E3;<span>");

// JavaScript code for restoring
const restoreButton = document.getElementById("restoreButton");

restoreButton.addEventListener("click", function() {
    const importedJSON = importExportTextarea.value;
    restoreRunHistoryFromJSON(importedJSON);
});

// Wire up the file import input
document.getElementById('importBackup').addEventListener('change', handleImportFileSelect, false);

// initialize history

setTimeout(async function() {
  // Initialize IndexedDB first
  console.log("Initializing IndexedDB...");
  try {
    await initIDB();
    console.log("IDB initialized successfully");
  } catch (error) {
    console.error("Failed to initialize IDB:", error);
    alert("Failed to initialize database. The application may not work correctly.");
    return;
  }
  
  // Load runHistory from IDB
  await loadRunHistory(true);
  loadFreePlay(); // Load freePlay items from runHistory and rebuild preset menu
  checkBackupStatus();
  updateMetronome();
  
  // Initialize Vimsy integration (if available)
  if (typeof initVimsy === 'function') {
    initVimsy();
  } else {
    console.warn('Vimsy integration not loaded');
  }

  console.log("Last preset selected:" + runHistory[".PREF.LASTPRESETSELECTED"]);
  if (isAvail(runHistory[".PREF.LASTPRESETSELECTED"])) {
    gotoPreset(runHistory[".PREF.LASTPRESETSELECTED"]); // by default start with the last thing that was loaded
  } else {
    handlePresetSelection(presets.length-1); // just select the last test mode
  }
}, 500);


});

// MOVED TO config.js: const lastBackupKey = 'REPiano.lastBackupTimestamp';

// MOVED TO storage.js: function checkBackupStatus()

// MOVED TO storage.js: function handleImportFileSelect(evt)

// MOVED TO storage.js: function restoreRunHistoryFromJSON(importedJSON)

// MOVED TO freeplay.js: function freePlayDescription(name)

function presetCategory(name) {
  const pre = presets.find(p => p.name === name);

  if (isAvail(pre)) {
    return pre.category;
  }

  const fp = freePlay.find(p => p.name === name);

  return fp?fp.category:null;
}

function stripPresetModifiers(name) {
  if (!isAvail(name)) {
    console.trace();
    return name;
  }
  name = name.replace(/ B[0-9]+$/,'');
  name = name.replace(/ B[0-9]+-[0-9]+$/,'');
  if (name.endsWith("Oct)")) {
    name = name.slice(0,-8);
  }
  return name;
}

function gotoPreset(name, dismissDiv=null, barRange=null, lfirst=-1, llast=-1, rfirst=-1, rlast=-1) {

  busyIndicator(true);

  // do the rest of the function a short time later so busy indicator shows up
  setTimeout(function() {
    let index = presets.findIndex(preset => preset.name===name);

    if (index === -1 && name.endsWith("Oct)")) {
      for (let oct = 1; index===-1 && oct <= 4; oct++) {
        const name2 = name.slice(0,-6)+String(oct)+" Oct)";
        index = presets.findIndex(preset => preset.name===name2);
      }
    }

    if (index != -1) {
      handlePresetSelection(index, barRange, lfirst, llast, rfirst, rlast);
    } else {
      console.log("Could not find preset: /"+name+"/"+((barRange!==null)?barRange:""));
      alert("Preset not found: "+name+((barRange!==null)?barRange:""));
    }

    if (dismissDiv !== null) {
      if (typeof dismissDiv === 'string') {
        dismissDiv = document.getElementById(dismissDiv);
      }
      dismissDiv.style.display = 'none';
    }
    busyIndicator(false);
  }, 50);

}

// Function to handle preset selection

function handlePresetSelection(presetIndex, barRange=null, lfirst, llast, rfirst, rlast) {
  //console.log("in handlePresetSel");
  let selectedPreset = -1;

  if (presetIndex >= 0 && presetIndex < presets.length) {
    curPresetIndex = presetIndex;
    selectedPreset = presets[presetIndex];

    curPresetName = avail(presets[presetIndex].name, "Unknown Preset");

    runHistory[".PREF.LASTPRESETSELECTED"] = curPresetName;
    saveRunHistory();
    console.log("LASTPRESETSELECTED set to:"+curPresetName);

    if (avail(presets[presetIndex].isFreePlay, false)) {
      // special handling, there are no notes.
      notesToPlay = [null, null];
      barAnnotations = null;
      updateSelectableHands(false, false, false);
      fingersToPlay = [];
      durationsToPlay = [];
      testOptions = {
        category: presets[presetIndex].category,
        graphOrder: "note",
        swingEighths: false,
        beatsPerBar: 4,
        originalBeatsPerBar: 4,
        beatDur: 1/4,
        originalBeatDur: 1/4,
        targetBPM: 120,
        maxBPM: 2000,
        disconnectDur: 0,
        constDur: true,
        originalConstDur: true, // in case user changes it we can log data under different name
        midiVoice: avail(selectedPreset.midiVoice, 0), // default is grand piano
        octaveParams: null,
        shortName: presets[presetIndex].name,
        fullName: presets[presetIndex].description,
        isFreePlay: true,
        learningSchedule: avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(curPresetName)], "begin")
      };

      updateDisplayedNotesToPlay();

      document.getElementById("barSelectContainer").innerHTML = '';
      document.getElementById("scaleModContainer").style.display = "none";

      setLearningSchedule(testOptions.learningSchedule);

      document.getElementById("selectedPresetDisplay").innerHTML =
          avail(selectedPreset.menuName, selectedPreset.name);

      return;
    }

    // Update notesToPlay with the selected preset's notes
    processNotes(selectedPreset.leftHand);
    processNotes(selectedPreset.rightHand);
    notesToPlay = [selectedPreset.leftHand, selectedPreset.rightHand];

    //console.log("Set hands");

    // Update bar annotations, if any
    if (isAvail(selectedPreset.barAnnotations)) {
      barAnnotations = selectedPreset.barAnnotations;
      //console.log("Bar Annotations found");
    } else {
      barAnnotations = null;
      //console.log("Bar Annotations NOT found");
    }

    //console.log("Set bar annotations");
    // Auto-select a hand if only one is available

    if (selectedPreset.leftHand === null || selectedPreset.leftHand.length === 0) {
      updateSelectableHands(false, true, false);
      changeSelectedHand('right');
    } else if (selectedPreset.rightHand === null || selectedPreset.rightHand.length === 0) {
      updateSelectableHands(true, false, false);
      changeSelectedHand('left');
    } else {
      updateSelectableHands(true, true, true);
      changeSelectedHand('both');
    }

    //console.log("Set avail hands");

    fingersToPlay = [];
    fingersToPlay[0] = avail(selectedPreset.leftFingers, []);
    fingersToPlay[1] = avail(selectedPreset.rightFingers, []);

    const f = localStorage.getItem("FINGEREDITS."+curPresetName);
    if (isAvail(f)) {
      fingerEdits = JSON.parse(f);
      for (let i = 0; i < fingerEdits.length; i++) {
        fingersToPlay[fingerEdits[i].h][fingerEdits[i].n] = fingerEdits[i].f;
      }
    }

    durationsToPlay = [];
    durationsToPlay[0] = avail(selectedPreset.leftDur, [1/4]);
    durationsToPlay[1] = avail(selectedPreset.rightDur, [1/4]);
    holdsToPlay = [];
    holdsToPlay[0] = avail(selectedPreset.leftHold, null);
    holdsToPlay[1] = avail(selectedPreset.rightHold, null);

    let constDurFound = true;
    let dursFound = {};
    let constDurValue = null;

    for (let h = 0; h < 2; h++) {
      for (let d = 0; d < durationsToPlay[h].length; d++) {
        dursFound[durationsToPlay[h][d]] = true;
        constDurValue = durationsToPlay[h][d];
        //console.log("dursFound[]="+durationsToPlay[h][d]);
      }
    }

    // constDur tells us that all the durations of every note (left and right hand) are the same
    // this is used to tell whether we can compute an HTQ score. Although it is possible to compute an
    // HTQ score even when durations are not the same, it is much more complex and we have not yet
    // implemented that. For things like scales and arpeggios, constDur should be true but for
    // more complex songs it typically will not be.

    if (Object.keys(dursFound).length > 1) {
      constDurFound = false;
    }
    //console.log("CONSTDUR="+constDurFound+" numfound:"+Object.keys(dursFound).length+" value="+constDurValue);
    //console.log("Set fingers and durations");

    // in the process of refactoring to bring all the different options into one
    // variable called testOptions.
    //console.log("Setting testopts");
    testOptions = {
      category: avail(selectedPreset.category, "misc"),
      graphOrder: avail(selectedPreset.graphOrder, "note"),
      swingEighths: avail(selectedPreset.swingEighths, false),
      beatsPerBar: avail(selectedPreset.beatsPerBar, 4),
      originalBeatsPerBar: avail(selectedPreset.beatsPerBar, 4),
      beatDur: avail(selectedPreset.beatDur, 1/4),
      originalBeatDur: avail(selectedPreset.beatDur, 1/4),
      targetBPM: avail(selectedPreset.targetBPM, 120),
      maxBPM: avail(selectedPreset.maxBPM, 2000),
      disconnectDur: avail(selectedPreset.disconnectDur, 10),
      constDur: constDurFound?constDurValue:false,
      originalConstDur: constDurFound?constDurValue:false, // in case user changes it we can log data under different name
      midiVoice: avail(selectedPreset.midiVoice, 0), // default is grand piano
      octaveParams: avail(selectedPreset.octaveParams, null),
      fullName: avail(selectedPreset.fullName,null),
      isFreePlay: avail(selectedPreset.isFreePlay, false),
      learningSchedule: avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(curPresetName)], "begin")
    };

    if (testOptions.octaveParams !== null) {
      changeOctave(testOptions.octaveParams);
      displayOctaveStats(curPresetName, testOptions);
    } else {
      changeOctave(null);
    }

    //console.log("in NON-freeplay section of handlePreset, learningSchedule=/"+testOptions.learningSchedule);
    setLearningSchedule(testOptions["learningSchedule"]);

    displayTargetBPM(false);

    let cycleindicator = "";
    if (testOptions.constDur) {
      cycleindicator = "<span style=font-size:small;color:gray;display:inline-block;><i class=\"fa-solid fa-arrow-rotate-right\"></i></span>";
    }
    document.getElementById("meterDiv").innerHTML = cycleindicator + (1/parseFloat(testOptions.beatDur));
    document.getElementById("sw8Div").innerHTML = (testOptions.swingEighths?"sw8":"");
    document.getElementById("beatsPerBarDiv").innerHTML = cycleindicator + (testOptions.beatsPerBar);
    if (testOptions.constDur) {
      document.getElementById("constDurDiv").innerHTML = cycleindicator+"c="+durUnicode(testOptions.constDur);
    } else {
      document.getElementById("constDurDiv").innerHTML = "";
    }

    updateDisplayedNotesToPlay();

    // compute the number of beats in the left and right hands
    computeBeatsToPlay();

    // this preset has custom metrics settings
    if (isAvail(selectedPreset.metrics)) {
      const mets = ['HTQ', 'MetQ', 'DynQ', 'LegQ', 'StaQ'];
      const custmets = selectedPreset.metrics;

      for (let i = 0; i < mets.length; i++) {
        if (isAvail(custmets[mets[i]])) {
          togglePref('score'+mets[i], custmets[mets[i]]);
          //console.log("Set custom metric:"+mets[i]+"="+custmets[mets[i]]);
        }
      }
    }
  }
  setNoteFilters();

  sayTestParameters();

  clearStats(); // when changing to a new preset, clear the stats.

  loadTodayStats();

  setFavoriteIcon(false); // there is no selection

  if (barRange !== null) {
    setTimeout(function() {
      changeBarScope(barRange, lfirst, llast, rfirst, rlast)},
      10); // need the delay to ensure all elements are created in ntp_ objects
  }

  //document.getElementById("PresetMenu").value = presets[presetIndex].menuValue;
  document.getElementById("selectedPresetDisplay").innerHTML = avail(selectedPreset.menuName, selectedPreset.name);

  metroBeat = testOptions.beatsPerBar;
  drawMetronomeIndicators();
}

function displayOctaveStats(name, opts) {
  console.log("octavestats: "+name);
}

function sayTestParameters(shortform=false) {
  const hand = getSelectedHand();

  if (!shortform) {
    if (testOptions.fullName !== null) {
      say(testOptions.fullName, false, "TESTNAME");
    } else {
      say(curPresetName, false, "TESTNAME");
    }
    setTimeout(function() { displayPriorRunStats(); }, 500);
  }

  if (hand !== "both") {
    say(hand+" hand only", false, "TESTNAME");
  } else {
    say("hands together", false, "TESTNAME");
  }

  computePriorStreakData();

  if (BPMRecommendedRange[0] > 0) {
      say("Recommended max speed "+spokenNumber(BPMRecommendedRange[1]), false, "TESTNAME");
      setMetroBPM(Number(BPMRecommendedRange[1]), true);
  } else {
      setMetroBPM(avail(testOptions.targetBPM, metroBPM), true); // set to target if there is one, else leave it the same
  }

}

////////////////////// Speed Synthesis V2 ///////////////////////////////////////////
// MOVED TO voice.js: const speechQueue = [];
// MOVED TO voice.js: let isSpeaking = false;

// MOVED TO voice.js: async function enqueueSpeech(words, classification = null, options = {})
// MOVED TO voice.js: async function speakNextInQueue()
// MOVED TO voice.js: function cancelSpecificClassification(classification)

// MOVED TO voice.js: function startWhiteNoise(volume = 0.5) { ... }

// MOVED TO voice.js: async function say(words, force = false, classification = null)
// MOVED TO voice.js: function say_noqueue(words, force = false)
// MOVED TO voice.js: function resetVoiceAPI()

/////////////////////END OF SPEECH SYNTH////////////////////////////////////////

function changeOctave(octaveParams) {
  if (octaveParams === null) {
    // this means octave choices should not be offered
    document.getElementById("scaleModContainer").style.display = "none";
    return;
  }
  document.getElementById("scaleModContainer").style.display = "block";
  let buttonDisplay;

  if (typeof octaveParams === "number" && isAvail(testOptions.octaveParams)) {
    // if we get a plain number, it means change the current scale/arp to the given number of
    // octaves

    // IMPLEMENT: Note that we should not really generate a new set of test data for every change, we
    // should be looking first to see if the given params are already in the presets menu and
    // if so just set that one. But in practice this won't hurt anything unless someone
    // clicks thousands of octave changes in a single session.

    let lhOctave;
    if (octaveParams === 1 || octaveParams === 2) {
      lhOctave = 3;
    } else {
      lhOctave = 2;
    }
    const p = generateScalePreset(testOptions.octaveParams.noteName,
                        testOptions.octaveParams.scaleType,
                        octaveParams,
                        lhOctave,
                      );
    console.log("ChangeOctaves generating new octave params:"+testOptions.octaveParams.noteName+" "+
      testOptions.octaveParams.scaleType+" "+lhOctave+" "+octaveParams);
    buttonDisplay = octaveParams;
    presets.push(p);
    handlePresetSelection(presets.length-1);
    curPresetName = avail(presets[presets.length-1].name, "Unknown Preset");
    console.log("ChangeOctave: preset name set to: "+curPresetName);
    return;

  } else {
    console.log("ChangeOctaves: setting choices to "+testOptions.octaveParams.numOctaves);
    buttonDisplay = testOptions.octaveParams.numOctaves;
  }
  for (let oct = 1; oct <= 4; oct++) {
      const elem = document.getElementById("oct"+oct);
      elem.classList.remove('selected');
      const presetname = curPresetName.slice(0,-6) + oct + " Oct)";
      console.log("CHANGEOCT: curpresetname:"+curPresetName+" new:"+presetname);
      if (Object.keys(totalReps).length > 0) {
        elem.innerHTML = oct+" Oct "+
            "<span style=font-size:x-small;color:purple>&#119046;</span><span style=font-size:small;color:purple>"+
            avail(totalReps[presetname],0)+"</span>";
      } else {
        elem.innerHTML = oct+" Oct";
      }

  }
  document.getElementById("oct"+buttonDisplay).classList.add('selected');
  console.log("ChangeOctaves: set display to:"+ buttonDisplay);

  clearStats();
  loadTodayStats();
}

function toggleDisplay(elementId, event=null, block="block") {
  const element = document.getElementById(elementId);
  if (element.style.display === 'none' || getComputedStyle(element).display === 'none') {
    element.style.display = block;
    console.log("toggled display of "+elementId+ " to:"+block);
  } else {
    element.style.display = 'none';
    console.log("toggled display of "+elementId+ " to:none");
  }
  if (event !== null) {
    event.stopPropagation();
    console.log("toggleDisplay stopped propagation using event:"+event.type);
  }
}

let curDisplayedBPMFrac = 1;

function updateTargetBPM() {
  curDisplayedBPMFrac = document.getElementById("targetBPMPlayRange").value/100;
  document.getElementById("curDisplayedBPM").innerHTML =
    Math.trunc(curDisplayedBPMFrac*testOptions.targetBPM)+
    "="+durUnicode(testOptions.beatDur);
  document.getElementById("curDisplayedBPMFrac").innerHTML =
    Math.trunc(curDisplayedBPMFrac*100)+"%";
}

let curGraphPlaySpeed = 1;

function updateGraphPlaySpeed() {
  curGraphPlaySpeed = document.getElementById("targetGraphPlaySpeed").value/100;
  document.getElementById("playGraphNotesSpeed").innerHTML =
    Math.trunc(curGraphPlaySpeed*100)+"%";
}

function displayTargetBPM(advance=false) {
  document.getElementById("targetBPMDiv").innerHTML =
    "<div style=padding-left:2px;padding-right:2px;font-size:x-small;line-height:0.9;text-align:center;color:green>"+
      "<span id=curDisplayedBPM class=mf style=font-size:small></span>"+
      "<br><span style=font-size:x-small id=curDisplayedBPMFrac></span>"+
      "<input type=range id=targetBPMPlayRange oninput='updateTargetBPM(true);' "+
        " onchange='toggleDisplay(\"targetBPMPlayRange\", event);' "+
        " onclick='event.stopPropagation();'"+
        " style=width:150px;display:none min=20 max=150 step=10 value=100>"+
    "</div>";
    setTimeout(updateTargetBPM,0);
}

function computeBeatsToPlay() {
  beatsToPlay = [0,0];

  //console.log("ComputeBeatsToPlay beatDur="+testOptions.beatDur);

  totNotesInSelection = [0,0];
  for (let h = 0; h < 2; h++) {
    for (let n = noteScope[h].first; n <= noteScope[h].last; n++) {
      beatsToPlay[h] += durationsToPlay[h][n%durationsToPlay[h].length]/testOptions.beatDur;
      if (isChord(notesToPlay[h][n])) {
        for (let c = 0; c < notesToPlay[h][n].length; c++) {
          if (notesToPlay[h][n][c] !== RESTNOTE) {
            totNotesInSelection[h]++;
          }
        }
      } else if (notesToPlay[h][n] !== RESTNOTE) {
        totNotesInSelection[h]++;
      }
    }
  }
  document.getElementById("selectedNotesCount").innerHTML =
    '<i class="fa-regular fa-hand" style=transform:scaleX(-1)></i>'+
    totNotesInSelection[0]+
    '+<i class="fa-regular fa-hand"></i>'+
    totNotesInSelection[1] + "=" +
    (totNotesInSelection[0]+totNotesInSelection[1]);
}

// substitute string versions of notes with midi numbers
function processNotes(notes) {
  for (let i = 0; i < notes.length; i++) {
    const nt = typeof notes[i];
    if (nt === 'string') {
      //console.log("Translating note:"+notes[i]+" to number:"+noteToMidiNumber(notes[i]));
      notes[i] = noteToMidiNumber(notes[i]);
    } else if (isChord(notes[i])) {
      for (let c = 0; c < notes[i].length; c++) {
        const nt = typeof notes[i][c];
        if (nt === 'string') {
          //console.log("Translating note:"+notes[i]+" to number:"+noteToMidiNumber(notes[i]));
          notes[i][c] = noteToMidiNumber(notes[i][c]);
        }
      }
    }
  }
  return notes;
}

function noteToMidiNumber(note) {

  if (typeof note === 'number') {
    return note; // it's already a number
  }
  if (note === '-1') {
    return -1; // special case
  }
  // Define a map of note names to MIDI note numbers
  const noteMap = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };

  // Split the input note into note name and octave
  const match = note.match(/^([A-Ga-g#b]+)(\d+)$/);
  if (match) {
    const noteName = match[1].toUpperCase();
    const octave = parseInt(match[2], 10);

    if (noteMap.hasOwnProperty(noteName)) {
      // Calculate the MIDI note number based on the note name and octave
      return noteMap[noteName] + 12 * (octave + 1);
    }
  }

  // invalid input
  return null;
}

// these helper functions make code to test if a value is defined and set to non-null
// cleaner looking.
function avail(item, defaultValue = null) {
  if (typeof item !== 'undefined' && item !== null) {
    return item;
  }
  return defaultValue;
}

// boolean version of avail(), useful for if statements
function isAvail(item) {
  // the item===item tests for NaN
  if (typeof item !== 'undefined' && item !== null && item === item) {
    return true;
  }
  return false;
}

function limitNumber(inputElement) {
    if (inputElement.value.length > 4) {
        inputElement.value = inputElement.value.slice(0, 4);
    }
}

async function logFreePlayManualTime() {
  console.log("logFreePlayManualTime");
  let value = document.getElementById("freePlayManualInput").value;

  value = avail(value, 0);

  await logFreePlay(value*60*1000, true);  // the time value is minutes, stored in milliseconds
  console.log("Manual time logged successfully");
  document.getElementById("freePlaySaveMessage").innerHTML = "Saved &check;";
  setTimeout(function() {
    document.getElementById("freePlaySaveMessage").innerHTML = "";
  }, 5000);

}

function getTodayFreePlayTime() {
  const runName = todayDate() + "|" + "Free Play:"+testOptions.shortName + "|" + "NA";
  if (isAvail(runHistory[runName])) {
    const t = avail(runHistory[runName].wallTime,0)
    testOptions.wallTimeToday = t;
    testStartTime = Date.now() - testOptions.wallTimeToday;
      return Math.trunc(t/6000)/10; // minutes to 1 decimal place accuracy
  } else {
    console.log("FREEPLAYTIME runhistory for "+runName+" not found");
    return 0;
  }
}

// some functions to handle long clicks on notes

let ntpLongPressTimer = [];
const ntpLongPressTime = 1000;
let ntpLongPressStartPos = null;

function setNTPLongPressTimer(event, hand, note) {
  event.preventDefault();
  console.log("setNTPLongPressTimer:"+event.target.id);
  ntpLongPressTimer[hand+"_"+note] = setTimeout(()=>
    {
      editFingering(event, hand, note);
    }, ntpLongPressTime
  );
  if (isAvail(event.touches)) {
    ntpLongPressStartPos = {x:event.touches[0].clientX, y:event.touches[0].clientY};
  } else {
    ntpLongPressStartPos = null;
  }
}

function cancelNTPLongPressTimer(event, hand, note) {
  //console.log("cancelLongPress:" + event.target.id + " h:" + hand + " note:" + note);
  const key = hand + "_" + note;
  if (ntpLongPressStartPos !== null && isAvail(event.touches)) {
    //console.log("x:"+event.touches[0].clientX+" ntpx:"+ntpLongPressStartPos.x);
    const maxMoveAllowed = 5; // pixels
    if (Math.abs(event.touches[0].clientX - ntpLongPressStartPos.x) <= maxMoveAllowed &&
        Math.abs(event.touches[0].clientY - ntpLongPressStartPos.y) <= maxMoveAllowed) {
      //console.log("Short move, no cancel");
      return; // finger did not move very much so don't cancel yet
    }
  }
  //console.log("Cancelling longpress, moved");
  ntpLongPressStartPos = null;
  if (isAvail(ntpLongPressTimer[key])) {
    clearTimeout(ntpLongPressTimer[key]);
    ntpLongPressTimer[key] = false;
  }
}

function clearEditingNote() {
  // Remove green outline from any previously edited note
  const previouslyEditedNote = document.querySelector('.note-editing');
  if (previouslyEditedNote) {
    previouslyEditedNote.classList.remove('note-editing');
  }
}

function clearNTPLongPressTimer(event,hand,note) {
  console.log("clearNTPLongPressTimer:"+event.target.id+" h:"+hand+" note:"+note);
  const key = hand+"_"+note;

  if (ntpLongPressTimer[key] !== "longclick") {
    console.log("handling togglenotescope click");
    toggleNoteScope(event, hand, note);
    clearTimeout(ntpLongPressTimer[key]);
    ntpLongPressTimer[key] = null;
    ntpLongPressStartPos = null;
  }
}

function toggleNoteScopeIfNoLongPress(event, h, n) {
  if (ntpLongPressTimer[h+"_"+n] === "longclick") {
    console.log("long press executed, skipping toggle notescope");
    return;
  }
  console.log("handling togglenotescope click");
  toggleNoteScope(event, h, n);
}

function editFingering(event, hand, note) {
  console.log("editing fingering for " + hand + "_" + note);
  ntpLongPressTimer[hand + "_" + note] = "longclick";

  const popup = document.getElementById('fingeringPopup');
  const noteElement = event.target;

  // Remove green outline from any previously edited note
  const previouslyEditedNote = document.querySelector('.note-editing');
  if (previouslyEditedNote) {
    previouslyEditedNote.classList.remove('note-editing');
  }

  // Add green outline to the currently edited note
  noteElement.classList.add('note-editing');

  // Temporarily make the popup visible to compute its dimensions
  popup.style.visibility = 'hidden';
  popup.style.display = 'block';

  const rect = noteElement.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();

  // Calculate the initial position
  let left = rect.left + window.scrollX;
  let top = rect.top + rect.height + window.scrollY;

  // Adjust position to keep the popup within the viewport
  if (left + popupRect.width > window.innerWidth) {
    left = window.innerWidth - popupRect.width - 10; // 10px padding from the edge
  }
  if (left < 0) {
    left = 10; // 10px padding from the edge
  }
  if (top + popupRect.height > window.innerHeight) {
    top = rect.top - popupRect.height + window.scrollY;
  }
  if (top < 0) {
    top = 10; // 10px padding from the edge
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  // Now fully show the popup
  popup.style.visibility = 'visible';

  // Store the clicked element's id for later use
  popup.dataset.clickedElementId = noteElement.id;
  popup.dataset.hand = hand;
  popup.dataset.note = note;
}



function confirmFingerSelection(fingerNumber) {
    const popup = document.getElementById('fingeringPopup');
    const hand = popup.dataset.hand;
    const note = popup.dataset.note;

    // Call the setFinger function with the selected finger number and the clicked element's id
    console.log("Setting finger to f="+fingerNumber);
    console.log("hand="+hand+" note="+note);

    if (hand >=0 && hand <= 1 && note >= 0 && note < notesToPlay[hand].length) {
      if (!isAvail(fingersToPlay[hand])) {
        fingersToPlay[hand] = [];
      }
      console.log("set complete");
      fingersToPlay[hand][note] = fingerNumber;

      // save fingerEdits to history
      // IMPLEMENT: should remove or perhaps replace any prior edit to this same note
      fingerEdits.push({h:hand,n:note,f:fingerNumber});
      localStorage.setItem("FINGEREDITS."+curPresetName, JSON.stringify(fingerEdits));
      console.log("stored fingeredits:"+fingerEdits);

      const saveScope = JSON.stringify(noteScope);
      updateDisplayedNotesToPlay(false, true); // redraw to show the fingering but don't reset notescope
      noteScope = JSON.parse(saveScope);
      recolorNoteScope(0);
      recolorNoteScope(1);
    }

    // Hide the popup
    popup.style.display = 'none';

    clearEditingNote();
}

function updateDisplayedNotesToPlay(isErrorMap = false, keepNoteScope=false) {

  if (testOptions.isFreePlay) {

        const timesofar = getTodayFreePlayTime();
        document.getElementById("noteDisplayAreaMenuDiv").style.display = "none";
        document.getElementById("timeSigDiv").style.display = "none";

        document.getElementById("notesRH").innerHTML =
           "<p style=font-size:x-large;padding-left:20px>Free Play: "+
              testOptions.shortName+"<br>"+testOptions.fullName+"</p>"+
           "<br><div style=display:flex;align-items:center>"+
           "<span style=padding-left:20px>Manually set minutes:&nbsp;</span>"+
           "<input id=freePlayManualInput type=number value='"+timesofar+
                "' min=0 max=99 step=0.1 style=width:5em;text-align:center;background-color:rgba(255,255,255,0.5)>"+
           "&nbsp;<button onclick=logFreePlayManualTime() style=background-color:rgba(255,255,255,0.5)>SAVE</button>"+
           "<span id=freePlaySaveMessage></span>"+
           "</div>"+
           "<p style=padding-left:20px>Note: Free Play time data is not logged unless clock is started then stopped or a manual time is entered.<br>Manual entries REPLACE data for today. Clock times ADD to data for today.</p>";
        document.getElementById("notesLH").innerHTML = "";
        document.getElementById("labelLH").style.display = "none";
        document.getElementById("labelRH").style.display = "none";
        document.getElementById("labelRepStats").style.display = "none";
        return;
  }

  document.getElementById("noteDisplayAreaMenuDiv").style.display = "inline-block";
  document.getElementById("timeSigDiv").style.display = "flex";
  document.getElementById("labelLH").style.display = "inline-block";
  document.getElementById("labelRH").style.display = "inline-block";
  document.getElementById("labelRepStats").style.display = "inline-block";

  const prefix = isErrorMap?"err_":"";

  maxBar = 0;
  noteStartBeat = [[],[]]; // beat number each note starts on, may be fractional
  let needbarreps = true;

  for (let h = 1; h >=0; h--) {
    let notepr = "";
    let totbeats = 0;
    let barnum = -1;
    let excessbeats = false;
    for (let i = 0; i < notesToPlay[h].length; i++) {
      const dur = durationsToPlay[h][i%durationsToPlay[h].length];

      if (isNaN(totbeats)) {
        console.log("Totbeats is NaN going into computations");
      }
      if ( totbeats / testOptions.beatsPerBar >= barnum ) {
        const priorbar = barnum;
        barnum = 1 + Math.trunc(totbeats / testOptions.beatsPerBar);
        console.log("TOPLOOP: h="+h+" i="+i+"priorBarnum:"+priorbar+" totbeats:"+totbeats+" bpb:"+testOptions.beatsPerBar+" newbarnum:"+barnum+" excess="+excessbeats);
        //console.log("OPEN DIV FOR NEW BAR "+barnum);
        let rel = "";
        rel = "position:relative;";
        // show the bar stroke and bar number
        notepr += "&nbsp;<div id="+prefix+"bar_"+h+"_"+barnum+
                  " style=user-select:none;display:inline-block;"+
                  rel+"><span id="+prefix+"barline_"+h+"_"+barnum+
                  " onclick='toggleNoteScope(event);' style='font-weight:bold;padding-right:6px;'>&nbsp;<sup>"+
                  barnum+"</sup><span style=font-size:larger>|</span></span>&nbsp;";

        if (excessbeats) {
          notepr += "<div id=ntp_tie data-beat="+(Math.trunc(totbeats))+
                      " data-dur="+dur+
                      " style=display:inline-block>&mdash;</div>"; // this tells the user that the last note of the prior bar ties over to this bar
        }
      }

      noteStartBeat[h][i] = totbeats; // this will be used for HTQ and graph display amoung other things
      //console.log("Set startbeat "+h+"-"+i+"="+noteStartBeat[h][i]);

      notepr += " <div id="+prefix+"ntp_"+h+"_"+i+
        " class=mfs style=display:inline-block;line-height:1.8; " +
        //" onclick='toggleNoteScopeIfNoLongPress(event," + h + "," + i + ");' " +
        " onmousedown='setNTPLongPressTimer(event,"+h+","+i+");' "+
        " onmouseup='clearNTPLongPressTimer(event,"+h+","+i+");' "+
        " onmouseleave='cancelNTPLongPressTimer(event,"+h+","+i+");' "+
        " ontouchstart='setNTPLongPressTimer(event,"+h+","+i+");' "+
        " ontouchend='clearNTPLongPressTimer(event,"+h+","+i+");' "+
        " ontouchmove='cancelNTPLongPressTimer(event,"+h+","+i+");' "+
        " data-beat="+totbeats+
        " data-dur="+dur+
        ">";
      if (isChord(notesToPlay[h][i])) {
        notepr += "<strong style=font-size:x-large>{</strong>";
        const ntp = notesToPlay[h][i];
        console.log("updateDisplayedNTP: chordlen:"+ntp.length);
        // IMPLEMENT: if all the chord notes have the same duration this could be simplified on output
        // to putting the note duration outside the curly braces, this would save a bit of horizontal space
        for (let c = 0; c < ntp.length; c++) {
          const height = -(10/(ntp.length-1))*c + 3; // jag each successive note a bit higher to visually show the "chord"
          notepr+="<div style=display:inline-block;font-size:smaller;transform:translateY("+(height)+"px)>"
            +prnotenum(ntp[c], h, i, c); // this just shows the letter of the note, not the duration
          let finger = null;
          if (ntp[c] != RESTNOTE && isAvail(fingersToPlay)) {
            if (isAvail(fingersToPlay[h]) && isAvail(fingersToPlay[h][i])) {
                finger = fingersToPlay[h][i];
              }
              notepr += "<span class=mf>"+fmtFingerDurM(finger, h, i, c)+"</span>";
          }
          notepr+="</div>";
          //notepr += "&nbsp;";
        }
        notepr += "<strong style=font-size:x-large>}</strong>";
      } else { // not a chord, rather, a single note
        notepr += prnotenum(notesToPlay[h][i], h, i);
        let finger = null;
        if (notesToPlay[h][i] !== RESTNOTE && isAvail(fingersToPlay)) {
          if (isAvail(fingersToPlay[h]) && isAvail(fingersToPlay[h][i])) {
              finger = fingersToPlay[h][i];
            }
            notepr += "<span class=mfs>"+fmtFingerDurM(finger, h, i)+"</span>";
        }
      }

      //console.log("FINGERDIR:"+fmtFingerDur(finger, h, i));

      const priortotbeats = totbeats;
      console.log("Totbeats before increment:"+totbeats);
      let thisdur = durationsToPlay[h][i%durationsToPlay[h].length];
      if (isChord(thisdur)) {
        // we will consider a multiduration chord to have a beat of the shortest value
        // since after the shortest value plays at least some of the fingers of that hand move on
        // to the next note
        thisdur = Math.min(...thisdur);
      }
      totbeats += thisdur/testOptions.beatDur;
      if (isNaN(totbeats)) {
        console.log("Totbeats is NaN after inc: test.beatdur="+testOptions.beatDur+" dtp:"+thisdur);
      }
      // IMPLEMENT: a duration of 0 makes this a "grace note" and that might require special handling
      // in a number of different places, this is still being worked on

      //console.log("h"+h+"n"+i+" totbeats:"+totbeats+" beats/bar:"+testOptions.beatsPerBar);

      if ( totbeats / testOptions.beatsPerBar >= barnum || i === notesToPlay[h].length-1 ) {

        // if the final note of the bar was larger than needed to fill out this bar, that means it must
        // split across bars (i.e. a tie is needed, although we don't currently support ties we
        // can still give an indication of this for now)

        excessbeats = ( (totbeats / testOptions.beatsPerBar) !== barnum);

        //console.log("ENDLOOP: h="+h+" i="+i+" totbeats:"+totbeats+" bpb:"+testOptions.beatsPerBar+
            // " barnum:"+barnum+" excess="+excessbeats);
        //console.log("CLOSE DIV FOR BAR "+barnum);
        // if we're at the end of a bar or we're at the last note without the bar ending, close off
        // this bar, add annotations if available, and add reps data if available.
        notepr += "</div>";
        if (h === 1 && isAvail(barAnnotations) && isAvail(barAnnotations[barnum])) {
          notepr += "<div style='position:absolute;bottom:120%;left:10px;font-size:x-small;padding-left:2em'><em>"+barAnnotations[barnum]+"</em></div>";
          //console.log("Added barAnno to bar "+barnum+" text:"+barAnnotations[barnum]);
        }
        if (h === 0) {
          if (needbarreps) {
            //console.log("Computing Bar Reps");
            computeBarReps(); // Get bar level repetition data from history
            needbarreps = false;
          }
          if (!isAvail(barReps[barnum])) {
            barReps[barnum] = [0,0,0];
          }
          notepr += "<div style='position:absolute;top:110%;left:3em;font-size:x-small;'><em><span style=color:blue>"+
                      barReps[barnum][0]+"</span>&nbsp;<span style=color:red>"+
                      barReps[barnum][1]+"</span>&nbsp;<span style=color:purple>"+
                      barReps[barnum][2]+
                      "</span></em></div>";
          //console.log("Added BarReps data:"+" R:"+barReps[barnum][1]+" B:"+barReps[barnum][2]);

        }
      }
      notepr+="</div>";

      maxBar = Math.max(maxBar, Math.ceil(totbeats/testOptions.beatsPerBar));
      if (isNaN(maxBar)) {
        console.log("ERROR: maxBar is NaN after calculation. totbeats="+totbeats+" bpb="+testOptions.beatsPerBar);
      }
    }

    if (isErrorMap) {
      document.getElementById("errorNotes"+(h?"RH":"LH")).innerHTML = notepr;
      continue;
    }
    activeBars = {first:1, last:maxBar};

    // add an extra div for errors that happen at the end, after all legit notes are played
    notepr += "<div id=ntp_"+h+"_error style=display:inline-block>&nbsp;&nbsp;&nbsp;</div>";

    // add a final barline
    notepr += "<div style=display:inline-block>&nbsp;"+M["finalbar"]+"&nbsp;</div>"

    document.getElementById("notes"+(h?"RH":"LH")).innerHTML = notepr;

    // initialize noteScope to all notes.

    if (!keepNoteScope) {
      noteScope = [{first:0,last:notesToPlay[0].length-1}, {first:0,last:notesToPlay[1].length-1}];
      removeTrailingRestsFromNoteScope();
      computeBeatsToPlay();
    }

    //warning("Set notescope:"+noteScope[0].first+":"+noteScope[0].last+":"+noteScope[1].first+":"+noteScope[1].last);
  } // end of for (h...)

  setTimeout(function() {
    // make bars for L and R the same width
    for (let b = 1; b <= maxBar; b++) {
      const lb = document.getElementById(prefix+"bar_0_"+b);
      const rb = document.getElementById(prefix+"bar_1_"+b);
      const lbw = (lb!==null)?parseInt(getComputedStyle(lb).width):0;
      const lbwx = (lb!==null)?parseInt(getComputedStyle(lb).xOffset):0;
      const rbw = (rb!==null)?parseInt(getComputedStyle(rb).width):0;
      const maxtmp = Math.max(lbw,rbw)*1.7;
      const maxw = maxtmp + "px";
      //console.log("barnum="+b+" maxw="+maxw+" lbw:"+lbw+" rbw:"+rbw+" rb:"+rb+" lb:"+lb);

      if (lb === null || rb === null) {
        return;
      }
      lb.style.width = maxw;
      rb.style.width = maxw;

      // Adjust the position of the notes within the bars so they
      // line up based on each note's beat number. If we take maxw, and we know the number of beats in
      // each bar (we do, it's beatsPerBar) then we could move the ntp's within each bar so they line up
      // in terms of beat position.
      // IMPLEMENT: Sometimes this results in very short notes like sixteenths played rapidly next to each
      // other getting squished together. Detecting this and widening the bar would be a good idea. This could
      // be done by looking for overlapping bounding rectangles. You could also perhaps scale
      // the note notation narrower in this case

      const lbn = Array.from(lb.querySelectorAll('[id^="ntp_"]'));
      //console.log("LBN length="+lbn.length);
      const rbn = Array.from(rb.querySelectorAll('[id^="ntp_"]'));
      const allbn = [lbn,rbn];

      let beatoffset = 0;
      const margin = 25;
      let priorbeat = -1;

      for (let hbn = 0; hbn < 2; hbn++) {
        const bn = allbn[hbn]; // one hand's bar notes
        let crushpad = 0;
        for (let i = 0; i < bn.length; i++) {
          const note = bn[i];
          const beat = parseFloat(note.getAttribute('data-beat'));

          //console.log("Got NTP BEAT="+beat);
          if (i === 0) {
            beatoffset = beat;
          }
          const x = (maxtmp-2*margin)*(beat-beatoffset)/testOptions.beatsPerBar + margin + crushpad*15;
          //console.log("Beat:"+beat+" beatoffset:"+beatoffset+" maxw:"+maxw+" b/bar:"+testOptions.beatsPerBar);
          note.style.left = x+"px";
          note.style.bottom = "3px"; // "-6px";
          note.style.position = "absolute";
          //console.log("For bar="+b+" set note id="+note.id+" x="+x);
          const dur = parseFloat(note.getAttribute('data-dur'));
          if (dur === 0) {
            // this is a crushed note. add on to crushpad so it doesn't get overwritten by
            // the next note
            note.style.color = "purple";
            note.style.fontSize = 8+"px";
            crushpad++;
          } else {
            crushpad = 0;
          }
        }

        // find collisions of rectangles of notes, narrow those that collide
        for (let i = 1; i < bn.length; i++) {
          const note = bn[i];
          const priornote = bn[i-1];
          const noteRect = note.getBoundingClientRect();
          const priorRect = priornote.getBoundingClientRect();
          if (priorRect.x+priorRect.width > noteRect.x) {
            priornote.style.transformOrigin = "left";
            const nudge = 0;
            let scale = (noteRect.x-priorRect.x+nudge-1)/(priorRect.width);
            if (scale > 1) scale = 1;
            if (scale < 0.125) scale = 0.125; // this stops "crushed notes" from being too small to read
            priornote.style.transform = "scaleX("+scale+")";
          }
        }
      }
    }
  }, 0);
}



function removeTrailingRestsFromNoteScope() {

  for (let h = 0; h < 2; h++) {
    noteScope[h].lastnonrest = Number(noteScope[h].last);
    while (notesToPlay[h][noteScope[h].last] == RESTNOTE) {
      noteScope[h].last--;
      noteScope[h].lastnonrest = noteScope[h].last;
      if (noteScope[h].last < 0) {
        break;
      }
    }

    noteScope[h].firstnonrest = 0;
    while (notesToPlay[h][noteScope[h].firstnonrest] == RESTNOTE) {
      noteScope[h].firstnonrest++;
      if (noteScope[h].firstnonrest > noteScope[h].last) {
        break;
      }
    }

    noteScope[h].firstrangenonrest = Number(noteScope[h].first);
    while (notesToPlay[h][noteScope[h].firstrangenonrest] == RESTNOTE) {
      noteScope[h].firstrangenonrest++;
      if (noteScope[h].firstrangenonrest > noteScope[h].last) {
        break;
      }
    }
  }
}

function restWithDur(h, i, c=null) {
    let dur = null;

    if (isAvail(durationsToPlay) && isAvail(durationsToPlay[h])
          && durationsToPlay[h].length > 0) {
        dur = durationsToPlay[h][i%durationsToPlay[h].length];
    } else {
      return M["wholerest"]; // we don't know the duration
    }
    dur = parseFloat(dur); // this and the next line canonicalize it as a decimal fraction
    dur = String(dur);
    const durMap = {
      "1":M["wholerest"],
      "1.5":M["wholerest"]+M["dot"],
      "0.5":M["halfrest"],
      "0.875":M["halfrest"]+M["quarterrest"]+M["8threst"],
      "0.75":M["halfrest"]+M["dot"],
      "0.25":M["quarterrest"],
      "0.375":M["quarterrest"]+M["dot"],
      "0.125":M["8threst"],
      "0.1875":M["8threst"]+M["dot"],
      "0.0625":M["16threst"],
      "0.09375":M["16threst"]+M["dot"],
      "0.03125":M["32ndrest"],
    }
    return avail(durMap[dur], M["wholerest"]+durFrac(dur));
}

function fmtFingerDurM(finger, h, n, c=null) {
  let dur = null;
  let hold = null;
  if (isAvail(durationsToPlay) && isAvail(durationsToPlay[h])
        && durationsToPlay[h].length > 0) {

      const dtp = durationsToPlay[h][n%(durationsToPlay[h].length)];

      if (isChord(dtp)) { // each note of a chord could have a different length, or all could be the same
        console.log("Chord Duration, len="+isChord(dtp)+" h="+h+" n="+n+" c="+c);
        if (c !== null) {
            dur = dtp[c%(dtp.length)]; // let the array wrap
        } else {
          dur = dtp[0];
        }
        dur = durUnicode(dur);
        if (isChord(finger)) {
          finger = finger[c]; // each chord note can of course have a different finger. (Or not.)
        }
      } else {
        //console.log("Plain Duration, len="+isChord(dtp)+" h="+h+" n="+n+" c="+c);
        dur = durationsToPlay[h][n%durationsToPlay[h].length];
        hold = (isAvail(holdsToPlay) &&
                isAvail(holdsToPlay[h]) &&
                holdsToPlay[h].length !== null)?(holdsToPlay[h][n%holdsToPlay[h].length]):dur;

        if (0 && isAvail(hold) && hold !== dur) {
          console.log("HOLD NOT DUR BEFORE: hold:"+hold+" dur:"+dur);
          dur = durUnicode(hold);
          hold = restUnicode(dur);
          console.log("HOLD NOT DUR AFTER: hold:"+hold+" dur:"+dur);
        } else {
          dur = durUnicode(dur);
          hold = dur;
        }
      }
  }

  let color = (h===0)?"blue":"red";
  let fmtdur = "<span class=mfl style=font-size:smaller>"+dur+"</span>";
  if (dur !== hold && hold !== null) {
    fmtdur = "<div class=mf style=display:flex;flex-direction:column><div>"+
              hold+"</div><div>"+dur+"</div></div>"
  }
  return fmtdur + "<sup style=font-size:xx-small;color:"+color+
    ";font-weight:bold>"+ ((finger !== null)?finger:"&nbsp;") + "</sup>";
}

function durUnicode(dur) {
  dur = parseFloat(dur); // this and the next line canonicalize it as a decimal fraction
  dur = String(dur);
  const durMap = {
    "0":"", // a duration of 0 is used for a "crushed" note (accacciatura) which should
             // just have an extremely short duration that is included with the next note's duration.
    "2":M["whole"]+M["whole"],
    "1":M["whole"],
    "1.5":M["whole"]+M["dot"],
    "1.25":M["whole"]+M["quarter"],
    "1.125":M["whole"]+M["8th"],
    "0.5":M["half"],
    "0.625":M["half"]+M["8th"],
    "0.75":M["half"]+M["dot"],
    "0.875":M["half"]+M["quarter"]+M["8th"],
    "0.25":M["quarter"],
    "0.375":M["quarter"]+M["dot"],
    "0.4375":M["quarter"]+M["8th"]+M["dot"],
    "0.125":M["8th"],
    "0.1875":M["8th"]+M["dot"],
    "0.0625":M["16th"],
    "0.09375":M["16th"]+M["dot"],
    "0.08333333333333333":M["quarter"]+String.fromCodePoint(0x2153),
    "0.041666666666666664":M["8th"]+String.fromCodePoint(0x2153),
    "0.03125":M["32nd"],
  }
  return avail(durMap[dur], String(durFrac(dur)));
}


function restUnicode(dur) {
  dur = parseFloat(dur); // this and the next line canonicalize it as a decimal fraction
  dur = String(dur);
  const durMap = {
    "1":M["wholerest"],
    "1.125":M["wholerest"]+M["8threst"],
    "1.25":M["wholerest"]+M["quarterrest"],
    "1.5":M["wholerest"]+M["dot"],
    "0.5":M["halfrest"],
    "0.875":M["halfrest"]+M["quarterrest"]+M["8threst"],
    "0.75":M["halfrest"]+M["dot"],
    "0.25":M["quarterrest"],
    "0.375":M["quarterrest"]+M["dot"],
    "0.125":M["8threst"],
    "0.1875":M["8threst"]+M["dot"],
    "0.0625":M["16threst"],
    "0.09375":M["16threst"]+M["dot"],
    "0.03125":M["32ndrest"],
  }
  return avail(durMap[dur], M["wholerest"]+dur);
}


function fmtFingerDur(finger, h, n) {
  let dur = null;
  let num = 0;
  let denom = 0;
  if (isAvail(durationsToPlay) && isAvail(durationsToPlay[h])
        && durationsToPlay[h].length > 0) {
      dur = durationsToPlay[h][n%durationsToPlay[h].length];
      dur = durFrac(dur);
  }
  if (dur !== null) {
    const f = dur.split("/");
    num =  f[0];
    denom = f[1];
  }
  return "<div style=display:inline-block;transform:translateY(-33%);text-align:center><div style=display:flex;flex-direction:column;font-size:9px>" +
            "<div>"+ ((finger !== null)?finger:"&nbsp;") + "</div>"+
            "<div style='border-bottom:1px solid black;font-size:7px'>"+num+"</div>" +
            "<div style=font-size:8px>"+denom+"</div>"+
            "</div></div>";
}


function toggleNoteScope(event, h=null, n=null) {

  let [toss,hand,note] = event.currentTarget.id.split('_');

  if (h !== null && n !== null) {
    hand = h;
    note = n;
  }

  if (toss === "barline") {
    toggleBarScope(event);
    return;
  }
  hand = parseInt(hand);
  note = parseInt(note);

  console.log("toggleNoteScope clicked. h="+hand+" note="+note+" toss=/"+toss+"/");

  let lastnonrest = notesToPlay[hand].length-1;
  while (notesToPlay[hand][lastnonrest] === RESTNOTE && lastnonrest > 0) {
    lastnonrest--;
  }

  if (noteScope[hand].first === 0 && noteScope[hand].last >= lastnonrest) {
    // The current scope is the entire range. So, the clicked note is now
    // going to be the entire range.
    noteScope[hand].first = noteScope[hand].last = note;
  } else if (note < noteScope[hand].first) {
    // extend the range down to note
    noteScope[hand].first = note;
  } else if (note === noteScope[hand].first) {
    // already on, so turn it off
    noteScope[hand].first++;
  } else if (note > noteScope[hand].last) {
    // extend range up to note
    noteScope[hand].last = note;
  } else if (note === noteScope[hand].last) {
    noteScope[hand].last--;
  } else {
    // the note must be inside the range. So, move the beginning or end of range to
    // note, depending on which note is closer to.
    if (noteScope[hand].last - note > note - noteScope[hand].first) {
      noteScope[hand].first = note;
    } else {
      noteScope[hand].last = note;
    }
  }

  if (noteScope[hand].last < noteScope[hand].first) {
    // there is no more scope, so whole range is on.
    noteScope[hand].first = 0;
    noteScope[hand].last = notesToPlay[hand].length-1;
  }

  removeTrailingRestsFromNoteScope();

  recolorNoteScope(hand);

  computeBeatsToPlay();

  updateToggleFavoriteButton();

  console.log("Note Scope, Left:"+noteScope[0].first+"-"+noteScope[0].last+"-nr:"+noteScope[0].firstrangenonrest+" Right:"+noteScope[1].first+"-"+noteScope[1].last+"-nr:"+noteScope[1].firstrangenonrest);

  event.stopPropagation();
}

function updateToggleFavoriteButton() {
  // See if the current notescope is actually one of the favorites and update the icon color to reflect this.
  const modeBoxes = document.querySelectorAll('#barSelectContainer .mode-box-bars');

  // Loop through the NodeList of elements and see if any one has data-notescope that matches
  // the current noteScope

  let foundit = false;

  modeBoxes.forEach(box => {
      const ns = box.getAttribute("data-notescope");

      if (ns === null) {
        return; // process next one
      }

      const [lf, ll, rf, rl] = ns.split(",");

      if (lf == noteScope[0].first && ll == noteScope[0].last &&
          rf == noteScope[1].first && rl == noteScope[1].last) {
          const pref = getHistoryPref(box.id); // was previously in error as ns.id
          console.log("Found bar preset matching notescope:"+box.id+" fav="+pref);
          setFavoriteIcon(pref);
          recolorBarPresets(box.id);
          displayPriorRunStats();
          foundit = true;
          return; // only one can match
      }
  });

  if (foundit === false) {
    recolorBarPresets(null); // turn them all off
    setFavoriteIcon(false);  // this can't be a favorite because it doesn't match anything
  }

}

function setFavoriteIcon(isFav) {
  const fav = document.getElementById("toggleFavoriteIcon");

  if (isFav) {
    fav.style.color = "#900"; // dark red
  } else {
    fav.style.color = "#999"; // light gray
  }
}

function toggleBarScope(event) {

  let [toss,hand,bar] = event.currentTarget.id.split('_');

  hand = parseInt(hand);
  bar = parseInt(bar);

  console.log("toggleBarScope clicked. h="+hand+" bar="+bar);

  let firstnote = null, lastnote = null;

  for (let n = 0; n < notesToPlay[hand].length; n++) {
    const curbar = 1 + Math.trunc(noteStartBeat[hand][n]/testOptions.beatsPerBar);
    if (curbar === bar) {
      if (firstnote === null) {
        firstnote = n;
      }
      lastnote = n;
    } else if (curbar > bar) {
      break;
    }
  }

  console.log("firstnote: "+firstnote+" last:"+lastnote);

  if (noteScope[hand].first === firstnote && noteScope[hand].last === lastnote) {
    // already on, turn them all off.
    noteScope[hand].first = 0;
    noteScope[hand].last = notesToPlay[hand].length-1;
  } else {
    // just turn these on
    noteScope[hand].first = firstnote;
    noteScope[hand].last = lastnote;
  }

  removeTrailingRestsFromNoteScope();

  recolorNoteScope(hand);

  computeBeatsToPlay();

  console.log("Note Scope, Left:"+noteScope[0].first+"-"+noteScope[0].last+"-nr:"+noteScope[0].firstrangenonrest+" Right:"+noteScope[1].first+"-"+noteScope[1].last+"-nr:"+noteScope[1].firstrangenonrest);

  event.stopPropagation();
}


function recolorNoteScope(hand) {
  // recolor all the notes to make them reflect reality
  for (let n = 0; n < notesToPlay[hand].length; n++) {
    const notediv = document.getElementById("ntp_"+hand+"_"+n);
    if (n >= noteScope[hand].first && n <= noteScope[hand].last &&
      (noteScope[hand].first > 0 || noteScope[hand].last < notesToPlay[hand].length-1)) {
      notediv.style.backgroundColor = "#AAAADD80";
    } else {
      notediv.style.backgroundColor = "transparent";
    }
  }

}

// Create presets
console.log("pushing presets");

// MOVED TO config.js: const A1-G6 note names
// MOVED TO config.js: const A1s-G6s sharps
// MOVED TO config.js: const A1b-G6b flats
// MOVED TO config.js: const scalemetrics = {...};
// MOVED TO config.js: const bluesscalemetrics = {...};
// MOVED TO config.js: const bluesSwungEighths = [...];

presets.push("Scales, Major");
presets.push(generateScalePreset('A', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('A#', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('B', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C#', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D#', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('E', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F#', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G', 'maj', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G#', 'maj', 2, 3, null, scalemetrics));

presets.push("Scales, Minor");
presets.push(generateScalePreset('A', 'natMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('B', 'natMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C', 'natMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D', 'natMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('E', 'natMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F', 'natMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G', 'natMin', 2, 3, null, scalemetrics));

presets.push(generateScalePreset('D', 'melMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('E', 'melMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G', 'melMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D', 'harMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('E', 'harMin', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G', 'harMin', 2, 3, null, scalemetrics));

presets.push("Scales, Other");
presets.push(generateScalePreset('A', 'minBlues', 2, 3, null, bluesscalemetrics, bluesSwungEighths));
presets.push(generateScalePreset('C', 'minBlues', 2, 3, null, bluesscalemetrics, bluesSwungEighths));
presets.push(generateScalePreset('G', 'chroma', 2, 3, null, scalemetrics));

presets.push("Arpeggios, Major");
presets.push(generateScalePreset('A', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('A#', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('B', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C#', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D#', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('E', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F#', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G', 'majArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G#', 'majArp', 2, 3, null, scalemetrics));


presets.push("Arpeggios, Minor");
presets.push(generateScalePreset('A', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('A#', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('B', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('C#', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('D#', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('E', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('F#', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G', 'natMinArp', 2, 3, null, scalemetrics));
presets.push(generateScalePreset('G#', 'natMinArp', 2, 3, null, scalemetrics));

presets.push("Octaves");

const octmetrics = {HTQ: false, MetQ: true, DynQ: true, LegQ: false, StaQ: true};
presets.push(generateScalePreset('C', 'maj', 1, 5, "OCTAVE-C5", octmetrics));
presets[presets.length-1].category = 'drill';
presets.push(generateScalePreset('C', 'maj', 1, 2, "OCTAVE-C2", octmetrics));
presets[presets.length-1].category = 'drill';
presets.push(generateScalePreset('G', 'maj', 1, 5, "OCTAVE-G5", octmetrics));
presets[presets.length-1].category = 'drill';
presets.push(generateScalePreset('G', 'maj', 1, 2, "OCTAVE-G2", octmetrics));
presets[presets.length-1].category = 'drill';

presets.push("Other Drills");

presets.push({
  name: 'FP-Arps',
  category: 'drill',
  fullName: "Finger picking arpeggios",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 75,
  maxBPM: 120,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftHand: [
    C3, G3, C3, G3, // low, high of triad
    A3, E3, A3, E3,
    F3, C3, F3, C3,
    G3, D3, G3, D3,
    G3, F3, G3, F3,
  ],
  leftDur: [
   1/4,
  ],
  rightHand: [
  -1, E4, -1, C4, -1, E4, // middle, low, middle of triad
  -1, C4, -1, A4, -1, C4,
  -1, A4, -1, C4, -1, A4,
  -1, B4, -1, D4, -1, B4,
  -1, D4, -1, F4, -1, D4,
  ],
  rightDur: [
    1/4, 1/8, 1/4, 1/8, 1/8, 1/8,
  ],

  barAnnotations: {
    "1":"C", "2":"Amin", "3":"F", "4":"G", "5":"G7",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: true, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'MSW',
  category: 'drill',
  fullName: "M.S.W. Opening Theme Drill",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 108,
  maxBPM: 120,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftHand: [
    C4, E4, D4s, E4,   G3, E4, D4s, E4,   D4, F4, E4, F4,   G3, B3, D4, B3, // bar 1
    C4, E4, D4s, E4,   G3, E4, D4s, E4,   D4, F4, E4, F4,   G3, B3, D4, B3, // bar 2 is identical to bar 1
    C4, E4, D4s, E4,   A3, C4, A4, F4s,   G4, F4, D4, B3,   G3, /* [ */ B3, /* F4 ],*/ // bar 3
    C2, E2 /*+G3*/, A2, C4 /*+E3*/, D3, D4 /*+A3*/, G2, B3, /*+F3*/    // bar 4
  ],
  leftDur: [
    1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,
    1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,
    1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,   1/16, 1/16, 1/16, 1/16,   1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  ],
  rightHand: [
    -1,    // bar 1
    -1, G4, C5, E5,   F5, D5, F5,       // bar 2
    E5, C5, A4, G4,   G5, F5,           // bar 3
    E5, G5 /*gn F5#*/, C5, E5, D5, F5, B4, D5,  // bar 4
  ],
  rightDur: [
    1,  // bar 1
    1/8, 1/8, 1/8, 1/8,   1/8, 1/4, 1/8,  // bar 2
    1/8, 1/4, 1/8, 3/8, 1/16, 1/16, // bar 3
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // bar 4
  ],

  barAnnotations: {
    "1":"Murder She Wrote Theme",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: true, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'RUN-PITPAT',
  category: 'drill',
  leftHand: [
    48, 50, 52, 55,
    -1,
    72, 74, 76, 79,
    -1,
    96, -1,
    -1,
    79, 76, 74, 72, -1,
    55, 52, 50, 48,],
   leftDur: [
     1/4, 1/4, 1/4, 1/4,
     1,
     1/4, 1/4, 1/4, 1/4,
     1,
     1/4, 3/4,
     1,
     1/4, 1/4, 1/4, 1/4, 1,
     1/4, 1/4, 1/4, 1/4
   ],
  rightHand: [ -1, 60, 62, 64, 67,
    -1,  84, 86, 88, 91,
    -1, 91, 88, 86, 84,
    -1, 67, 64, 62, 60,
    -1  ],
  rightDur: [
    1, 1/4, 1/4, 1/4, 1/4,
    1, 1/4, 1/4, 1/4, 1/4,
    1, 1/4, 1/4, 1/4, 1/4,
    1, 1/4, 1/4, 1/4, 1/4,
    1
  ],
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({name: 'FGAmG-LH-IMP1',
  category: 'drill',
  beatsPerBar: 6,
  beatDur: 1/4,
  leftHand: [
              41, 48, 53, 48, 53, 48, 41, 48, 53, 48, 53, 48, // F
              43, 50, 55, 50, 55, 50, 43, 50, 55, 50, 55, 50, // G
              45, 52, 57, 52, 57, 52, 45, 52, 57, 52, 57, 52, // Am
              43, 50, 55, 50, 55, 50, 43, 50, 55, 50, 55, 50, // G
            ],
  leftDur: [1/8],
  rightHand: [
    84,83,81,76,74,72,
    84,83,81,76,74,72,
    84,83,81,76,74,72,
        84,83,81,76,74,72,
  ],
  rightDur: [1/4],
}
);

presets.push({name: 'FGAmG-LH-IMP2',
  category: 'drill',
  beatsPerBar: 6,
  beatDur: 1/4,
  leftHand: [
              41, 48, 53, 48, 53, 48, 41, 48, 53, 48, 53, 48, // F
              43, 50, 55, 50, 55, 50, 43, 50, 55, 50, 55, 50, // G
              45, 52, 57, 52, 57, 52, 45, 52, 57, 52, 57, 52, // Am
              43, 50, 55, 50, 55, 50, 43, 50, 55, 50, 55, 50, // G
            ],
  leftDur: [1/8],
  rightHand: [
    'B4', 'C5', 'B4', 'A4', 'E5', 'A4',
    'B4', 'C5', 'B4', 'A4', 'E5', 'A4',
    'B4', 'C5', 'B4', 'A4', 'E5', 'A4',
    'B4', 'C5', 'B4', 'A4', 'E5', 'A4',
  ],
  rightDur: [1/4],
}
);

presets.push({
  name: 'CAmFG Fill',
  fullName: 'Left hand chords with fill C/A minor/F/G',
  category: 'drill',
  beatsPerBar: 4,
  beatDur: 1/4,
  leftHand: [
              C3,-1,-1,-1,
              A2,-1,-1,-1,
              F2,-1,-1,-1,
              G2,-1,-1,-1
            ],
  leftDur: [1/4],
  rightHand: [
    G3, C4, D4,    G4, D4, C4,    G3, C4, D4,   G4, D4, C4,
    G3, C4, D4,    G4, D4, C4,    G3, C4, D4,   G4, D4, C4,
    G3, C4, D4,    G4, D4, C4,    G3, C4, D4,   G4, D4, C4,
    G3, C4, D4,    G4, D4, C4,    G3, C4, D4,   G4, D4, C4,
  ],
  rightDur: [1/12], // triplets
}
);


presets.push("Repertoire");

presets.push({
  name: 'JMB',
  fullName: "Josette's Music Box",
  category: 'repertoire',
  rightHand: [
    E5, G5,       // bar 1
    D5, G5, F5,
    E5, G5,
    D5,
    C5, C5, D5,  // bar 5
    E5, D5, C5,
    G5, E5, F5s,
    G5,
    E5, G5,
    D5, G5, F5,  // bar 10
    E5, D5, C5,
    A5,
    G5, E5, F5, D5,
    E5, C5, A4, F5,
    E5, D5,         // bar 15
    C5, //B4, C5, D5,

  ],
  rightDur: [
    1/4, 1/4,       // bar 1
    1/4, 1/8, 1/8,
    1/4, 1/4,
    1/2,
    1/4, 1/8, 1/8, // bar 5
    1/4, 1/8, 1/8,
    1/8, 1/8, 1/4,
    1/2,
    1/4, 1/4,
    1/4, 1/8, 1/8, // bar 10
    1/8, 1/8, 1/4,
    1/2,
    1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8,
    1/4, 1/4,           // bar 15
    1/2 // 1/8, 1/8, 1/8, 1/8,
    //1/4, 1/4,
    //1/4, 1/8, 1/8,
    //1/4, 1/4,
    //1/2,

  ],

  leftHand: [
    C5, E4, G4, C5, // bar 1
    B4, C5, B4, G4,
    C5, A4, G4,
    B4, A4, G4, B4,
    G4, A4,         // bar 5
    G4, A4,
    C5, D5, D4,
    G4, A4, B4,
    C5, E4, G4, C5,
    B4, C5, B4, G4, // bar 10
    C5, E4,
    F4, G4, A4, F4,
    C5, A4,
    C5, G4, F4,
    G4, B4,       // bar 15
    G4, // D4, E4, F4,



  ],
  leftDur: [
    1/8,1/8,1/8,1/8,  //bar 1
    1/8,1/8,1/8,1/8,
    1/8,1/8,1/4,
    1/8,1/8,1/8,1/8,
    1/4, 1/4,         // bar 5
    1/4, 1/4,
    1/4, 1/8, 1/8,
    1/4, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8,   // bar 10
    1/4, 1/4,
    1/8, 1/8, 1/8, 1/8,
    1/4, 1/4,
    1/8, 1/8, 1/4,
    1/4, 1/4,           // bar 15
    1/2 // 1/8, 1/8, 1/8, 1/8,
    //1/8, 1/8, 1/8, 1/8,
    //1/8, 1/8, 1/8, 1/8,
  ],

  beatDur: 1/4,

  beatsPerBar: 2,

  targetBPM: 76,

  graphOrder: "bar", // graph bar by bar instead of note by note

  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: true, StaQ: false}
});


presets.push({
  name: 'F&uumlR-ELISE',
  category: 'repertoire',
  rightHand: [
    -1, 76, 75,                 //bar 1
    76, 75, 76, 71, 74, 72,
    69,  -1,  60, 64, 69,
    71,  -1,  64, 68, 71,
    72,  -1,  64, 76, 75,
    76, 75, 76, 71, 74, 72,   // bar 6
    69, -1, 60, 64, 69,
    71, -1, 62, 72, 71,
    69, -1, 71, 72, 74,       // bar 8 (marked 2.)

    76, 67, 77, 76,
    74, 65, 76, 74,
    72, 64, 74, 72,
    71, -1                   // just the first note of bar 12
  ],
  rightDur: [
    1/4, 1/16, 1/16,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, // bar 6
    1/8, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, // bar 8 (2.)
    3/16, 1/16, 1/16, 1/16,
    3/16, 1/16, 1/16, 1/16,
    3/16, 1/16, 1/16, 1/16,
    1/8, 1/4 // ending on first note of bar 12 then 1/4 duration rest to fill it out
  ],

  leftHand: [
    -1, -1,
    45, 52, 57,    -1,
    40, 52, 56,    -1,
    45, 52, 57,    -1, -1,
    45, 52, 57,    -1,
    40, 52, 56,    -1,
    45, 52, 57,    -1,
    48, 55, 60,    -1,
    43, 55, 59,    -1,
    45, 52, 57,    -1,
    40, 52, 64,    -1,
  ],
  leftDur: [
    3/8, 3/8,
    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16, 3/8,

    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16,

    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16,
    1/16, 1/16, 1/16,    3/16,
  ],


  beatDur: 1/8,

  beatsPerBar: 3,

  targetBPM: 138,

  graphOrder: "bar", // graph bar by bar instead of note by note

  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: true, DynQ: true, LegQ: true, StaQ: false}
});

presets.push({
  name: 'CSA', // Come Sail Away by Styx
  category: 'repertoire',
  fullName: "Come Sail Away, by Styx",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 120,
  maxBPM: 150,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftHand: [60, 67, 64, 67, 64, 67, 60, 67, //C arp
             62, 69, 65, 69, 65, 69, 62, 69, // Dm arp
             64, 71, 67, 71, 67, 71, 64, 71, // Em arp
             62, 69, 65, 69, 65, 69, 62, 69, // Dm arp

             60, 67, 64, 67, 60, 64, 60, 67, //C arp, different pattern

             55, 62, 59, 62,     55, 62, 59, 62,    // G alberti
             'C4', 'G4', 'E4', 'G4', 'C4', 'G4', 'E4', 'G4',  // Confirmed. bar 7, C4 alberti bass
             'B3', 'G4', 'E4', 'G4', 'E4', 'G4', 'B3', 'G4',  // Confirmed. bar 8, Em/B
             'A3', 'E4', 'C4', 'E4', 'A3', 'E4', 'C4', 'E4',  // Confirmed. bar 9 Am
             'A3', 'E4', 'A3', 'E4', 'A3', 'E4', 'G3', 'D4',  // Confirmed. bar 10 G
             'F3', 'C4', 'A3', 'C4', 'F3', 'C4', 'A3', 'C4',  // Confirmed. bar 11 F
             'F3', 'C4', 'A3', 'C4', 'F3', 'C4', 'F3', 'C4',  // Confirmed. bar 12 F
             'G3', 'D4', 'B3', 'D4', 'B3', 'D4', 'G3', 'D4',  // Confirmed. bar 13 G
             B3, D4, G3, D4, B3, D4, G3, D4,                  // Bar 14
             C4, G4, E4, G4, C4, G4, E4, G4,                  // Bar 15 C
             B3, G4, E4, G4, B3, G4, C4, G4,                  // Bar 16 Em/B
             A3, E4, C4, E4, A3, E4, A3, E4,                  // Bar 17 Am
             A3, E4, A3, E4, A3, E4, G3, D4,                  // Bar 18 Am->G
             F3, C4, A3, C4, F3, C4, A3, C4,                  // Bar 19, F (44 alberti)
             F3, C4, A3, C4, F3, C4, A3, C4,                  // Bar 20, F (44 alberti)
             G3, D4, B3, D4, B3, D4, G3, D4,                  // Bar 21, G (62 alberti)
             B3, D4, B3, D4, G3, D4, G3, D4,                  // Bar 22, G (nonstandard, MHMHLHLH)
             A3, E4, C4, E4, A3, E4, C4, E4,                  // Bar 23, Am
             A3, E4, C4, E4, A3, E4, C4, E4,                  // Bar 24, Am
             G3, D4, B3, D4, G3, D4, B3, D4,                  // Bar 25, G (44)
             G3, D4, B3, D4, G3, D4, B3, D4,                  // Bar 26, G
             A3, E4, C4, E4, A3, E4, A3, E4,                  // Bar 27 Am
             C4, E4, C4, E4, A3, E4, A3, E4,                  // Bar 28 Am but odd pattern: MHMHLHLH
             G3, D4, B3, D4, G3, D4, B3, D4,                  // Bar 29 G
             G3, D4, B3, D4, G3, D4, B3, D4,                  // Bar 30 G
             C4, G4, E4, G4, C4/*really:E4 but C4===bar 7*/, G4 /*+C4*/, E4, G4, // Bar 31 C (variation of bar 7)
             B3, G4, E4, G4, E4, B3, E4, G4,                  // Bar 32 E
             A3, E4, C4, E4, A3, E4, C4, E4,                  // Bar 33 A
             A3, E4, A3, E4, A3, E4, G3, D4,                  // Bar 34 A/G
             F3, C4, A3, C4, C4, C4, F3, C4,                  // Bar 35, F
             G3, D4, B3, D4, G3, D4, G3, D4,                  // Bar 36 G
             C4, G4, E4, G4, E4, G4, C4, G4,                  // Bar 37 C  END OF VERSE 1, go back to intro
             // repeat of intro (line above was bar 1 of intro)
             62, 69, 65, 69, 65, 69, 62, 69, // Dm arp  38
             64, 71, 67, 71, 67, 71, 64, 71, // Em arp  39
             62, 69, 65, 69, 65, 69, 62, 69, // Dm arp  40

             60, 67, 64, 67, 60, 64, 60, 67, //C arp, different pattern 41

             55, 62, 59, 62,     55, 62, 59, 62,    // G alberti 42
             C4, C4, C4, C4, C4, C4, C4, C4,  // bar 43 this is really just filler

             // Pre-chorus
             [F1,F2], [F1,F2], [F1,F2], [F1,F2], [F1,F2], [F1,F2], [F1,F2], [F1,F2], // bar 71/44
             [G2, G3],[G2, G3], [G2, G3], [G2, G3], [G2, G3], [G2, G3], [G2, G3], [G2, G3], // bar 72/45
             [C2,C3], C3, C3, C3, C3, C3, C3, C3, // bar 73/46 REPEAT START
             C2, -1, C3, C2, -1, C2, -1, C2, C2, // bar 74/47
             [C2, C3], C3, C3, C3, C3, C3, C3, C3, // bar 75/48
             C2, -1, C2, -1, C2, -1, C2, C2,       // bar 76/49 REPEAT END
             [C2,C3], C3, C3, C3, C3, C3, C3, C3, // bar 73v2/46 REPEAT START Alternative 2
             C2, -1, C3, C2, -1, C2, -1, C2, C2, // bar 74v2/47
             [C2, C3], C3, C3, C3, C3, C3, C3, C3, // bar 75v2/48
             C2, -1, C2, -1, C2, -1, C2, C2,       // bar 77/50   "A" (last beat) REPEAT END ALT 2
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 78/51   "gath-er-ing ... of..."
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 79/52   "an-gels ap--"
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 80/53   "-peared a-bove_ my_ head_"
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 81/54   "_ _ _ They "
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 82/55   " sang to me this"
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 83/56   "song of hope _ And"
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 82/57   "this is what they said,"
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 83/58   "__ They said "
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 84/59   "Come sail away _ come_"
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 85/60   "sail a-way, come"
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 86/61   START REPEAT "Come sail away _ come_"
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 87/62   "sail a-way, come"
             C2, C2, C2, C2, C2, C2, C2, C2,       // bar 88/63   REP1,2,3 "Come sail away with me"
             C2, C2, C2, C2, C2, C2, C2, G1,       // bar 89/64   REP 1,2,3 END REPEAT  ""
           ],
  leftDur: [
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // bar 43

            // Pre Chorus
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 71/44
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 72/45
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 73/46
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 74/47
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,    // 75/48
            1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 76/49
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 73v2/46
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 74v2/47
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,    // 75v2/48
            1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 77/50
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 78/51
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 79
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 80/53
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, //81
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 82
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 83
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 84
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 85/58
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 86
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 87
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 88
            1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // 89/62
           ],
  rightHand: [76, 86, 84, 76,
              77, 86, 84, 77,
              79, 86, 84, 79,
              77, 86, 84, 84, 83, 81, 83, // last four are sixteenths
              84, 79, 72, 72,

              71,72,71,72,71,72,71,72,  // bar 6: trilling on B, technically could be more or fewer than this
              71, 71, 69, 71,
              'C5', 'C6', 'G5', 'E5', 'C5',  // Confirmed. bar 7, start of verse 1:  "I'm"
              'B4', 'B5', 'G5', 'E5', 'B4',  // Confirmed. bar 8 "Sail-ing   a-"
              'E5', 'C5', 'C5', 'A4',        // Confirmed. bar 9  "-way"
              'A4', 'A5', 'E5', 'D5',        // Confirmed. bar 10, instrumental
              'C5', 'A4', 'A4',              // Confirmed. bar 11, "set an o--pen" the final A4 is tied to the next bar
              /*'A4' tie,*/ 'F5', 'E5', 'C5', 'A4', 'F4',  // Confirmed. bar 12, "course ... for the"
              'G4', 'D5', 'D5',               // Confirmed. bar 13, "vir - gin sea, --" D5 is tied to next bar
              G5, G5, D5,                     // bar 14.  "... ... ... 'cause'"
              C5, C6, G5, E5, C5,             // bar 15. "I've ... ... ..."
              B4, E5, B5, G5, B4,             // bar 16. "got to ... be"
              E5, C5, C5, A5,                 // bar 17. "free"
              A5, E5, D5,                     // bar 18.
              C5, A4, A4,                     // bar 19. " ... free to face the"
              /*A4 tied*/ F5, E5, C5, A4, F4, // bar 20. "life ... that's a--"
              G4, G5, G5, D5,                 // bar 21. "--head of me"
              D5, -1, /*[*/ G5 /*,G4]*/,       // bar 22.
              A4, C5, C5, A5,                 // bar 23. ... On board I'm the
              A5, E5, E5, C5, A4,             // bar 24.  cap - tain,...

              D5, /*[*/ G5 /*,G4]*/, /*[*/ G5 /*,G4]*/, D5, // bar 25. so climb a - ...
              -1, G6, D6, C6, G5, D5, D5, /*[*/ G5 /*,G4]*/,  // bar 26. ...-board
              /*[*/ A5, /*,A4],*/ C5, C5, /*last c5 bridges*/ // bar 27. ... We'll search for to--
              C6, A5, E5, C5, A4,           // bar 28. mor-ow
              D5, G5 /*+G4*/, G5 /*+G4*/, G5, // bar 29. on ev- 'ry
              G5, D5, D5,                    // bar 30. shore --- And I'll
              C5, C6, G5, E5, C5,            // bar 31. try,
              B4, B5, G5, E5, B4,            // bar 32. oh, Lord--I'll--
              E5, C5, C5, A4,                // bar 33. try--
              A4, E5, A4, D5, G4,            // bar 34.
              C5, G4, G4,                    // bar 35. &mdash; to car&mdash;
              G5, D5,                        // bar 36. &mdash; &mdash; &mdash; ry
              E5, D6, C6, E5,                // bar 37. on &mdash; &mdash; &mdash; (back to the intro here)
              // repeat of intro (line above was first line of intro)
              77, 86, 84, 77,
              79, 86, 84, 79,
              77, 86, 84, 84, 83, 81, 83, // last four are sixteenths
              84, 79, 72, 72,

              71,72,71,72,71,72,71,72,  // bar 6: trilling on B, technically could be more or fewer than this
              71, 71, 69, 71,
              C5, C5, C5, C5, // 43. this is really just filled out, not actual notes

              // Pre-chorus
              [F3, A3], [F3, A3], [F3, A3], [F3, A3], [F3, A3], [F3, A3], [F3, A3], [F3, A3], // 71/44
              [F3, G3], [F3, G3], [F3, G3], [F3, G3], [F3, G3], [F3, G3], [F3, G3], [F3, G3], // 72/45
              [G3, C4],                                                                       // REPEAT START 73/46
              [F3, C4, F4], -1, [F3, C4, F4], -1, [F3, C4, F4], -1, [G3, D4, G4], [G3, D4, G4], // 74/47
              [G3, D4, G4],  // 75/48
              [F3,C4,F4], -1, [F3,C4,F4], -1, [F3,C4,F4], -1, [G3,C4], [G3, C4], // REPEAT END 76/49
              [G3, C4],                                                              // REPEAT START 73v2/46
              [F3, C4, F4], -1, [F3, C4, F4], -1, [F3, C4, F4], -1, [G3, D4, G4], [G3, D4, G4], // 74v2/47
              [G3, D4, G4],  // 75v2/48
              [F3,C4,F4], -1, [F3,C4,F4], -1, [F3,C4,F4], -1, [G3,C4], [G3, C4], // 77/50
              [G3,C4,G4], // 78/51
              [F3,C4,F4], -1, [F3,C4,F4], -1, [F3,C4,F4], -1, [G3,D4,G4], [G3, D4, G4], // 79/52
              [G3,D4,G4], // 80/53
              [F3,C4,F4], -1, [F3,C4,F4], -1, [F3,C4,F4], -1, [G3,C4], [G3, C4], // 81/54
              [G3,C4,E4], // 82/55
              [F3,C4,F4], -1, [F3,C4,F4], -1, [F3,C4,F4], -1, [G3,D4,G4], [G3, D4, G4], // 83/56
              [G3,D4,G4], // 84/57
            ],
  rightDur: [1/4, 1/4, 1/4, 1/4,
             1/4, 1/4, 1/4, 1/4,
             1/4, 1/4, 1/4, 1/4,
             1/4, 1/4, 1/4,  1/16, 1/16, 1/16, 1/16,
             3/8, 1/8, 1/4, 1/4,

             3/32,3/32,3/32,3/32,1/32,1/32,1/32,1/32,  // trills should really be faster than this, but for now 2 per LH note is good for learning it
             1/8, 1/8, 1/8, 1/8,
             1/4, 1/4, 1/4, 1/8, 1/8,     // bar 7
             1/4, 1/4, 1/4, 1/8, 1/8,     // bar 8
             3/8, 1/8, 3/8, 1/8,          // bar 9
             3/8, 1/8, 1/4, 1/4,
             3/8, 1/8, 5/8,               // bar 11
             1/8, 1/8, 1/8, 1/4, 1/4,
             3/8, 1/8, 5/8,               // bar 13, final note ties to next bar
             /* 1/8 tied from prior bar*/ 1/8, 1/4, 1/2,               // bar 14
             1/4, 1/4, 1/4, 1/8, 1/8,     // bar 15
             3/8, 1/8, 1/8, 1/4, 1/8,     // bar 16
             3/8, 1/8, 3/8, 1/8,          // bar 17
             1/2, 1/4, 1/4,               // bar 18
             3/8, 1/8, 5/8,               // bar 19 (final note ties to next bar)
             1/8, 1/8, 1/8, 1/4, 1/4,     // bar 20
             3/8, 1/8, 3/8, 1/8,          // bar 21
             // needs checking
             1/2, 1/8, 3/8,               // bar 22
             3/8, 1/8, 3/8, 1/8,          // bar 23
             3/8, 1/8, 1/4, 1/8, 1/8,     // bar 24
             3/8, 1/8, 3/8, 1/8,          // bar 25
             1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,  // bar 26
             3/8, 1/8, 5/8,              // bar 27 (final note bridges to next bar)
             1/8, 1/8, 1/8, 1/4, 1/4,     // bar 28
             3/8, 1/8, 3/8, 1/8,         // bar 29
             1/2, 1/4, 1/4,              // bar 30
             1/4, 1/4, 1/4, 1/8, 1/8,    // bar 31
             1/4, 1/4, 1/4, 1/8, 1/8,    // bar 32
             3/8, 1/8, 3/8, 1/8,         // bar 33
             1/2, 1/8, 1/8, 1/8, 1/8,    // bar 34
             3/8, 1/8, 1/2,              // bar 35
             1/2, 1/2,                   // bar 36
             1/4, 1/4, 1/4, 1/4,         // bar 37  END OF VERSE 1, start of intro
             1/4, 1/4, 1/4, 1/4,
             1/4, 1/4, 1/4, 1/4,
             1/4, 1/4, 1/4,  1/16, 1/16, 1/16, 1/16,
             3/8, 1/8, 1/4, 1/4,

             3/32,3/32,3/32,3/32,1/32,1/32,1/32,1/32,  // trills should really be faster than this, but for now 2 per LH note is good for learning it
             1/8, 1/8, 1/8, 1/8,

             1/4, 1/4, 1/4, 1/4, // 44

             // Pre-Chorus
             1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,    // 71/44
             1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,    // 72/45
             1,                                         // 73/46
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 74/47
             1,                                         // 75/48
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 76/49
             1,                                         // 73r2/50
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 74r2/51
             1,                                         // 75r2/52
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 77/53
             1,  // 78/54
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 79/55
             1, // 80/56
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 81/57
             1, // 82/58
             1/8, 1/4, 1/8, 1/8, 1/8, 1/8, 1/16, 1/16,  // 83/59
             1, // 84/60

           ],

  barAnnotations: { "1":"Intro", "6":"(RH ABABABAB=trill)",
                    "7":"(verse 1)&nbsp;&nbsp;&nbsp;I'm",
                    "8":"&nbsp;&nbsp;sail&mdash;ing&nbsp;&nbsp;......&nbsp; a&mdash;",
                    "9":"&mdash;way,",
                    "11":"&nbsp;...............&nbsp;set an o&mdash;pen ",
                    "12":"course...............&nbsp;for the",
                    "13":"vir &mdash; gin sea, &mdash;",
                    "14":"... ... ... 'cause",
                    "15":"I've ... ... ...",
                    "16":"got to &mdash; be",
                    "17":"free, &mdash;",
                    "19":" ... ... free to face the",
                    "20":"life ... ... that's a&ndash;",
                    "21":"&ndash;head of me ...",
                    "23":"... On board I'm the",
                    "24":"cap &ndash; tain,",
                    "25":"... so climb a &ndash; ",
                    "26":"board.",
                    "27":"... We'll search for to &ndash;",
                    "28":"mor &ndash; row",
                    "29":"... on ev &ndash; 'ry",
                    "30":"shore. ... And I'll",
                    "31":"try,",
                    "32":"oh, Lord, &mdash; I'll &mdash;",
                    "33":"try &mdash;",
                    "35":"&mdash;to car&mdash;",
                    "36":"&mdash; &mdash; ry",
                    "37":"on &mdash; &mdash; &mdash;",
                    "44":"(PRECHORUS)",
                    "50": "__ __ __ A",
                    "51": "gath - er -ing__ of",
                    "52": "an - gels__ ap-",
                    "53": "peared a - bove my__ head__",
                    "54": "_ _ _ They",
                    "55": "sang to me this",
                    "56": "song of hope and",
                    "57": "this is what__ they said,",
                    "58": "__ they said,",
                    "59": "(CHORUS) REP4: Come sail a - way, come__",
                    "60": "sail a - way, come",
                    "61": "sail away with me",
                    "62": "END_REP4",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: true, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'WSP',
  category: 'repertoire',
  fullName: "A Whiter Shade of Pale, by Procol Harum",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 60,
  midiVoice: 19,
  leftHand: [
    C3, -1, C3, B2, -1, B2,   // bar 1, Intro
    A2, -1, A2, G2, -1, G2,   // bar 2
    F2, -1, F2, E2, -1, E2,   // bar 3
    D2, -1, D2, C2, -1, C2,   // bar 4
    G2, -1, G2, F2, -1, F2,   // bar 5
    E2, -1, E2, D2, -1, D2,   // bar 6
    C2, E2, F2, -1, F2,       // bar 7
    G2, A2, B2,                 // bar 8 end of intro

    //Verse (incomplete)
    C3, -1, C3, B2, -1, B2,   // bar 1, Intro
    A2, -1, A2, G2, -1, G2,   // bar 2
    F2, -1, F2, E2, -1, E2,   // bar 3
    D2, -1, D2, C2, -1, C2,   // bar 4
    G2, -1, G2, F2, -1, F2,   // bar 5
    E2, -1, E2, D2, -1, D2,   // bar 6
    C2, E2, F2, -1, F2,       // bar 7

    C3, -1, C3, B2, -1, B2,   // bar 9
    A2, -1, A2, G2, -1, G2,   // bar 10
   ],
  leftDur: [
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 1 intro
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 2
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 3
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 4
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 5
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 6
    1/4, 1/4, 1/4, 1/8, 1/8,          // bar 7
    1/2, 1/4, 1/4,                    // bar 8 end of intro

    // verse (incomplete)
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 9
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 10
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 11
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 12
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 13
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 14

    // voice version ... not used yet
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 9
    1/4, 1/8, 1/8, 1/4, 1/8, 1/8,     // bar 10
  ],
  rightHand: [
  /*[*/ E4, /* C4, G3],*/        // bar 1, intro. Note ties to next bar
        D4, C4, B3, C4, D4, E4, C4,   // bar 2
  /*[*/ A4, /* F4, C4],*/ B4, C5,     // bar 3
  /*[*/ F4, /* D4, A3],*/ E4, F4, D4, // bar 4
  /*[*/ B4, /* G4, D4],*/ C5, D5,     // bar 5
  /*[*/ G4, /* E4, B3],*/ F4, G4, F4, E4, F4,  // bar 6
/*[*/ F4, /* C4, G3],*/ E4, D4, C4, [C4, A4], D4, E4, F4,         // bar 7
  [ B3, G4], C4, D4, E4, [F4, A3], E4, [F4, B3], D4, // bar 8, end of intro

// Verse
[G3, C4, E4], [G3, C4, E4],   // 9
[G3, B3, E4], [G3, B3, E4],   // 10 we skipped a light
[A3, C4, E4], [A3, C4, E4],   // 11 fandango
[G3, C4, E4], [G3, C4, E4],
[A3, C4, F4], [A3, C4, F4],   // 13 ... turned
[A3, C4, E4], [A3, C4, E4],   // 14 cartwheels a-
[A3, D4, F4], [A3, D4, F4],   // 15 cross the floor
[A3, C4, F4], [A3, C4, F4],
[B3, D4, G4], [B3, D4, G4],   // 17 ... I was
[B3, D4, G4], [B3, D4, G4],   // 18 feeling kind of
[B3, E4, G4], [B3, E4, G4],   // 19 seasick
[B3, D4, G4], [B3, D4, G4],

// repeat first part of verse:
[G3, C4, E4], [G3, C4, E4],   // 21 .. but the crowd
[G3, B3, E4], [G3, B3, E4],   // 22 called out for more
[A3, C4, E4], [A3, C4, E4],
[G3, C4, E4], [G3, C4, E4],
[A3, C4, F4], [A3, C4, F4],
[A3, C4, E4], [A3, C4, E4],   // 26 the room was humming
[A3, D4, F4], [A3, D4, F4],   // 27 harder
[A3, C4, F4], [A3, C4, F4],
[B3, D4, G4], [B3, D4, G4],   // 29 ... as
[B3, D4, G4], [B3, D4, G4],   // 30 the ceiling flew
[B3, E4, G4], [B3, E4, G4],   // 31 away
[B3, D4, G4], [B3, D4, G4],

// finish off verse: (partial repeat)
[G3, C4, E4], [G3, C4, E4],   // 33 ... when we called
[G3, B3, E4], [G3, B3, E4],   // 34 for a-
[A3, C4, E4], [A3, C4, E4],   // 35 'nother drink
[G3, C4, E4], [G3, C4, E4],
[A3, C4, F4], [A3, C4, F4],
[A3, C4, E4], [A3, C4, E4],   // 38 the waiter brought
[A3, D4, F4], [A3, D4, F4],   // 39 a tray

// refrain
[B3, D4, F4], [B3, D4, F4], // and so
[G3, C4, E4], [G3, C4, E4], // it ... waaaaas
[G3, B3, E4], [G3, B3, E4], // that la- a - a-
[A3, C4, E4], [A3, C4, E4], // -ter
[G3, C4, E4], [G3, C4, E4],

[A3, C4, F4], [A3, C4, F4], // ... as
[A3, C4, E4], [A3, C4, E4], // the miller told his
[A3, D4, F4], [A3, D4, F4], // tale

[A3, C4, F4], [A3, C4, F4],
[B3, D4, F4], [G3, C4, E4], // ... that her
[B3, D4, G4], [B3, D4, G4], // face at first
[B3, E4, G4], [B3, E4, G4], // just ghostly
[B3, D4, G4], [B3, D4, G4], // ... turned
[G3, C4, E4], [G3, C4, E4], // a whiter
[A3, C4, F4], [A3, C4, F4], // ... shade of
[G3, C4, E4], [G3, C4, E4], // pale
[B3, D4, F4], [B3, D4, F4],
// now back to interlude, then another verse, another interlude, a final chorus

  // verse with notes for lyrics

  /*[*/ E4, /* C4, G3],*/ -1, G4, E5, D5, E5, D5,       // bar XX "... We skipped the light fan--"
  D5, C5,                                               // bar XX+1 "--dan-go"

  ],
  rightDur: [
  /*[*/ 1.125, /* 1.25, 2, ], */  // bar 1, note ties to next bar
     1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,  // bar 2
  /*[*/ 3/4, /* 1, 1, ],*/ 1/8, 1/8,     // bar 3
  /*[*/ 1/16, /* 1, 1, ],*/ 1/16, 5/8, 1/4,  // bar 4
  /*[*/ 3/4, /* 1, 1, ],*/ 1/8, 1/8,         // bar 5
  /*[*/ 1/16, /* 1/2, 1, ],*/ 1/16, 1/2, 1/8, 1/8, 1/8,  // bar 6, yeah its complicated with all the ties
  1/8, 1/8, 1/8, 1/8, [1/8,1/2], 1/8, 1/8, 1/8,    // bar 7
  [1/8,1/2], 1/8, 1/8, 1/8, [1/8,1/4], 1/8, [1/8,1/4], 1/8,    // bar 8, end of intro

  // Verse
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,
1/4,1/4,1/4,1/4,


  1/4, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,    // bar 9 NOTE: the first 1/4 is really 1/2 sustained to the following 1/8
  1/8, 7/8,                             // bar 10
  ],

  barAnnotations: {
    "1":"Intro", "8":"End of Intro",
    "9":"&mdash; We skipped the light fan&ndash;",
    "10":"&mdash;dan-go,",
    "11":"... and turned cart-wheels 'cross the",
    "12":"floor.",
    "13":"... I was feel&ndash;ing kind of",
    "14":"sea &ndash; sick,",
  },
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: false, LegQ: false, StaQ: false}
});

presets.push({
  name: 'ICSCN-CO',
  category: 'repertoire',
  fullName: "I Can See Clearly Now, chords only",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 127,
  midiVoice: 0,
  leftHand: [
      // intro
      D2, D2, D2,

      // VERSE
      D2, G2, D2, D2,
      D2, G2, A1, A1,
      D2, G2, D2, D2,
      C2, G2, D2, D2,
      C2, G2, D2, D2,

      // Bridge
      F2, F2, C2, C2,
      F2, F2, A1, A1,
      C2s, G2, C2s, G2,
      C2, B1, A1, A1,
   ],
  leftDur: [
    1
  ],
  rightHand: [
    // intro
    [A2,D3,F3s],[A2,D3,F3s],[A2,D3,F3s],

    // Verse
    [A2,D3,F3s], [B2,D3,G3], [A2,D3,F3s], [A2,D3,F3s], // D G D D
    [A2,D3,F3s], [B2,D3,G3], [A2,C3s,E3], [A2,C3s,E3], // D G A A
    [A2,D3,F3s], [B2,D3,G3], [A2,D3,F3s], [A2,D3,F3s], // D G D D
    [C3,E3, G3], [B2,D3,G3], [A2,D3,F3s], [A2,D3,F3s], // C G D D
    [C3,E3, G3], [B2,D3,G3], [A2,D3,F3s], [A2,D3,F3s], // C G D D  bar 23

    // Bridge starts at bar 24
    [A2,C3,F3], [A2,C3,F3], [C3,E3, G3], [C3,E3, G3],      // F F C C
    [A2,C3,F3], [A2,C3,F3], [A2,C3s,E3], [A2,C3s,E3],      // F F A A
    [C3s, E3, G3s], [B2,D3,G3], [C3s, E3, G3s], [B2,D3,G3],   //C#m G C#m G
    [C3,E3, G3], [B2, D3, F3s], [A2,C3s,E3], [A2,C3s,E3],   // C Bm A A
  ],
  rightDur: [
    1
  ],

  barAnnotations: {
    "1":"Intro [Dx3]",
    "4": "Verse [D G D D/D G A A/D G D D/C G D D x2]",
    "24": "Bridge [F F C C/F F A A/C#m G C#m G/C Bm A A]",

  },
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: false, LegQ: false, StaQ: false}
});


presets.push({
  name: 'MM-1',
  fullName: 'Metamorphosis 1 by Philip Glass',
  category: 'repertoire',
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 110,
  midiVoice: 0,
  leftHand: [
    G3, B3, G3, B3, G3, B3, G3, B3
   ],
  leftDur: [
    1/8
  ],
  rightHand: [


  ],
  rightDur: [
    1/2
  ],

  barAnnotations: {

  },
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: false}
});

presets.push({
  name: 'WTCP1', // JS Bach Well Tempered Clavier, Prelude 1 in C Major
  category: 'repertoire',
  fullName: "Prelude 1 in C Major, BWV 846 by JS Bach",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 65,
  maxBPM: 85,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note
  leftHand: [
    C4, E4, C4, E4, // bar 1 CE
    C4, D4, C4, D4, // bar 2 CD
    B3, D4, B3, D4, // bar 3 BD
    C4, E4, C4, E4, // bar 4 CE
    C4, E4, C4, E4, // bar 5 CE
    C4, D4, C4, D4, // bar 6 CD
    B3, D4, B3, D4, // bar 7 BD
    B3, C4, B3, C4, // bar 8 BC
    A3, C4, A3, C4, // bar 9 AC
    D3, A3, D3, A3, // bar 10 DA
    G3, B3, G3, B3, // bar 11 GD
    G3, A3s, G3, A3s, // bar 12
    F3, A3, F3, A3, // bar 13
    F3, G3s, F3, G3s, // bar 14
    E3, G3, E3, G3,   // bar 15
    E3, F3, E3, F3,   // bar 16 ElF
    D3, F3, D3, F3,   // bar 17 DoF (a hat)
    G2, D3, G2, D3,   // bar 18 GooD
    C3, E3, C3, E3,   // bar 19 ColE
    C3, G3, C3, G3,   // bar 20 CaGey
    F2, F3, F2, F3,   // bar 21 FluFf
    F2s, C3, F2s, C3,  // bar 22 sharp FiCus
    G2s, F3, G2s, F3,  // bar 23 sharp GuFf
    G2, F3, G2, F3,    // bar 24 GuFf
    G2, E3, G2, E3,    // bar 25 GEE
    G2, D3, G2, D3,    // bar 26 GooD
    G2, D3, G2, D3,    // bar 27 GooD
    G2, D3s, G2, D3s,  // bar 28 GooD sharp
    G2, E3, G2, E3,    // bar 29 GEE
    G2, D3, G2, D3,    // bar 30 GooD
    G2, D3, G2, D3,    // bar 31 GooD
    C2, C3, C2, C3,    // bar 32 CooKie
    C2, C3, -1, -1,    // bar 33, CooKie IMPLEMENT: These are actually slurred across the entire measure with the C3 coming 1/8th rest after the C2
    C2, B2, -1, -1,    // bar 34, CuB    IMPLEMENT: These are actually slurred same way as measure 33
    C2, C3             // IMPLEMENT: these are actually chorded for the whole measure
  ],
  leftDur: [
    1/16, 7/16, 1/16, 7/16 // all bars same (except last 3)
  ],
  leftHold: [
    1/2, 3/8, 1/2, 3/8    // all bars same (except last 3)
  ],
  rightHand: [
    -1, G4, C5, E5, G4, C5, E5, -1, G4, C5, E5, G4, C5, E5, // bar 1
    -1, A4, D5, F5, A4, D5, F5, -1, A4, D5, F5, A4, D5, F5, // bar 2
    -1, G4, D5, F5, G4, D5, F5, -1, G4, D5, F5, G4, D5, F5, // bar 3
    -1, G4, C5, E5, G4, C5, E5, -1, G4, C5, E5, G4, C5, E5, // bar 4
    -1, A4, E5, A5, A4, E5, A5, -1, A4, E5, A5, A4, E5, A5, // bar 5
    -1, F4s, A4, D5, F4s, A4, D5, -1, F4s, A4, D5, F4s, A4, D5, // bar 6 FAD
    -1, G4, D5, G5, G4, D5, G5, -1, G4, D5, G5, G4, D5, G5, // bar 7 GooDyGood
    -1, E4, G4, C5, E4, G4, C5, -1, E4, G4, C5, E4, G4, C5, // bar 8 EGgCream
    -1, E4, G4, C5, E4, G4, C5, -1, E4, G4, C5, E4, G4, C5, // bar 9 EGgCream
    -1, D4, F4s, C5, D4, F4s, C5, -1, D4, F4s, C5, D4, F4s, C5, // bar 10 DeepFaKe
    -1, D4, G4, B4, D4, G4, B4, -1, D4, G4, B4, D4, G4, B4, // bar 11 DoGBite
    -1, E4, G4, C5s, E4, G4, C5s, -1, E4, G4, C5s, E4, G4, C5s, // bar 12 EGgCream sharp
    -1, D4, A4, D5, D4, A4, D5, -1, D4, A4, D5, D4, A4, D5,   // bar 13 DAD
    -1, D4, F4, B4, D4, F4, B4, -1, D4, F4, B4, D4, F4, B4,  // bar 14 DeFiB
    -1, C4, G4, C5, C4, G4, C5, -1, C4, G4, C5, C4, G4, C5,  // bar 15 CaGeCow
    -1, A3, C4, F4, A3, C4, F4, -1, A3, C4, F4, A3, C4, F4, // bar 16 Ape CuFf
    -1, A3, C4, F4, A3, C4, F4, -1, A3, C4, F4, A3, C4, F4, // bar 17 Ape CuFf
    -1, G3, B3, F4, G3, B3, F4, -1, G3, B3, F4, G3, B3, F4, // bar 18 GruboFf
    -1, G3, C4, E4, G3, C4, E4, -1, G3, C4, E4, G3, C4, E4, // bar 19 GeCko Ear
    -1, A3s, C4, E4, A3s, C4, E4, -1, A3s, C4, E4, A3s, C4, E4, // bar 20 sharp ACE
    -1, A3, C4, E4, A3, C4, E4, -1, A3, C4, E4, A3, C4, E4,     // bar 21 ACE
    -1, A3, C4, D4s, A3, C4, D4s, -1, A3, C4, D4s, A3, C4, D4s, // bar 22 ACE flat
    -1, B3, C4, D4, B3, C4, D4, -1, B3, C4, D4, B3, C4, D4,     // bar 23 BeaKeD
    -1, G3, B3, D4, G3, B3, D4, -1, G3, B3, D4, G3, B3, D4,     // bar 24 GruBbeD
    -1, G3, C4, E4, G3, C4, E4, -1, G3, C4, E4, G3, C4, E4,     // bar 25 GeCko Ear
    -1, G3, C4, F4, G3, C4, F4, -1, G3, C4, F4, G3, C4, F4,     // bar 26 GeCko Foot
    -1, G3, B3, F4, G3, B3, F4, -1, G3, B3, F4, G3, B3, F4,     // bar 27 GruB Go
    -1, A3, C4, F4s, A3, C4, F4s, -1, A3, C4, F4s, A3, C4, F4s, // bar 28 Ape CuFf sharp
    -1, G3, C4, G4, G3, C4, G4, -1, G3, C4, G4, G3, C4, G4,     // bar 29 GeCko Goo
    -1, G3, C4, F4, G3, C4, F4, -1, G3, C4, F4, G3, C4, F4,     // bar 30 GeCko Foot
    -1, G3, B3, F4, G3, B3, F4, -1, G3, B3, F4, G3, B3, F4,     // bar 31 GruB Foot
    -1, G3, A3s, E4, G3, A3s, E4, -1, G3, A3s, E4, G3, A3s, E4, // bar 32 GrApe EEl
    // the bars below have different durations than usual
    -1, F3, A3, C4, F4, C4, F3, C4, A3, F3, A3, F3, D3, F3, D3, // bar 33
    -1, G4, B4, D5, F5, D5, B4, D5, B4, G4, B4, D4, F4, E4, D4, // bar 34
    C5   // IMPLEMENT: bar 35 is reall a chord of E4,G4,C5, i.e. c maj chord first inversion
  ],
  rightDur: [
    // the first 32 measures all have the same durations
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,

    // measures 33, 33, 35 have different durations
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1

  ],

  barAnnotations: {
    1: "CoLe GraCE", 2: "CoD ADolF", 3:"BaD GanDolF", 4:"", 5:"",
    6:"FAD", 7:"BeD GooDyGood", 8:"BC EGgCream", 9:"AC EGgCream",
    10:"DA DeepFaKe", 11:"GooD DoGBite", 12:"GA EGgCream sharp",
    13:"FA DAD", 14:"FA# DeFiB", 15:"EGg CaGeCow", 16:"ElF Ape CuFf",
    17:"DoFf Ape CuFf", 18:"GooD GruBoFf", 19:"CElery GeCko Ear",
    20:"CaGy ACE sharp", 21:"FluFf ACE", 22:"sharp FiCus ACE flat",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'ICHFIL', // Elvis Presley, arpeggio version
  category: 'repertoire',
  fullName: "Can't Help Falling In Love",
  beatsPerBar: 6,
  beatDur: 1/8,
  targetBPM: 205,
  maxBPM: 250,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note

  leftHand: [
    // intro
    D2, A2, D2, -1,
    // verse
    D2,
    F2s,
    B2,
    A2,
    G2,
    D2,
    A2,
    A2,
    G2,
    A2,
    B2,
    G2,
    D2,
    A2,
    D2,
    -1, // verse outtro


// chorus:
    F2s, C2s, F2s, C2s, F2s, C2s, F2s, B1, E2, A1,

// final verse ending:
    D2,
    A2,
    D2,
    D2,
    -1, // verse outtro
    D2
  ],
  rightHand: [
    // intro
    -1, D4, F4s, A4, F4s, D4,
    -1, A3, C4s, E4, C4s, A3,
    -1, F3s, A3, D4, A3, F3s,
    F4s, D4, A3, A4, F4s, D4, // inversion ending

    // verse
    -1, D4, F4s, A4, F4s, D4,
    -1, C4s, F4s, A4, F4s, C4s,
    -1, B3, D4, F4s, D4, B3,
    -1, B3, D4, F4s, D4, B3,
    -1, B3, D4, G4, D4, B3,
    -1, A3, D4, F4s, D4, A3,
    -1, A3, C4s, E4, C4s, A3,
    -1, A3, C4s, E4, C4s, A3,
    -1, B3, D4, G4, D4, B3,
    -1, C4s, E4, G4, E4, C4s,
    -1, D4, F4s, B4, F4s, D4,
    -1, B3, D4, G4, D4, B3,
    -1, A3, D4, F4s, D4, A3,
    -1, A3, C4s, E4, C4s, A3,
    -1, F3s, A3, D4, A3, F3s,
    F4s, D4, A3, A4, F4s, D4, // normal inversion ending

    // chorus:
    -1, C4s, F4s, A4, F4s, C4s,
    -1, F4, G4s, B4, G4s, F4,
    -1, C4s, F4s, A4, F4s, C4s,
    -1, F4, G4s, B4, G4s, F4,
    -1, C4s, F4s, A4, F4s, C4s,
    -1, F4, G4s, B4, G4s, F4,
    -1, C4s, F4s, A4, F4s, C4s,
    -1, D4s, F4s, A4, F4s, D4s,
    -1, B3, E4, G4, E4, B3,
    -1, C4s, E4, G4, E4, C4s,

    // final verse ending variation:
    -1, B3, D4, G4, D4, B3,
    -1, A3, D4, F4s, D4, A3,
    -1, C4s, E4, A4, E4, C4s,
    -1, D4, F4s, A4, F4s, D4,
    D5, A4, F4s, F5s, D5, A4,
    D5, F5s, A5 // this is "rolled" in reality

  ],
  leftDur: [
    6/8,
  ],
  rightDur: [
    1/8,
  ],

  barAnnotations: {
    1: "(Intro)", 4:"(end of Intro)",
    5: "(verse 1) Wise", 6:"Men", 7:"Say", 8:"Only fools", 9:"Rush", 11:"in", 13:"But I",
    14:"Can't", 15:"Help", 16:"Falling", 17:"In love", 18:"With", 19:"you",

    21:"(Chorus) Like a river", 22:"Flows", 23:"Surely to the", 24: "Sea",
    25:"Darling so it", 26:"Goes", 27:"Some things", 29:"Were meant to", 30:"Be",

    31:"(Final verse alternative outtro)",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'HYESTR', // CCR
  category: 'repertoire',
  fullName: "Have You Ever Seen The Rain?",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 116,
  maxBPM: 250,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note

  leftHand: [
    // intro
    A2, A2,
    F2, F2,
    C3, C3,
    A2, G2, E2, E2, G1,
    C2, C2,
    C3, B2, A2, G2, G2,

    // verse
    C2, C2, G2,   // bar 7
    C2, C2, G2,   //
    C2, C2, G2,   //
    C2, C2, E2, F2,   // bar 10

    G2, G2, D3,
    G2, G2, D3,

    C2, C2, G2,
    C2, C2, D2, E2,   // bar 14
      // repeat first part of verse
    C2, C2, G2,   // bar 15
    C2, C2, G2,   //
    C2, C2, G2,   //
    C2, C2, E2, F2,  // bar 18

    G2, G2, D3,
    G2, G2, D3,

    C2, C2, G2,
    C2, C2, D2, E2,   // bar 22

    //////// CHORUS //////////
    F2, F2, F2,          // bar 23
    G2, G2, G2,
    C3, C3, B2, B2,        // bar 25 starts left hand "walkdown"
    A2, A2, G2, G2,

    // repeat first part
    F2, F2, F2,          // bar 27
    G2, G2, G2,
    C3, C3, B2, B2,      // bar 29 starts left hand "walkdown"
    A2, A2, G2, G2,

    // chorus outtro "coming down on a sunny day"
    F2, F2, F2,    // bar 31
    G2, G2, G2,
    C2, C2, C2,
    C3, B2, A2, G2, G2, // C walkdown
    C2,
    ///// OUTTRO ///////


  ],
  rightHand: [
    // intro
    [A3, C4, E4],     [A3, C4, E4],     [A3, C4, E4],     [A3, C4, E4], // Aroot
    [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4], // Finv2
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Cinv1
    [G3, B3, D4],
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Groot
    [G3, C4, E4],

    // verse
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // bar 7 Cinv1
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // bar 10

    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot
    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot

    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Cinv1
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],

// repeat first part of verse
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // bar 15 Cinv1
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // bar 18

    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot
    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot

    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Cinv1
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],

    // Chorus
    [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4], // bar 23    Finv2
    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Cinv1 then Cinv1/B
    [A3, C4, E4],     [A3, C4, E4],     [A3, C4, E4],     [A3, C4, E4], // Amroot then Amroot/G

            // repeat first part of CHORUS
    [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4], // Finv2
    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Cinv1 then Cinv1/B
    [A3, C4, E4],     [A3, C4, E4],     [A3, C4, E4],     [A3, C4, E4], // Amroot then Amroot/G

    // chorus outtro
    [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4],     [A3, C4, F4], // bar 31   Finv2
    [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4],     [G3, B3, D4], // Groot
    [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4],     [G3, C4, E4], // Cinv1
    [G3, C4, E4],
    [G3, C4, E4],
  ],
  leftDur: [
  // intro
    3/8, 5/8,
    3/8, 5/8,
    3/8, 5/8,
    1/8, 1/4, 1/4, 1/8, 1/4,
    3/8, 5/8,
    1/8, 1/4, 1/4, 1/8, 1/4,

    // verse
    3/8, 3/8, 1/4, // bar 7
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 1/8, 1/4, 1/4, // bar 10, walk-down
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 1/8, 1/4, 1/4, // bar 14 walk-down

    // repeat first part of verse
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 1/8, 1/4, 1/4, // bar 18 walk-down
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    3/8, 1/8, 1/4, 1/4, // bar 22 walk-down

    /////// chorus //////////
    3/8, 4/8, 1/8, // bar 23
    3/8, 4/8, 1/8,
    3/8, 1/8, 3/8, 1/8, // bar 25, walk down
    3/8, 1/8, 3/8, 1/8,

    3/8, 4/8, 1/8, // bar 27, repeat first four bars of chorus
    3/8, 4/8, 1/8,
    3/8, 1/8, 3/8, 1/8, // bar 29, walk down
    3/8, 1/8, 3/8, 1/8,

    // chorus outtro
    3/8, 3/8, 1/4,  // bar 31
    3/8, 3/8, 1/4,
    3/8, 3/8, 1/4,
    1/8, 1/4, 1/4, 1/8, 1/4,
    1,


    /////// entire song outtro /////////

  ],
  rightDur: [
  // intro
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1,
    1/4,1/4,1/4,1/4,
    1,
    // verse
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,

    // chorus
    1/4,1/4,1/4,1/4, // bar 23
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4, // bar 30
    // chorus outtro
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1/4,1/4,1/4,1/4,
    1,
    1,
    // outtro

  ],

  barAnnotations: {
    1: "(Intro)",
    7: "(Verse) Someone Told me",
    23: "(Chorus)"
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'Clocks', // Coldplay
  category: 'repertoire',
  fullName: "Clocks by Coldplay",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 130,
  maxBPM: 150,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note

  leftHand: [
    // intro/chorus/outtro
    E3b, B2b, G2, E3b, B2b, G2, E3b, B2b,
    D3b, B2b, F2, D3b, B2b, F2, D3b, B2b,
    D3b, B2b, F2, D3b, B2b, F2, D3b, B2b,
    C3, A2b, F2, C3, A2b, F2, C3, A2b,
    E3b, B2b, G2, E3b, B2b, G2, E3b, B2b,
    D3b, B2b, F2, D3b, B2b, F2, D3b, B2b,
    D3b, B2b, F2, D3b, B2b, F2, D3b, B2b,
    C3, A2b, F2, C3, A2b, F2, C3, A2b,

    // verse
    E3b,
    B3b,
    F3,
    E3b,
    E3b,
    B3b,
    F3,
    E3b,

    // chorus variation
    [E4b, B3b, G3],
    [D4b, B3b, F3],
    [D4b, B3b, F3],
    [C4, A3b, F3],
    [E4b, B3b, G3],
    [D4b, B3b, F3],
    [D4b, B3b, F3],
    [C4, A3b, F3],

    // bridge
    G2b, G2b,
    -1,
    D3b, D3b,
    A3b, A3b,
    G2b, G2b,
    -1,
    D3b, D3b,
    A3b, A3b,
  ],
  rightHand: [
    // intro/chorus/outtro
    E4b, B3b, G3, E4b, B3b, G3, E4b, B3b,
    D4b, B3b, F3, D4b, B3b, F3, D4b, B3b,
    D4b, B3b, F3, D4b, B3b, F3, D4b, B3b,
    C4, A3b, F3, C4, A3b, F3, C4, A3b,
    E4b, B3b, G3, E4b, B3b, G3, E4b, B3b,
    D4b, B3b, F3, D4b, B3b, F3, D4b, B3b,
    D4b, B3b, F3, D4b, B3b, F3, D4b, B3b,
    C4, A3b, F3, C4, A3b, F3, C4, A3b,

    // verse
    [G4, B4b, E5b],
    [F4, B4b, D5b, E5b],
    [E4b, A4b, C5],
    [G4, B4b, E5b],
    [G4, B4b, E5b],
    [F4, B4b, D5b, E5b],
    [E4b, A4b, C5],
    [G4, B4b, E5b],

    // chorus variation
    A5b, G5, E5b, A5b, G5, E5b, A5b, G5,
    A5b, G5, D5b, A5b, G5, D5b, A5b, G5,
    A5b, G5, D5b, A5b, G5, D5b, A5b, G5,
    A5b, G5, C5,  A5b, G5, C5,  A5b, G5,
    A5b, G5, E5b, A5b, G5, E5b, A5b, G5,
    A5b, G5, D5b, A5b, G5, D5b, A5b, G5,
    A5b, G5, D5b, A5b, G5, D5b, A5b, G5,
    A5b, G5, C5,  A5b, G5, C5,  A5b, G5,

    // bridge
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],

    [A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],
    [A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],

    [A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],
    [A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],

    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],
    [B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],[B3b, D4b, F4],

    [A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],
    [A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],[A3b, D4b, F4],

    [A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],
    [A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],[A3b, C4, E4b, F4],

  ],
  leftDur: [
  // intro/chorus/outtro
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,

  // VERSE
  1,1,1,1,1,1,1,1,

  // chorus variation
  1,1,1,1,1,1,1,1,

  // bridge
  1/4, 3/4,
  1,
  1/4, 3/4,
  1/4, 3/4,
  1/4, 3/4,
  1,
  1/4, 3/4,
  1/4, 3/4,

  ],

  rightDur: [
  // intro/chorus/outtro
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,

  // Verse
  1,1,1,1,1,1,1,1,   // bars 9-16

  // Chorus variation
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // bar 17
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,

  // bridge
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, // bar 25
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,

  ],

  barAnnotations: {
    1: "(Intro/Chorus/Outtro)",
    9: "(Verse)",
    17: "(Chorus Variation)",
    25: "(Bridge) And nothing else compares"
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});


presets.push({
  name: 'HRS', // The Animals
  category: 'repertoire',
  fullName: "House of the Rising Sun",
  beatsPerBar: 6,
  beatDur: 1/4,
  targetBPM: 220,
  maxBPM: 250,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note

  leftHand: [
    // intro
    A2, E3, -1,   // Am
    C3, E3, -1,   // C
    D3, -1, -1,   // D
    F3, -1, -1,   // F
    A2, E3, -1,   // Am
    E2, E3, -1,   // E
    A2, E3, -1,   // Am
    E2, E3, -1,   // E

    // verse (starting at bar 9)
    A2, E3, -1,   // Am
    C3, E3, -1,   // C
    D3, -1, -1,   // D
    F3, -1, -1,   // F

    A2, E3, -1,   // Am
    C3, E3, -1,   // C
    E2, E3, -1,   // E
    E2, E3, -1,   // E

    A2, E3, -1,   // Am
    C3, E3, -1,   // C
    D3, -1, -1,   // D
    F3, -1, -1,   // F

    A2, E3, -1,   // Am
    E2, E3, -1,   // E

    A2, E3, -1,   // Am
    C3, E3, -1,   // C
    D3, -1, -1,   // D
    F3, -1, -1,   // F

    A2, E3, -1,   // Am
    E2, E3, -1,   // E
    A2, E3, -1,   // Am
    E2, E3, -1,   // E

    // organ solo, just simple single notes in left hand for now
    A2, C3, D3, F3, A2, C3, E2, E2, A2, C3, D3, F3, A2, E2, A2, C3, D3, F3, A2, E2, A2, E2,

    // outtro:

  ],
  rightHand: [
    // intro
    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3, C4, E4, C4, G3,   // C
    -1, A3, D4, F4s, F4s, D4, A3, // D
    -1, A3, C4, F4, F4, C4, A3,   // F
    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3s, B3, E4, B3, G3s, // E
    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3s, B3, E4, B3, G3s, // E

    // verse

    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3, C4, E4, C4, G3,   // C    BAR 10
    -1, A3, D4, F4s, F4s, D4, A3, // D
    -1, A3, C4, F4, F4, C4, A3,   // F

    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3, C4, E4, C4, G3,   // C
    -1, -1, G3s, B3, E4, B3, G3s, // E
    -1, -1, G3s, B3, E4, B3, G3s, // E

    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3, C4, E4, C4, G3,   // C
    -1, A3, D4, F4s, F4s, D4, A3, // D
    -1, A3, C4, F4, F4, C4, A3,   // F    BAR 20

    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3s, B3, E4, B3, G3s, // E

    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3, C4, E4, C4, G3,   // C
    -1, A3, D4, F4s, F4s, D4, A3, // D
    -1, A3, C4, F4, F4, C4, A3,   // F

    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3s, B3, E4, B3, G3s, // E
    -1, -1, A3, C4, E4, C4, A3,   // Am
    -1, -1, G3s, B3, E4, B3, G3s, // E    BAR 30

    // Organ Solo

    E4, A4, E4, B4, E4, C5,  // bar 31

    D5, D5s, E5, // "crushed E5"
    D5, D5s, E5, // "crushed E5", finger sustain the second E5 using thumb
    D5, D5s, E5, // "crushed E5"
    D5, D5s, E5, // "crushed E5"
    D5, D5s, E5, // "crushed E5"
    D5s, D5, C5, A4, G4s, G4, G4s, A4,




    D5s, D5, C5, A4,  // lick after crushed E's

    G4, G4s, A4, G4, A4, // the first three notes are a slide A4

    G6, G6s, A6,  // slide
    G6, G6s, A6,  // slide
    F6, F6s, G6,  // slide
    F6, F6s, G6,  // slide

    D5s, E5, G5,     D5s, E5, G5,    D5s, E5, G5,   D5s, E5, G5,
  ],
  leftDur: [
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1/4, 1/8, 9/8,
    1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5,
    1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5
  ],
  rightDur: [
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,
    1/4, 1/8, 1/8, 1/4, 1/4, 1/4, 1/4,

    // organ solo
    1/4, 1/4, 1/4, 1/4, 1/4, 1/2,

    // crushed E5s:
    0,0,1/4,   0,0,1/4,   0,0,1/2,   0,0,1/4,   0,0,1/4,
    0,1/4,1/4,1/4,0, 1/4, 0, 1/4,

    1/4, 1/4, 1/4, 1/4, 1/4, 1/4, 1/4,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,


    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
    1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8,
  ],

  barAnnotations: {
    1: "(Intro)",
    9: "(Verse) There is",
    31: "Organ Solo",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'HCf', // The Eagles
  category: 'repertoire',
  fullName: "Hotel California, full arps",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 78,
  maxBPM: 180,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note
  isFreePlay: false,

  leftHand: [
    // verse
    A2, C3, E3, -1, E3,  // bar 1  Am
    E2, B2, E3, -1,  // E7
    G2, B2, D3, -1, D3,  // G
    D2, A2, D3, -1,  // D
    F2, C3, F3, -1, F3,  // bar5  F
    C2, G2, C3, -1,  // C
    D2, A2, D3, -1, D3, // Dm
    E2, B2, E3, -1,  // E7
    // Chorus
    F2, C3, F3, -1, F3, // bar 9  F
    C2, G2, C3, -1,  // C
    E2, B2, E3, -1, E3, // E7
    A2, C3, E3, -1,  // Am
    F2, C3, F3, -1, F3, // F
    C2, G2, C3, -1,  // C
    D2, A2, D3, -1, D3, // Dm   bar 15
    E2, B2, E3, -1,  // E7

    // Verse, fancier arpeggiation #1
    A2, C3, E3, -1, E3,  // bar 1  Am
    E2, B2, E3, -1,  // E7

  ],
  rightHand: [
    // verse
    -1, A3, C4, E4, C4, A3, -1, // Am
    -1, G3s, B3, D4, // E7
    -1, G3, B3, D4, B3, G3, -1, // G
    -1, F3s, A3, D4, // D
    -1, A3, C4, F4, C4, A3, -1, // F
    -1, G3, C4, E4, // C
    -1, F3, A3, D4, A3, F3, -1, // Dm
    -1, G3s, B3, D4, // E7
    // chorus
    -1, A3, C4, F4, C4, A3, -1, // F bar 9
    -1, G3, C4, E4, // C
    -1, G3s, B3, D4, B3, G3s, -1, // E7
    -1, A3, C4, E4,  // Am
    -1, A3, C4, F4, C4, A3, -1, // F
    -1, G3, C4, E4, // C
    -1, F3, A3, D4, A3, F3, -1, // Dm  bar 15
    -1, G3s, B3, D4, // E7

    // Verse, fancier arp, variation #1
    -1, A3, C4, A3, E4, C4, A3, -1, // Am
    -1, G3s, B3, G3s, D4, // E7
  ],
  leftDur: [
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,

    // fancier arps
    1/8, 1/16, 1/16,      1/2,   1/4,
    1/8, 1/16, 1/16,  3/4,

  ],
  rightDur: [
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,
    1/4,     1/16, 1/16, 1/8, 1/8, 1/8, 1/4,
    1/4, 1/8, 1/8, 1/2,

    // fancier arps, extra note
    1/4,     1/16, 1/16, 1/16, 1/16, 1/8, 1/8, 1/4,
    1/4, 1/16, 1/16, 1/8, 1/2,
  ],

  barAnnotations: {
    1: "[Am] (Verse) On a dark...",  2: "[E7]",
    3: "[G]", 4: "[D]",
    5: "[F]", 6: "[C]",
    7: "[Dm]", 8: "[E7]",
    9: "[F] (Chorus) Welcome to the hotel california...", 10:"[C]",
    11: "[E7]", 12:"[Am]",
    13: "[F]", 14:"[C]",
    15: "[Dm]", 16:"[E7]",
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});

presets.push({
  name: 'DITM', // King Harvest
  category: 'repertoire',
  fullName: "Dancing in the Moonlight",
  beatsPerBar: 4,
  beatDur: 1/4,
  targetBPM: 67,
  maxBPM: 100,
  disconnectDur: 30, // disconnected notes, milliseconds
  graphOrder: "bar", // graph bar by bar instead of note by note

  leftHand: [
    // intro
    C5, G5, -1, -1, F4, F4, -1, A4,
    A4s, -1, -1, D4s, D4s, D4, -1, D4,
    C4, -1, C5, F4, F4, -1, A4,
    A4s, -1, -1, D4, -1, D4, -1, G4,
    C4, -1,
    // verse 1
    -1, F4, -1, A4,
    A4s, -1, -1, D5s, D5s, D4, -1, D4,
    C4, -1, D4s, F4, F4, -1, A4,
    A4s, -1, -1, D5s, D5s, D4, -1, D4,
  ],
  rightHand: [
    // intro
    -1, A5s, G6, D6s, A5s, G5, A5s, G5s, [C6, D6s], -1, [C6, D6s], [C6, D6s],
    [C6, F6], D6, C6, [C6, F6], D6, [C6, F6], A5s, G6, A5s, D6s, G6, F6, A5s, D6, F6,
    D6s, G5, A5s, G6,          D6s, A5s, G5, A5s,       A5,[C6, D6s],-1,     [C6,D6s],[C6,D6s],
    [C6,F6],D6,C6,[C6,F6],     D6,C6,A5s,[C6, D6, G6],       [C6, D6, G6], [B5,D6,G6], [B5,D6,G6],
    [G5,A5s,D6s], -1,
    // verse 1
    -1, -1, [C5, D5s], -1, [C5, D5s],
    [C5, F5], D5, C5, [C5, F5], D5, [C5, F5], A4s, G5, A4s, D5s, G5, F5, A4s, D5, F5,
    D5s, G4, A4s, G5, D5s, A4s, G4, A4s, G4s, [C5,D5s], -1, [C5, D5s], [C5, D5s],
    [C5, F5], D5, C5, [C5, F5], D5, [C5, F5], A4s, G5, A4s, D5s, G5, F5, A4s, D5, F5,

  ],
  leftDur: [
  // intro
    1/16, 1/16, 1/8, 1/4, 3/16, 1/8, 1/8, 1/16,
    1/4, 1/8, 1/16, 1/4, 1/16, 1/8, 1/16, 1/16,
    1/4, 1/8, 1/8, 3/16, 1/8, 1/8, 1/16,
    1/4, 1/8, 1/16, 1/8, 1/16, 1/16, 1/16, 1/4,
    1/8, 7/8,
    // verse 1
    1/2, 3/8, 1/16, 1/16,
    1/4, 1/8, 1/16, 1/4, 1/16, 1/8, 1/16, 1/16,
    1/4, 1/8, 1/8, 3/16, 1/8, 1/8, 1/16,
    1/4, 1/8, 1/16, 1/4, 1/16, 1/8, 1/16, 1/16,

  ],
  rightDur: [
  // intro
    1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/8, 1/8,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/8, 1/8,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 3/16, 1/8, 1/8, 1/8,
    1/8, 7/8,
    // verse 1
    1/2, 1/8, 3/16, 1/16, 1/8,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/8, 1/8,
    1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/8, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16, 1/16,
  ],

  barAnnotations: {
    1: "(Intro)",
    6: "Verse 1"
  },
  leftFingers: null,
  rightFingers: null,
  metrics: {HTQ: false, MetQ: false, DynQ: true, LegQ: false, StaQ: false}
});


console.log("Pushed songs");
presets.push("Free Play (non-scored)");
freePlayPresetIndex = presets.length-1;

presets.push("Debugging");

presets.push(  // a very simple pattern for debugging the software
  {
    name: 'TEST',
    category: 'test',
    isFreePlay: false,
    leftHand: [C3, D3, E3, -1],
    rightHand: [C4, D4, E4, -1],
    leftDur: [1/4],
    rightDur: [1/4],
    beatDur: 1/4,
    beatsPerBar: 4,
    swingEighths: false,
    leftFingers: [5,4,3],
    rightFingers: [1,2,3],
    metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: true},
  }
);

presets.push(  // a trivial "scale" for debugging the software
  {
    name: 'SC.TEST',
    category: 'test',
    leftHand: [48, 50, 52, 50, 48],
    rightHand: [60, 62, 64, 62, 60],
    leftFingers: [5,4,3,4,5],
    rightFingers: [1,2,3,2,1],
    leftDur: [1/8],
    rightDur: [1/8],
    beatDur: 1/16,
    swingEighths: false,
    metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: true},
    barAnnotations: {"1":"Scale-like test"},
  }
);

presets.push(  // grace note test
  {
    name: 'CN.TEST',
    fullName: "Crushed notes test",
    category: 'test',
    leftHand: [48, 50, 52, 50, 48],
    rightHand: [C4, C4s, D4, E4, F4, G4],
    rightDur: [0, 0, 1/4, 1/4, 1/4, 1/4],
    leftDur: [1/4],
    beatDur: 1/4,
    swingEighths: false,
    metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: true},
    barAnnotations: {"1":"Grace Notes Test"},
  }
);


//console.log("Pushed sc.test");
presets.push(  // test of chords
  {
    name: 'CH.TEST',
    fullName: "Chord test",
    category: 'test',
    leftHand:  [C3, [D3,F3]],
    rightHand: [[60,62], 63],
    leftFingers: null,
    rightFingers: null,
    leftDur: [1/4],
    rightDur: [1/4],
    beatDur: 1/4,
    swingEighths: false,
    metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: true},
    barAnnotations: {"1":"chord test"},
  }
);

//console.log("Pushed sc.test");
presets.push(  // test of chords
  {
    name: 'SIMUL.TEST',
    fullName: "test of both hands expecting the same note",
    category: 'test',
    leftHand:  [C4, D4, E4, F4, B3, C4, D4, E4],
    rightHand: [B3, C4, D4, E4, C4, D4, E4, F4],
    leftFingers: null,
    rightFingers: null,
    leftDur: [1/4],
    rightDur: [1/4],
    beatDur: 1/4,
    swingEighths: false,
    metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: true},
    barAnnotations: {"1":"chord test"},
  }
);


function createPresetMenu() {
    console.log("Creating Preset Menu");

    presets = presets.filter(preset => preset && !avail(preset.isFreePlay, false));

    // now add them at the freeplay index if we have an index.
    if (freePlayPresetIndex >= 0) {
      let insertplace = freePlayPresetIndex+1;
      for (let i = 0; i < freePlay.length; i++) {
        if (avail(freePlay[i].deleted, false)) {
          continue;
        }
        freePlay[i].menuValue = insertplace;
        presets.splice(insertplace, 0, freePlay[i]);
        insertplace++;
      }
    }

    const menuContainer = document.getElementById('presetMenuContainer');
    menuContainer.innerHTML = ''; // Clear existing content

    // The trigger for showing/hiding the menu
    const dropdownTrigger = document.createElement('div');
    dropdownTrigger.innerHTML = "<span style=font-size:medium>&#9660;</span>"; // Downward triangle
    dropdownTrigger.style.fontSize = "24px";
    dropdownTrigger.style.cursor = "pointer";
    dropdownTrigger.style.display = "inline-block";
    //dropdownTrigger.style.backgroundColor = "white";

    // The div to display the selected item
    const selectedItemDisplay = document.createElement('div');
    selectedItemDisplay.id = "selectedPresetDisplay";
    selectedItemDisplay.textContent = "Presets"; // Default text
    selectedItemDisplay.style.fontSize = "20px";
    selectedItemDisplay.style.minWidth = "10em";
    selectedItemDisplay.style.display = "inline-block";
    selectedItemDisplay.style.textAlign = "left";
    //selectedItemDisplay.style.backgroundColor = "white";
    selectedItemDisplay.style.marginLeft = "10px"; // Spacing between arrow and display

    // The menu itself
    const menuList = document.createElement('ul');
    menuList.style.display = 'none'; // Hidden by default
    menuList.style.listStyleType = 'none'; // No bullets
    menuList.style.margin = '0';
    menuList.style.position = 'absolute';
    menuList.style.padding = "5px";
    menuList.style.fontSize = "18px";
    menuList.style.backgroundColor = "#FFF";
    menuList.style.border = "1px solid #DDD";
    menuList.style.boxShadow = "0 8px 16px 0 rgba(0,0,0,0.2)";
    menuList.style.zIndex = "1000"; // Ensure it's above other content

    // Event listeners for showing/hiding the menu
    dropdownTrigger.addEventListener('click', presetDropdown);
    selectedItemDisplay.addEventListener('click', presetDropdown);

    function presetDropdown() {
        const rect = dropdownTrigger.getBoundingClientRect();
        menuList.style.left = `${rect.left}px`;
        menuList.style.top = `${rect.bottom}px`;
        menuList.style.display = menuList.style.display === 'none' ? 'block' : 'none';
    }

    // Hide menu when clicking anywhere outside
    document.addEventListener('click', function(e) {
        if (!dropdownTrigger.contains(e.target) && !menuList.contains(e.target)) {
            menuList.style.display = 'none';
        }
    }, true);

    let currentCategory = null;
    let indexCounter = -1; // Use this to track the index of each preset

    presets.forEach(function(preset) {
        indexCounter++; // Increment for each preset, including strings for categories
        if (typeof(preset) === "string") {
            // This is a category
            const categoryItem = document.createElement('li');
            categoryItem.style.paddingBottom = "5px";
            const toggleIndicator = document.createElement('span');
            toggleIndicator.textContent = '+';
            const catText = document.createElement('span');
            catText.textContent = " "+preset;
            categoryItem.appendChild(toggleIndicator);
            categoryItem.appendChild(catText);
            //categoryItem.style.fontWeight = "bold";
            categoryItem.style.cursor = "pointer";

            const nestedList = document.createElement('ul');
            nestedList.style.listStyleType = 'none';
            nestedList.style.paddingLeft = '20px';
            nestedList.style.paddingBottom = "10px";
            nestedList.style.display = 'none'; // Start hidden

            categoryItem.onclick = function() {
                // Toggle display of nestedList
                nestedList.style.display = nestedList.style.display === 'none' ? 'block' : 'none';
                toggleIndicator.textContent = (nestedList.style.display==='none')?"+":"-";
            };

            categoryItem.appendChild(nestedList);
            menuList.appendChild(categoryItem);
            currentCategory = nestedList;
        } else if (currentCategory) {
            // This is a preset item, which should be added to the current category
            const presetItem = document.createElement('li');
            presetItem.style.fontSize = "medium";
            presetItem.style.fontWeight = "medium";
            presetItem.style.padding = "5px";
            presetItem.innerHTML = avail(preset.menuName,preset.name);
            presetItem.style.cursor = "pointer";
            //preset.menuValue = index; // this makes it easier to go to a certain preset later and still update the menu to show that name
            // Use a closure to capture the current indexCounter value
            (function(index){
                presetItem.onclick = function() {
                    selectedItemDisplay.textContent = avail(preset.menuName,preset.name); // Update selected item display
                    menuList.style.display = 'none'; // Hide menu
                    handlePresetSelection(index); // Trigger code for preset selection, passing the index
                };
            })(indexCounter);

            currentCategory.appendChild(presetItem);
        }
    });

    menuContainer.style.backgroundColor = "white";
    menuContainer.appendChild(dropdownTrigger);
    menuContainer.appendChild(selectedItemDisplay);
    document.body.appendChild(menuList); // Append to body to ensure it overlays other elements
}

createPresetMenu(); // Initialize the menu (will be updated after loadFreePlay is called)




function resetPresetMenu() {
  presetMenu.selectedIndex = 0; // Set the selected index to the default option
}

// MOVED TO scales.js: function generateScalePreset(noteName, scaleType, numOctaves, lhOctave, name, metrics, dur)
// MOVED TO scales.js: function showScaleArpWizard()
// MOVED TO scales.js: function dismissScaleArpWizard()
// MOVED TO scales.js: function generateTest()


function isChord(note) {
  if (Array.isArray(note)) {
    return note.length;
  } else {
    return 0;
  }
}

    // Function to set the notes to be played
    function setNotes() {
      currentState = STATE.SETTING_NOTES;
      console.log("State: setting notes");
      notesToPlay = [[], []]; // reset
      fingersToPlay = [];

      //document.getElementById("testname").textContent = "Custom Notes";

      resetPresetMenu();

      updateSelectableHands(true, true, false);
      changeSelectedHand('right');

      // Prompt the user to play notes
      message('Play notes for later test');

      // Disable setNotes button and enable doneButton
      //document.getElementById('setNotesButton').disabled = true;
      document.getElementById('testNotesButton').disabled = true;
      //document.getElementById('doneButton').disabled = false;

      // Clear the notesToPlay on screen
      clearNotesToPlay();

      // Clear the displayed played notes to start new test
      playedNotes = [[], []];
      clearPlayedNotes();

      // Reset the wrongNotePlayed flag
      wrongNotePlayed = false;
      wrongNoteNumber = -1;
      currentHand = 'left';
    }

    // Function to test the notes repetition
    function testNotes() {
      let button = document.getElementById('testNotesButton');
      document.body.style.backgroundColor = bodyColor;

      if (currentState === STATE.TESTING_NOTES || currentState === STATE.TEST_FLUSHING) {
        currentState = STATE.WAITING_FOR_BUTTON;

        // This is really the STOP button, end the test.

        // Enable setNotes button and disable doneButton
        //document.getElementById('setNotesButton').disabled = false;
        //document.getElementById('doneButton').disabled = true;
        endTest(); // stop the timer
        button.textContent = "START";
        document.getElementById("timerPauseButton").style.display = "none";
        scrollToDataTop(false);
        playedNotes = [[], []];
        clearPlayedNotes();

        return;
      }

      if (testOptions.isFreePlay) {
        // there is no such thing as testing a freeplay item other than to start
        // the timer and occassionally update the time to the runHistory
        clearStats();
        startTest();
        currentState = STATE.TESTING_NOTES;
        //document.getElementById("PresetMenu").disabled = true; // can't change during test
        disablePresetMenu();
        return;
      }
      //document.getElementById("PresetMenu").disabled = false; // can't change during test
      disablePresetMenu();

      // if we get here we need to start a test sequence.
      clearStats();
      setNoteFilters();
      loadTodayStats();
      setFavoriteIcon(false); // there is no selection

      if (notesToPlay[0].length === 0 && notesToPlay[1].length === 0) {
        message("There are no notes to test");
        return;
      }
      currentState = STATE.TESTING_NOTES;
      console.log("State: testing");

      // document.getElementById('setNotesButton').disabled = true;
      // enable both hands mode
      updateSelectableHands(true, true, true);

      // Clear the displayed played notes during the test phase
      clearPlayedNotes();

      startTest();

      scrollToDataTop(true);

    }

    function stopTheTest() {
      endTest(); // stop the timer
      button.textContent = "START";
      document.getElementById("timerPauseButton").style.display = "none";
      scrollToDataTop(false);
      playedNotes = [[], []];
      clearPlayedNotes();
    }

    function disablePresetMenu() {
      const pm = document.getElementById("presetMenuContainer");
      pm.style.pointerEvents = "none";
      pm.style.opacity = "0.4";
      pm.title = "Presets menu disabled during test.";
    }

    function enablePresetMenu() {
      const pm = document.getElementById("presetMenuContainer");
      pm.style.pointerEvents = "auto";
      pm.style.opacity = "0.7";
      pm.title = "Select a set of test notes to play";
    }

    function historyNameModifier() {
      let hnm = "";
      if (noteScope === null) {
        return hnm;
      }
      const hand = getSelectedHand();
      let startbeat = 0;
      let endbeat = 0;
      let startbar;
      let endbar;

      if (hand === "left") {
        startbeat = noteStartBeat[0][noteScope[0].first];
        endbeat = noteStartBeat[0][noteScope[0].last];
      } else if (hand === "right") {
        startbeat = noteStartBeat[1][noteScope[1].first];
        endbeat = noteStartBeat[1][noteScope[1].last];
      } else {
        startbeat = Math.min(noteStartBeat[0][noteScope[0].first],noteStartBeat[1][noteScope[1].first]);
        endbeat = Math.max(noteStartBeat[0][noteScope[0].last],noteStartBeat[1][noteScope[1].last]);
      }
      startbar = 1+Math.trunc(startbeat/testOptions.beatsPerBar);
      endbar = 1+Math.trunc(endbeat/testOptions.beatsPerBar);

      if (1) {
        warning("HistNameMod: startbar:"+startbar+" endbar:"+endbar+" maxbar:"+maxBar+
          " endbeat:"+endbeat+" bpbar:"+testOptions.beatsPerBar+" nsb[0].last:"+noteStartBeat[0][noteScope[0].last]+
          " nsb[1].last:"+noteStartBeat[1][noteScope[1].last]+" ns[0].last:"+noteScope[0].last+" notestartbeat0 len:"+noteStartBeat[0].length);
      }

      if (isNaN(startbar) || isNaN(endbar)) {
        console.error("Bar range is NaN:"+startbar+":"+endbar);
        hnm = "";
      } else if (startbar === 1 && endbar === maxBar) {
        hnm = "";  // it's everything anyway
      } else if (startbar === endbar) {
        hnm = " B"+startbar;
      } else {
        hnm = " B"+startbar+"-"+endbar;
      }
      //warning("Returning hnm='"+hnm+"'");

      if (testOptions.constDur !== false && testOptions.constDur !== testOptions.originalConstDur) {
        hnm += " C="+testOptions.constDur;
      }
      if (testOptions.beatsPerBar !== testOptions.originalBeatsPerBar) {
        hnm += " BPB="+testOptions.beatsPerBar;
      }
      if (testOptions.beatDur !== testOptions.originalBeatDur) {
        hnm += " BD="+testOptions.beatDur;
      }

      return hnm;
    }

    // MOVED TO daychart.js: function dayChartDate(days)
// MOVED TO daychart.js: function setDayChartNote(date)
// MOVED TO daychart.js: function computeDayChart() - large ~570 line function
// MOVED TO daychart.js: function nonZero(n)


    function evaluateSessionStats(acc, streak, streakbpm, avgbpm, maxbpm, bestbpm, targetbpm, age=0, schedule="begin", maxStreakAtEnd=false) {
      // this structure shows colors and "strikes" to display on the
      // daychart and skillmap pages.
      const evalColors = {
        "Superb!": "#005500",
        "Excellent":"green",
        "Good":"blue",
        "Deficient":"orange",
        "Fail":"red",
      };

      const evals = {
        overallStrikes: 0,
        overallColor: "",
        overallBGColor: "transparent",
        overallSymbol: "",
        overallEmph: "medium",
        overallLabel: "",
        overallReason: "",
        accStrikes: 0,
        accColor: "",
        streakStrikes: 0,
        streakColor: "",
        streakbpmColor: 0,
        avgbpmColor: "",
        maxbpmColor: "",
        ageStrikes: 0,
        ageColor: ""
      };

      evals.streakbpmColor = bpmcolor(streakbpm, targetbpm);
      evals.avgbpmColor = bpmcolor(avgbpm, targetbpm);
      evals.maxbpmColor = bpmcolor(maxbpm, targetbpm);
      evals.bestbpmColor = bpmcolor(bestbpm, targetbpm);

      // if the test is of type repertoire, and the number of notes is large,
      // then we don't care about streaks. This allows practice sessions to
      // be reasonable in length.
      let noStreaksRequired = false;
      //warning("EVAL CAT: "+testOptions.category);
      if (testOptions.category === "repertoire") {
        //warning("REPERTOIRE");
        let numnotes = 0;
        const hand = getSelectedHand();
        if (hand === "left" || hand === "both") {
          numnotes += totNotesInSelection[0];
        }
        if (hand === "right" || hand === "both") {
          numnotes += totNotesInSelection[1];
        }

        const longPassageNotesCutoff = 65; // IMPLEMENT: This should be a preference
        //warning("NOTES:"+numnotes);
        if (numnotes >= longPassageNotesCutoff) {
          //warning("NO STREAKS REQUIRED, long repertoire");
          noStreaksRequired = true;
        }
      }

      evals.longRepertoireMode = noStreaksRequired;

      if (acc === 100) {
        evals.accStrikes = 0;
        evals.accColor = evalColors["Superb!"]; // very dark green
        evals.overallReason = '<i class="fa-solid fa-plus"></i> 100% accur.';
      } else if (acc >= 90) {
        evals.accStrikes = 1;
        evals.accColor = evalColors["Excellent"];
        evals.overallReason = '<i class="fa-solid fa-plus"></i> High accur.';
      } else if (acc >= 85) {
        evals.accStrikes = 2;
        evals.accColor = evalColors["Good"];
        evals.overallReason = '<i class="fa-solid fa-plus-minus"></i> OK accur.';
      } else if (acc >= 80) {
        evals.accStrikes = 3;
        evals.accColor = evalColors["Deficient"];
        evals.overallReason = '<i class="fa-solid fa-minus"></i> Poor accur.';
      } else {
        evals.accStrikes = 4;
        evals.accColor = evalColors["Fail"];
        evals.overallReason = '<i class="fa-solid fa-minus"></i> Failing accur.';
      }

      if (acc === 100) {
        // with 100% accuracy we are more lenient with the streaks, allowing the learner to
        // do a quick refresh with fewer streaks as long as they make no errors.
        if (streak > 19 && maxStreakAtEnd) {
            evals.streakStrikes = 0; // this allows a "star"
            evals.streakColor = evalColors["Excellent"];
            evals.overallReason += '<br><i class="fa-solid fa-plus"></i> Super streak';
        } else if (streak > 9) {
          evals.streakStrikes = 0; // this allows a "star"
          evals.streakColor = evalColors["Excellent"];
          evals.overallReason += '<br><i class="fa-solid fa-plus"></i> Great streak';
        } else if (streak > 6) {
          evals.streakStrikes = 1;
          evals.streakColor = evalColors["Excellent"];
          evals.overallReason += '<br><i class="fa-solid fa-plus"></i> Good streak';
        } else if (streak >= 5) {
          evals.streakStrikes = 1;
          evals.streakColor = evalColors["Good"];
          evals.overallReason += '<br><i class="fa-solid fa-plus-minus"></i> OK streak';
        } else {
          evals.streakStrikes = 2;
          evals.streakColor = evalColors["Deficient"]; // it would be hard to say that any day of 100% accuracy is "Fail" so the worst is deficient
          evals.overallReason += '<br><i class="fa-solid fa-minus"></i> Short streak';
        }
      } else {
        // if accuracy is under 100% we're more strict with streaks, encouraging learner to
        // continue practicing a bit longer
        if (streak > 19 && maxStreakAtEnd) {
            evals.streakStrikes = 0; // this allows a "star"
            evals.streakColor = evalColors["Excellent"];
            evals.overallReason += '<br><i class="fa-solid fa-plus"></i> Super streak';
        } else if (streak > 9) {
          evals.streakStrikes = 0;
          evals.streakColor = evalColors["Excellent"];
          evals.overallReason += '<br><i class="fa-solid fa-plus"></i> Good streak';
        } else if (streak > 8) {
          evals.streakStrikes = 1;
          evals.streakColor = evalColors["Good"];
          evals.overallReason += '<br><i class="fa-solid fa-plus-minus"></i> OK streak';
        } else if (streak >= 7) {
          evals.streakStrikes = 2;
          evals.streakColor = evalColors["Deficient"];
          evals.overallReason += '<br><i class="fa-solid fa-minus"></i> Short streak';
        } else {
          evals.streakStrikes = 3;
          evals.streakColor = evalColors["Fail"];
          evals.overallReason += '<br><i class="fa-solid fa-minus"></i> Short streak';
        }
      }

      const lsched = avail(learningScheduleDayParams[schedule], [4, 7, 14]);

      if (age < lsched[0]) {
        evals.ageStrikes = 0;
        evals.ageColor = evalColors["Excellent"];
      } else if (age <= lsched[1]) {
        evals.ageStrikes = 1;
        evals.ageColor = evalColors["Good"];
      } else if (age < lsched[2]) {
        evals.ageStrikes = 2;
        evals.ageColor = evalColors["Deficient"];
      } else {
        evals.ageStrikes = 3;
        evals.ageColor = "red";
      }

      // compute an overall evaluation
      let strikes = (noStreaksRequired?0:evals.streakStrikes) + evals.accStrikes;

      if (streak > 19 && maxStreakAtEnd) {
        // credit back one strike if there is a very long streak that ended the session.
        strikes -= 1;
        if (strikes < 0) {
          strikes = 0;
        }
      }
      console.log("overall strikes:"+strikes);

      evals.overallStrikes = strikes;
      if (strikes === 0) {
        evals.overallColor = "#005500"; // very dark green
        evals.overallBGColor = "#DDFBDD";
        evals.overallSymbol = "&starf;";
        evals.overallEmph = "bold";
        evals.overallLabel = "Superb!";
      } else if (strikes === 1) {
        evals.overallColor = "green";
        evals.overallLabel = "Good";
      } else if (strikes === 2) {
        evals.overallColor = "blue";
        evals.overallLabel = "Passing";
      } else if (strikes === 3) {
        evals.overallColor = "orange";
        evals.overallLabel = "Deficient";
      } else {
        evals.overallColor = "red";
        evals.overallBGColor = "#FBDDDD"; // pale red
        evals.overallSymbol = "&#9888;";  // warning sign, exclamation point inside a triangle
        evals.overallEmph = "bold";
        evals.overallLabel = "Fail";
      }

      return evals;

      function bpmcolor(bpm, target) {
          bpm = Number(bpm);
          target = Number(target);
          //console.log("BPMCOLOR: bpm:"+bpm+" targ:"+target);

          if (bpm == 0) {
            return "black";
          }
          if (bpm > target*1.1) {
            return "darkgreen";
          } else if (bpm >= target) {
            return "green";
          } else if (bpm/target > 0.85) {
            return "blue";
          } else if (bpm/target > 0.65) {
            return "orange";
          } else {
            return "red";
          }
        } // end of bpmcolor
    } // end of evaluateSessionStats

    function findTargetBPM(name) {
      for (let i = 0; i < presets.length; i++) {
        //console.log("Comparing preset name:"+name+" to "+presets[i].name);
        // IMPLEMENT: The comparison below isn't quite right, we should really pattern match for
        // name plus a possible trailing bar range (like B3-8) or hand specifier (like both or left)
        // The code below works as long as no preset name is a leading substring of another, which is
        // currently true but may not always be.
        if (name.startsWith(presets[i].name)) {
          //console.log("MATCH");
          return avail(presets[i].targetBPM,120);
        }
      }
      return 120; // this is just a default
    }

    function recomputeAllPersonalBests() {

      // this effectively sorts keys in date order since keys starts with date in yyyy-mm-yy order
      const sortedKeys = Object.keys(runHistory).sort((a,b) => a.localeCompare(b));

      const personalBest = {};
      let personalBestCount = 0;

      for (let k = 0; k < sortedKeys.length; k++) {
        const key = sortedKeys[k];

        if (!runHistory.hasOwnProperty(key)) {
          continue;
        }
        if (key.startsWith(".PREF.")) {
          //console.log("Skipped PREF:"+key);
          continue;
        }

        runHistory[key].personalBest = false; // default: this was not a personal best on its own date

        const [date, preset, hand] = key.split("|");
        const routine = preset+"|"+hand;
        const acc = percent(runHistory[key].success, runHistory[key].count);
        if (!isAvail(runHistory[key].maxStreak)) {
          runHistory[key].maxStreak = [0,0,0,0];
        }
        if (!isAvail(runHistory[key].maxStreakBPM)) {
          runHistory[key].maxStreakBPM = [0,0,0,0];
        }
        const streak = avail(runHistory[key].maxStreak[2],0);
        const streakbpm = Math.max(
            Math.trunc(avail(runHistory[key].maxStreakBPM[2],0)/nonZero(runHistory[key].maxStreak[2])),
            Math.trunc(avail(runHistory[key].maxStreak10BPM,[0,0,0,0])[2])
        );

        if (streak >= 10 && acc >= 85) {
            if (!isAvail(personalBest[routine])) {
              personalBest[routine] = 0;
            }
            if (streakbpm > personalBest[routine]) {
              personalBest[routine] = streakbpm;
              personalBestDate[routine] = date;
              runHistory[key].personalBest = true; // this was a personal best as of its own date
              //console.log("PB: "+key+" = "+streakbpm);
              personalBestCount++;
            }
        }
      }
      //console.log("PB: Total personal bests: "+personalBestCount);
    }

    function nonZero(n) {
      n = avail(n, 1);
      return n?n:1;
    }


    // MOVED TO skillmap.js: function generateSkillMap() - large ~700 line function with all skill map generation logic
    // MOVED TO skillmap.js: function hideEmptyRows(table)
    // MOVED TO skillmap.js: function openAllSkillMapSections()
    // MOVED TO skillmap.js: function toggleSkillMapSection(section)
    // MOVED TO skillmap.js: function skillMapDisplaySection(section)

    let octaveStats = {};

    
    function loadTodayStats() {

      console.log("### LoadTodayStats");

      if (runHistory === null) {
        loadRunHistory();
      }
      const runName = todayDate() + "|" + curPresetName + historyNameModifier() + "|" + getSelectedHand();

      if (isAvail(runHistory[runName]) && runHistory.hasOwnProperty(runName)) {
        console.log("Found today stats for "+runName);
        if ( isAvail(runHistory[runName].noteScope) &&
          isAvail(noteScope) && isAvail(noteScope[0]) && isAvail(noteScope[1]) &&
          noteScope[0].first == runHistory[runName].noteScope[0].first &&
          noteScope[0].last == runHistory[runName].noteScope[0].last &&
          noteScope[1].first == runHistory[runName].noteScope[1].first &&
          noteScope[1].last == runHistory[runName].noteScope[1].last
        ) {
          console.log("Matches notescope");
        } else {
          console.log("Does not match notescope, skipping update.");
          return;
        }

        // if we get here we have a complete match

        averageBPM = Math.trunc(avail(runHistory[runName].sumBPM,0)/(avail(runHistory[runName].success,0)+0.001));
        maxBPM = runHistory[runName].maxBPM;
        bestBPM = runHistory[runName].bestBPM;
        successCount = runHistory[runName].success;

        failCount = runHistory[runName].notefail;    // a fail could include soft fails depending on prefs
        softFailCount = avail(runHistory[runName].softFailCount,0);
        noteFailCount = runHistory[runName].notefail;
        repCount = 0;
        totalDuration = 0;
        startTime = null;
        wrongNotePlayed = false;
        wrongNoteNumber = -1;
        numQBPM = avail(runHistory[runName].numQBPM.slice(), [0,0,0,0]);
        sumQBPM = avail(runHistory[runName].sumQBPM.slice(), [0,0,0,0]);
        midiNotes = [];
        curStreak = [0,0,0,0];
        curStreakBPM = [0,0,0,0];
        maxStreak = runHistory[runName].maxStreak.slice();
        maxStreakBPM = runHistory[runName].maxStreakBPM.slice();
        for (let q = 0; q < 4; q++) {
          if (isAvail(runHistory[runName].maxStreakAtEnd) &&
              avail(runHistory[runName].maxStreakAtEnd[q], false)) {
            curStreak[q] = runHistory[runName].maxStreak[q];
            curStreakBPM[q] = runHistory[runName].maxStreakBPM[q];
          }
        }
        nnAccuracy = avail(runHistory[runName].nnAccuracy, {success:0,fail:0});

        testOptions.wallTimeToday = avail(runHistory[runName].wallTime,0);
        //testStartTime = Date.now() - avail(testOptions.wallTimeToday, 0);
        //document.getElementById('elapsedTime').textContent = formatTime(testOptions.wallTimeToday);

        console.log("DISPLAYING TODAY STATS");
        displayTestStats(null, "reset");
      }
    }


    function computePriorStreakData() {

      console.log("#Computepriorstreakdata");

      if (runHistory === null) {
        loadRunHistory();
      }
      const currentHand = getSelectedHand();
      const hnm = historyNameModifier();
      const currentBars = hnm.substr(1);  // the substr removes the leading space

      const name = curPresetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex symbols in preset name
      const p = "^"+name+"( B([0-9]+)(-([0-9]+))?)?$";
      //console.log("Computing prior streak with pattern:"+p);
      const pattern = new RegExp(p);

      let latestStreak = null;
      let latestDate = "0000-00-00";
      let latestBPM = 0;
      let latestAccuracy = 0;
      personalBestStreakBPM = 0;
      personalBestStreakBPMToday = 0;
      personalBestStreakBPMDate = "0000-00-00";

      let barPresetList = [];

      let presetReps = {};

      for (const key in runHistory) {
        if (key.startsWith(".PREF.")) {
          //console.log("Skipped PREF:"+key);
          continue;
        }
        if (runHistory.hasOwnProperty(key)) {

            const [date, preset, hand] = key.split("|");

            if (!preset.startsWith(curPresetName)) {
              // not the right one
              continue;
            }

            if (runHistory[key].count < 5) {
              continue; // skip days where there were not a significant number of runs
            }

            const matches = preset.match(pattern);

            let barSuffix = "";

            if (matches === null) {
              //console.log("no match:"+key);
              continue;
            } else {
              if (matches[2]) {
                //console.log(`Start Bar: ${matches[2]}`);
                barSuffix = " B"+matches[2];
                if (matches[4]) {
                  barSuffix += "-"+matches[4];
                }

                if (!isAvail(presetReps[barSuffix])) {
                  presetReps[barSuffix] = 0;
                }
                if (hand === "both") {
                  // for now we will only display reps of hands together
                  presetReps[barSuffix] += avail(runHistory[key].success,0); // track total reps for display
                }

                if (isAvail(runHistory[key].noteScope)) {
                  if (date <= "2024-02-19") {
                    // there was a bug before 2024-02-20 where notescope was not deep-copied and therefore was incorrect
                    runHistory[key].noteScope = null; // blank it out, it's wrong anyway
                  } else {

                    const s = avail(runHistory[key].maxStreak, null);
                    const b = avail(runHistory[key].maxStreakBPM, null);
                    const fail = avail(runHistory[key].notefail,0);
                    const suc = avail(runHistory[key].success,0);
                    const accuracy = percent(suc, suc+fail); //Math.trunc(0.5+100*suc/nonZero(suc+fail));

                    const index = barPresetList.findIndex(obj => obj.key === barSuffix);

                    const newPreset = {
                      key:barSuffix,
                      noteScope: runHistory[key].noteScope,
                      date: date,
                      days: daysSince(date),
                      accuracy: accuracy,
                      streak: s[2],
                      bpm: Math.trunc(b[2]/(s[2]?s[2]:1))
                    };

                    if (index === -1) {
                      barPresetList.push(newPreset);
                    } else {
                      barPresetList[index] = newPreset;
                    }
                    //console.log("BAR SUFFIX FOUND WITH NOTESCOPE:"+barSuffix+" ns:"+runHistory[key].noteScope[0].first+" "+runHistory[key].noteScope[0].last+" "+runHistory[key].noteScope[1].first+" "+runHistory[key].noteScope[1].last+" date:"+date+" strk:"+s[2]+" acc:"+accuracy);
                  }
                }
              }
              // if this scope does not match the current barscope then skip further processing.
              // IMPLEMENT: currently this does not account for extra modifiers like constant
              // duration or changes in time

              if (barSuffix !== hnm) {
                //console.log("Skipping incorrect history modifier. Barsuf=/"+barSuffix+"/ hnm=/"+hnm+"/"+ " key:"+key);
                continue;
              } else {
                //console.log("Matched history modifier. Barsuf=/"+barSuffix+"/ hnm=/"+hnm+"/");
              }
            }

            if (hand !== currentHand) {
              //console.log("not current hand:"+hand+" cur="+currentHand);
              continue;
            }

            const s = avail(runHistory[key].maxStreak, null);
            const b = avail(runHistory[key].maxStreakBPM, null);
            const b10 = avail(runHistory[key].maxStreak10BPM, null);
            const fail = avail(runHistory[key].notefail,0);
            const suc = avail(runHistory[key].success,0);
            const accuracy = Math.trunc(0.5+100*suc/nonZero(suc+fail));

            let streakbpm = 0;
            if (b10 != null) {
              streakbpm = Math.trunc(b10[2]);
            } else if (b !== null && s !== null && s[2] >= 10) {
              streakbpm = Math.trunc(b[2]/s[2]);
            }

            // a personal best streak bpm occurs when the largest bpm
            // from the set of days that had
            // a streak of 10+ with "good" or better accuracy (85%+)
            if (accuracy >= 85) {
              if (streakbpm > personalBestStreakBPM) {
                personalBestStreakBPM = streakbpm;
                personalBestStreakBPMDate = date;
                //console.log("New personalBestStreakBPM:"+streakbpm);
              }
            }

            if (date < latestDate) {
              console.log("we already have a later date");
              continue;
            }

            // only consider streaks of at least 3 length, if a day had a
            // streak less than that then consider it not an acceptable preset
            if (s !== null && s[3] > 2 && b !== null && b[3] > 0) {
              latestStreak = s[3];
              latestBPM = Math.trunc(b[3]/(s[3]>0?s[3]:1));
              latestDate = date;
              latestAccuracy = accuracy;
              //console.log("Found streak for preset=/"+preset+"/ barsuf:/"+barSuffix+"/ hand="+hand+" date="+date+" strk="+latestStreak+" acc:"+latestAccuracy);
            } else {
              //console.log("no streak");
            }
          }
        }

        // set up bar presets

        const favsetting = (preferences["barPresetAll"]?"<i class=\"fa-solid fa-arrow-rotate-right\"></i>All":"<i class=\"fa-solid fa-arrow-rotate-right\"></i>Fav");
        //console.log("barPreset pref ="+preferences["barPresetAll"]+" favsetting="+favsetting);

        let barpresets = '<div id=toggleBarSelect onclick="togglePref(\'barPresetAll\');" '+
                    ' class=mode-box-bars style=vertical-align:top;border-radius:5px ' +
                    'title="Toggle display of All versus just Favorite bar range presets">' +
                    (favsetting)+"</div>";

        barPresetList.sort((a, b) => {
            // Extract the first and second numbers from each string
            const newa = a.key.substring(2);
            const newb = b.key.substring(2);
            const [aRange1, aRange2] = newa.split('-').map(Number);
            const [bRange1, bRange2] = newb.split('-').map(Number);

            //console.log("Comparing /"+aRange1+"/,/"+aRange2+"/"+bRange1+"/,/"+bRange2+"/");

            // Compare the first numbers
            if (aRange1 != bRange1) {
                return aRange1 - bRange1;
            } else {
                // If the first numbers are equal, compare the second numbers
                return aRange2 - bRange2;
            }
        });

        let n = 0;
        for (let i = 0; i < barPresetList.length; i++) {
          const item = barPresetList[i];
          const noteranges = item.noteScope[0].first+","+item.noteScope[0].last+","+
            item.noteScope[1].first+","+item.noteScope[1].last;

          const endstreak = isAvail(item.maxStreakAtEnd)?avail(item.maxStreakAtEnd[2],false):false;

          const schedule = avail(runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(curPresetName)], "begin");

          let evals = evaluateSessionStats(item.accuracy, item.streak, item.bpm, 0, 0, 0, 0,
                        item.days, schedule, endstreak);

          //console.log("Adding BarPreset:" +barkey+" "+ typeof barPresetList[barkey]);
          const prefbar = getHistoryPref(null, ".PREF."+curPresetName+item.key);
          if (!prefbar.favorite && avail(preferences["barPresetAll"],true) == false) {
            //console.log("Skipping non-favorite pref button for "+item.key);
            continue;
          }

          n++;

          const [aRange1, aRange2] = item.key.substr(2).split('-').map(String);

          const anno1 = (barAnnotations!==null)?avail(barAnnotations[aRange1], ""):"";
          const anno2 = ""; //avail(barAnnotations[aRange2], "");  // preset button got too wide with this in place

          let anno = "<br>&nbsp;";

          let reps = presetReps[item.key];

          if (anno1 !== "") {
            if (anno2 !== "") {
              anno = "<br>"+anno1+" ... "+anno2;
            } else {
              anno = "<br>"+anno1;
            }
          } else if (anno2 !== "") {
            //anno = "<br>"+anno2;
          }

          //if (anno !== "") {
            anno = "<span style=font-size:8px>"+anno+"</span>";
          //}

          let accColor = evals.accColor;

          let strkColor = evals.streakColor;

          let daysColor = evals.ageColor;

          let stats = "&nbsp;<div style=display:inline-block;font-size:9px;line-height:1>" +
                        "<span style=color:white;background-color:"+accColor+">"+
                        item.accuracy+"%</span><br>"+
                        "<span style=color:white;background-color:"+strkColor+">"+
                        item.streak+"@"+item.bpm+"</span><br>"+
                        "<span style=color:white;background-color:"+daysColor+">"+
                        item.days+
                        ((item.days==1)?" day":" days")+"</span>"+
                        "</div>";

          let outlines = "";
          //outlines += "outline:3px solid " + daysColor + ";";

          outlines += "border:3px solid " + evals.overallColor + ";";

          let heart = "";
          if (prefbar.favorite) {
            heart = "<span class=mfs style=color:silver;font-size:xx-small>&#x2764;</span>";
          }
          heart += "<span class=mfs style=color:purple;font-size:xx-small>&nbsp;&#119046;</span><span style=color:purple;font-size:small>"+reps+"</span><br>";

          barpresets += "<div class=mode-box-bars id="+
            item.key+" style='display:inline-block;line-height:0.7;user-select:none;white-space:nowrap;"+outlines+"'"+
            " title='Preset to quickly select bars previously practiced'"+
            " onclick=\"changeBarScope('"+item.key.substr(1)+"',"+noteranges+");\""+ // clip off the leading space
            " data-notescope='"+noteranges+"'"+
            "><div style=display:inline-block;text-align:left;line-height:0.9>"+
            heart+" "+evals.overallSymbol+item.key.substr(1)+"</div>"+stats+anno+"</div>";

        } // end of: for (const item in barPresetList)

        let barcon = document.getElementById("barSelectContainer");
        barcon.innerHTML = barpresets;

        if (n === 0) {
          barcon.style.display = "none";
        } else {
          barcon.style.display = "block";
        }

        if (latestStreak > 0) {
          console.log("Found most recent streak data: "+latestDate+" "+latestStreak+" "+latestBPM+" "+latestAccuracy);

          PriorStreak = [latestStreak,latestBPM,compactDate(latestDate),latestAccuracy];

          const bpmbase = Math.trunc(Math.min(
                                      testOptions.maxBPM,
                                      Math.max(latestBPM, personalBestStreakBPM))
          );

          if (latestAccuracy >= 98) {
            // accuracy was 98% or more so allowed to go faster if desired as long as it's not faster than
            // this test's maximum allowed BPM
            BPMRecommendedRange = [
              Math.trunc(bpmbase*0.85),
              Math.min(testOptions.maxBPM, bpmbase+4)
            ];
            practiceStrategy = "push";
          } else if (latestAccuracy > 89) {
            // accuracy was slightly low so hold prior speed.
            BPMRecommendedRange = [
              Math.trunc(bpmbase*0.9),
              bpmbase
            ];

            practiceStrategy = "hold";
          } else if (latestAccuracy > 75) {
            // accuracy was clearly too low last time so slow down
            BPMRecommendedRange = [
              Math.trunc(bpmbase*0.75),
              Math.trunc(bpmbase*0.95)
            ];
            practiceStrategy = "caution";
          } else {
            // accuracy was disasterously low last time, slow way down
            BPMRecommendedRange = [Math.trunc(latestBPM*0.6), Math.trunc(latestBPM*0.8)];
            practiceStrategy = "slower";
          }

          // the low speed cutoff should not be higher than the target bpm
          if (BPMRecommendedRange[0] > testOptions.targetBPM) {
            BPMRecommendedRange[0] = testOptions.targetBPM;
          }

          // now make sure the high cutoff is higher by at least 10bpm than the low
          if (BPMRecommendedRange[0]+10 >= BPMRecommendedRange[1]) {
            BPMRecommendedRange[1] = BPMRecommendedRange[0]+10;
          }
        } else {
          console.log("There is no prior streak data");
          PriorStreak = [0,0,0,0];
          BPMRecommendedRange = [0, 10000];
          practiceStrategy = "";
          clearPriorAndRec();
        }
    }  // end of computePriorStreakData()

function compactDate(inputDate) {
  // Input format: 'YYYY-MM-DD'
  // Output format: 'DDMMMYY'

  // Array of month abbreviations
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Split the input date into components
  const [year, month, day] = inputDate.split('-');

  // Get the month abbreviation
  const monthAbbr = months[parseInt(month, 10) - 1];

  // Get the last two digits of the year
  const shortYear = year.slice(-2);

  // Combine the components into the desired format
  return `${day}${monthAbbr}${shortYear}`;
}

    function toggleFavoriteBarSelection() {

      console.log("===ToggleFavBar: ns="+noteScope+" ns0="+noteScope[0]+" ns1="+noteScope[1]+" ns0f="+noteScope[0].first+" ns0l="+noteScope[0].last+" ns0nr="+noteScope[0].lastNonrest+
        " ns1f="+noteScope[1].first+" ns0l="+noteScope[1].last+" ns1nr="+noteScope[1].lastNonrest);

      removeTrailingRestsFromNoteScope();

      if (noteScope === null || noteScope[0] === null || noteScope[1] === null) {
        // there is no notescope so don't do anything
        console.log("No notescope (NULL) so not toggling favorite selection ns="+noteScope+" ns0="+noteScope[0]+" ns1="+noteScope[1]);
        setFavoriteIcon(false);
        return;
      }

      const pref = getHistoryPref();

      console.log("toggleFav: Found history pref favorite:"+pref.favorite);

      if (isAvail(pref.favorite)) {
        pref.favorite = !pref.favorite;
      } else {
        pref.favorite = true; // default is true for new ranges created
      }
      setFavoriteIcon(pref.favorite);
      console.log("ToggleFav: final value is:"+pref.favorite);

      saveRunHistory();

      const afterpref = getHistoryPref();
      console.log("After save pref="+afterpref.favorite);

      computePriorStreakData(); // redraw which ones are displayed

    }

    function computeBarReps() {
      if (runHistory === null) {
        loadRunHistory();
      }
      const name = curPresetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex symbols in preset name
      const p = "^[0-9-]+\\|"+name;
      //console.log("BARREPS: name pattern="+p);
      const pattern = new RegExp(p);
      const barpattern = new RegExp("^"+name+" B([0-9]+)-?([0-9]+)?$");

      barReps = [];

      maxBar = avail(maxBar,1);
      console.log("Maxbar:"+maxBar);

      // init to all 0
      for (let i = 1; i <= maxBar; i++) {
        barReps[i] = [0,0,0];
      }

      const handmap = {"left":0, "right":1, "both":2};

      for (const key in runHistory) {
        if (key.startsWith(".PREF.")) {
          //console.log("Skipped PREF:"+key);
          continue;
        }
        if (runHistory.hasOwnProperty(key) && pattern.test(key)) {
            //console.log("Got matching key:"+key);
            const [date, preset, hand] = key.split("|");

            if (! preset.startsWith(curPresetName)) {
              console.log("No actual match, skipping");
              continue;
            }
            const reps = parseInt(avail(runHistory[key].success, 0));

            let barrange = preset.match(barpattern);

            //console.log("BarData: barrange len="+((barrange===null)?"NULL!":barrange.length));

            if (barrange === null || barrange.length === 1) {
              barrange = [];
              barrange[0] = 1;
              barrange[1] = parseInt(avail(runHistory[key].maxBar, avail(maxBar,1)));
              //console.log("Barrange is null, setting to range 1-maxBar:"+maxBar);
            } else if (barrange.length === 2) {
              //console.log("Barrange items:"+barrange[1]+":"+barrange[2]+":");
              barrange[0] = parseInt(barrange[1]); // the key was like B1, meaning range 1 to 1
              barrange[1] = parseInt(barrange[1]);
            } else if (barrange.length === 3) {
              //console.log("Barrange items:"+barrange[0]+":"+barrange[1]+":"+barrange[2]);
              // zero item is just whole pattern. 1 will be first number in range but 2 could be undefined.
              barrange[0] = parseInt(barrange[1]);
              barrange[1] = parseInt(avail(barrange[2], barrange[1]));
            }

            //console.log("BarData: for key '"+key+"' adding "+reps+" to bars '"+barrange[0]+"' to '"+barrange[1]+"' hand="+hand+" handmap:"+handmap[hand]);
            for (let b = barrange[0]; b <= barrange[1]; b++) {
              if (!isAvail(barReps[b])) {
                barReps[b] = [0,0,0];
              }
              barReps[b][handmap[hand]] += reps;
              //console.log("B"+b+" "+handmap[hand]+"="+barReps[b][handmap[hand]]);
            }
        }
      }
      //let repstr = "reps: ";
      //for (let b = 1; b <= maxBar; b++) {
        //repstr += "B"+b+":"+barReps[b][0]+","+barReps[b][1]+","+barReps[b][2]+" ";
      //}
      //console.log("BARREPDATA: "+repstr);
      return barReps;
    }

    // MOVED TO storage.js: function loadRunHistory(force=false)

    // MOVED TO freeplay.js: function deepcopy(obj)
// MOVED TO freeplay.js: function saveFreePlay()
// MOVED TO freeplay.js: function loadFreePlay()
// MOVED TO freeplay.js: function logFreePlay(elapsed, replace=false)


    function logOneRun(elapsed, notefail, strikes, bpm) {
      const runName = todayDate() + "|" + curPresetName + historyNameModifier() + "|" + getSelectedHand();

      if (runHistory === null) {
        // hasn't been read yet
        loadRunHistory();
      }
      const wallTime = Date.now() - testStartTime + testPauseTime;

      testOptions.wallTimeToday = wallTime;

      if (typeof runHistory[runName] === "undefined") {
        runHistory[runName] = {};
        runHistory[runName].count = 0;
        runHistory[runName].elapsed = 0;
        runHistory[runName].wallTime = 0;
        runHistory[runName].sumBPM = 0;
        runHistory[runName].notefail = 0;
        runHistory[runName].success = 0;
        runHistory[runName].maxBPM = 0;
        runHistory[runName].bestBPM = 0;
        runHistory[runName].sumStrikes = 0;
        runHistory[runName].maxStreak = [0,0,0,0];
        runHistory[runName].maxStreakBPM = [0,0,0,0];
        runHistory[runName].maxStreak10BPM = [0,0,0,0];
        runHistory[runName].maxStreakAtEnd = [false,false,false,false];
        runHistory[runName].goodNotes = 0;
        runHistory[runName].maxBar = maxBar;
        if (isNaN(maxBar)) {
          console.log("WARNING: runhistory maxBar set to Nan");
        }
        runHistory[runName].targetBPM = avail(testOptions.targetBPM,0);
        runHistory[runName].isFreePlay = false;
        runHistory[runName].personalBest = false;

        if (noteScope === null || !isAvail(noteScope[0].first) || !isAvail(noteScope[1].first)) {
          runHistory[runName].noteScope = [{},{}];
        } else {
          runHistory[runName].noteScope = deepcopy(noteScope);
        }
      }

      runHistory[runName].wallTime = wallTime; // this doesn't increment, it's just overwritten.

      if (!isAvail(runHistory[runName].maxStreak)) {
        runHistory[runName].maxStreak = [0,0,0,0];
      }

      if (!isAvail(runHistory[runName].maxStreakBPM)) {
        runHistory[runName].maxStreakBPM = [0,0,0,0];
      }

      if (!isAvail(runHistory[runName].maxStreak10BPM)) {
        runHistory[runName].maxStreak10BPM = [0,0,0,0];
      }

      if (!isAvail(runHistory[runName].isFreePlay)) {
        runHistory[runName].isFreePlay = false;
      }

      for (let q = 0; q < 4; q++) {
        // if the streak is longer, or if the streak is equal but bpm is higher, update history maxstreak
        if (maxStreak[q] > runHistory[runName].maxStreak[q] ||
            (maxStreak[q] == runHistory[runName].maxStreak[q] &&
              maxStreakBPM[q] > avail(runHistory[runName].maxStreakBPM[q],0))
            ) {
          runHistory[runName].maxStreak[q] = maxStreak[q];
          runHistory[runName].maxStreakBPM[q] = maxStreakBPM[q];
        }
        if (curStreak[q] === runHistory[runName].maxStreak[q] &&
            curStreakBPM[q] === runHistory[runName].maxStreakBPM[q]) {
              runHistory[runName].maxStreakAtEnd[q] = true;
        } else {
            runHistory[runName].maxStreakAtEnd[q] = false;
        }

        // nonZero is used for the numerator because it also takes care of undefined or NaN situations
        const curbpm = Math.trunc(nonZero(curStreakBPM[q])/nonZero(curStreak[q]));
        if (curStreak[q] >= 10 && curbpm > runHistory[runName].maxStreak10BPM[q]) {
          runHistory[runName].maxStreak10BPM[q] = curbpm;
        }
      }

      if (!isAvail(runHistory[runName].numQBPM)) {
          runHistory[runName].numQBPM = [0,0,0,0];
      }
      if (!isAvail(runHistory[runName].sumQBPM)) {
        runHistory[runName].sumQBPM = [0,0,0,0];
      }

      runHistory[runName].count++;
      runHistory[runName].elapsed += elapsed;

      if (!isAvail(runHistory[runName].goodNotes)) {
        runHistory[runName].goodNotes = 0;
      }
      runHistory[runName].goodNotes += goodNotes;
      goodNotes = 0; // this is a global right now

      runHistory[runName].maxBar = maxBar; // so we can tally reps per bar
      if (isNaN(maxBar)) {
        console.log("Warning: Runistory for "+runName+" is NaN. setting to null");
        maxBar = null;
      }
      if (notefail) {
        runHistory[runName].notefail++;

        if (!isAvail(runHistory[runName].errorNotes)) {
          runHistory[runName].errorNotes = [[],[]];
        }
        if (!isAvail(runHistory[runName].errorNotes[currentErrorNote.hand][currentErrorNote.noteIndex])) {
          runHistory[runName].errorNotes[currentErrorNote.hand][currentErrorNote.noteIndex] = 0;
        }
        runHistory[runName].errorNotes[currentErrorNote.hand][currentErrorNote.noteIndex]++;
      } else {
        runHistory[runName].success++;
        runHistory[runName].sumStrikes += strikes;
        runHistory[runName].sumBPM += bpm;
        if (bpm > runHistory[runName].maxBPM) {
          runHistory[runName].maxBPM = bpm;
        }
        if (strikes === 0 && bpm > runHistory[runName].bestBPM) {
          runHistory[runName].bestBPM = bpm;
        }
        if (!runHistory[runName].numQBPM[strikes]) {
          runHistory[runName].numQBPM[strikes] = 0;
          runHistory[runName].sumQBPM[strikes] = 0;
        }
        runHistory[runName].numQBPM[strikes] += 1;
        runHistory[runName].sumQBPM[strikes] += bpm;
      }

      // update personalBest
      const strbpm = Math.trunc(nonZero(runHistory[runName].maxStreakBPM[2])/nonZero(runHistory[runName].maxStreak[2]));
      const curAccuracy = percent(runHistory[runName].success, runHistory[runName].count);

      //console.log("LOG: Prestreak10 check");

      if (curAccuracy >= 85 && isAvail(runHistory[runName].maxStreak10BPM) &&
          avail(runHistory[runName].maxStreak10BPM[2],0) >= avail(personalBestStreakBPM,10000)) {
        runHistory[runName].personalBest = true;
      } else {
        runHistory[runName].personalBest = false;
      }

      //console.log("LOG: Logging count:"+runHistory[runName].count+" succ:"+runHistory[runName].success);
      saveRunHistory();
    }

    // MOVED TO storage.js: function saveRunHistory()

    function displayStreaks() {
      // for now hard code passing quality, but this should be a preference
      const streakbpm = Math.trunc(curStreakBPM[2]/nonZero(curStreak[2]));
      const maxstreakbpm = Math.trunc(maxStreakBPM[2]/nonZero(maxStreak[2]));
      document.getElementById("curStreakDiv").innerHTML =
        "<span onclick='resetStreak();'><i class=\"fa-solid fa-arrow-up-wide-short\" style=font-size:9px></i>Streak:</span><br><span class=bigstat  onclick='resetStreak();' >"+curStreak[2]+"</span><sub>"+
          streakbpm+"</sub><br><span onclick='resetStreak();' style=font-size:small>Cur <i class=\"fa-solid fa-circle-xmark\" style=font-size:10px></i></span>";
      document.getElementById("maxStreakDiv").innerHTML =
        "<br><span class=bigstat>"+maxStreak[2]+"</span><sub>"+maxstreakbpm+"<br><span style=font-size:small>Max</span>";

      const strbpm = Math.trunc(curStreakBPM[2]/curStreak[2]);
      const curAccuracy = percent(successCount, successCount + failCount);

      if ((curStreak[2]%5) === 0 && curStreak[2] !== 0) {
        say("Streak "+curStreak[2]);

        if (curStreak[2] >= 10 &&
            strbpm > personalBestStreakBPM &&
            strbpm > personalBestStreakBPMToday &&
            curAccuracy >= 85) {
            say("Personal Best Streak Speed: "+spokenNumber(strbpm));
        }
      }
      // the above only happens every 5 iterations, so still need to
      // update personalBestStreakBPMToday
      if (curStreak[2] >= 10 && curAccuracy >= 85) {
        if (strbpm > personalBestStreakBPMToday) {
          personalBestStreakBPMToday = strbpm;
        }
      }
    }

    function resetStreak() {
      curStreak = [0,0,0,0];
      curStreakBPM = [0,0,0,0];
      displayStreaks();
      console.log("Cleared Current Streak");
    }

    function percent(a, b) {
      return Math.trunc(100*nonZero(a)/nonZero(b));
    }

    function daysSince(date) {
      const past = new Date(date);
      const today = new Date();
      today.setHours(0,0,0,0);
      const millis = today - past;
      const days = Math.trunc(millis/(1000*60*60*24));
      return days;
    }

    // get the current date in yyyy-mm-dd format
    function todayDate(offsetDays = 0) {
      const currentDate = new Date(Date.now()-offsetDays*60*60*24*1000);
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based, so we add 1 and pad with '0' if needed.
      const day = String(currentDate.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    // Function to handle the "Done" button click
    function done() {
      if (currentState === STATE.SETTING_NOTES) {
        currentState = STATE.WAITING_FOR_BUTTON;

        // Enable the "Set Notes" button and disable the "Done" button
        //document.getElementById('setNotesButton').disabled = false;
        document.getElementById('testNotesButton').disabled = false;
        //document.getElementById('doneButton').disabled = true;

        // create a string to make it easy to create presets
        let preset = "{name: 'new', leftHand: [";
        for (let i = 0; i < notesToPlay[0].length; i++) {
          preset += notesToPlay[0][i] + ", ";
        }
        preset += "], rightHand: [";
        for (let i = 0; i < notesToPlay[1].length; i++) {
          preset += notesToPlay[1][i] + ", ";
        }
        preset += "]};";
        message(preset);
        message("(Copied to clipboard)");
        copyToClipboard(preset);

        if (notesToPlay[0].length && notesToPlay[1].length) {
            changeSelectedHand('both');
        } else if (notesToPlay[0].length) {
            changeSelectedHand('left');
        } else {
            changeSelectedHand('right');
        }

        setNoteFilters();

      }
    }

    document.addEventListener('fullscreenchange', function() {
      document.getElementById("fullscreenButton").innerHTML = document.fullscreenElement ? "<i class=\"fa-regular fa-rectangle-xmark\"></i>&nbsp;Full" : " <i class=\"fa-solid fa-expand\"></i> Full";
    });

    function exitFullscreen() {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        return; // we were not fullscreen anyway
      }
      document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
      document.getElementById("fullscreenButton").innerHTML = "<i class=\"fa-solid fa-expand\"></i> Full";
    }

    function fullscreen(force=false) {

      if (document.fullscreenElement && !force) {
        // already full screen so exit
        // because we were already full screen we know one of the two apis below are in effect
        document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
        document.getElementById("fullscreenButton").innerHTML = "<i class=\"fa-solid fa-expand\"></i>  Full";
        return;
      }

      // if we get here the browser was not already full screen
      //console.log("fullscreen() is going into fullscreen mode");
      // Check if the browser supports the Fullscreen API
      if (document.documentElement.requestFullscreen) {
        // Request full-screen mode on the document element
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        // For older versions of Chrome, use the webkitRequestFullscreen method
        document.documentElement.webkitRequestFullscreen();
      } else {
        // Full-screen API is not supported
        alert('Fullscreen mode is not supported in this browser.');
        return;
      }
      document.getElementById("fullscreenButton").innerHTML = "<i class=\"fa-regular fa-rectangle-xmark\"></i> Full";
    }

    // Function to display a message in the console
    function message(text) {
      let consoleDiv = document.getElementById('console');
      let messageP = document.createElement('p');
      messageP.innerHTML = text;
      consoleDiv.appendChild(messageP);
      consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }


    // Function to display a warning message in the console
    function warning(text) {
      let consoleDiv = document.getElementById('console');
      let messageP = document.createElement('p');
      messageP.style.color = 'red';
      messageP.textContent = text;
      consoleDiv.appendChild(messageP);
      consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }

    // Function to display a message in the console
    function messageStats(text) {
      let statsDiv = document.getElementById('statsDiv');
      statsDiv.innerHTML = text;
    }

    function errorStats(error) {
      let statsDiv = document.getElementById('statsDiv');
      let consoleDiv = document.getElementById('console');

      if (error) {
        document.body.style.backgroundColor = bodyAlertColor;
      } else {
        document.body.style.backgroundColor = bodyColor;
      }
    }


    const handmodes = ['lh', 'rh', 'ht'];
    const selmodes = {lh:'left', rh:'right', ht:'both'};
    const modesels = {left:'lh', right:'rh', both:'ht'};

    // Function to get the selected hand from the pulldown menu
    function getSelectedHand() {
      const handmodes = ['lh', 'rh', 'ht'];
      const selmodes = {lh:'left', rh:'right', ht:'both'};
      const modesels = {left:'lh', right:'rh', both:'ht'};
      for (const mode of handmodes) {
        if (document.getElementById(mode).classList.contains('selected')) {
          return selmodes[mode];
        }
      }
      return null; // No mode selected
    }

    function changeBarScope(barscope, lfirst, llast, rfirst, rlast) {

      busyIndicator(true);

      // in order for the busy indicator to show up, the rest of this function is
      // scheduled for a bit of time in the future (1/20 of a second so won't meaningfully
      // add lag)

      setTimeout(async function changeBarScopeWork() {

        if (typeof lfirst === "number") {
          if (noteScope[0].first == lfirst && noteScope[0].last == llast &&
            noteScope[1].first == rfirst && noteScope[1].last == rlast) {
              // this one is already selected, so desect them all
              clearNotesToPlaySelection();
              console.log("ChangeBarScope returning early");
              busyIndicator(false);
              return;
          }
        }

        noteScope[0].first = lfirst;
        noteScope[0].last = llast;
        noteScope[1].first = rfirst;
        noteScope[1].last = rlast;

        // now make adjustments and display the new scope
        removeTrailingRestsFromNoteScope();
        recolorNoteScope(0);
        recolorNoteScope(1);
        computeBeatsToPlay();
        scrollToFirstNote();
        computePriorStreakData();
        recolorBarPresets(barscope);
        displayPriorRunStats();


        const fav = document.getElementById("toggleFavoriteIcon");
        fav.style.display = "inline";
        const histpref = getHistoryPref(barscope);
        if (histpref.favorite) {
          fav.style.color = "red";
        } else {
          fav.style.color = "silver";
        }

        clearStats(); // when changing the selection clear the stats automatically

        loadTodayStats(); // if there are other runs from the current day, display them in the stats area.
        // await simulateDelay(2000); // this is just for testing the wait indicator on slow devices
        busyIndicator(false);
      }, 50); // allow keyboard animation enough time to display busy indicator
    }


    function recolorBarPresets(boxid) {
      console.log("RecolorBarPresets:"+boxid);
      const modeBoxes = document.querySelectorAll('#barSelectContainer .mode-box-bars');

      modeBoxes.forEach(box => {
          if (boxid === box.id) {
            box.classList.add('mode-box-bars-selected');
            //console.log("recolor Selected:"+box.id);
          } else {
            box.classList.remove('mode-box-bars-selected');
            //console.log("recolor UNSelected:"+box.id);
          }
      });
    }

    function getHistoryPref(barscope=null, prefname=null, newpref = null) {
      if (barscope === null) {
        barscope = historyNameModifier();
      }
      if (barscope.startsWith(" ")) {
        barscope = barscope.substr(1);
      }

      if (prefname === null) {
        prefname = ".PREF."+curPresetName+" "+barscope;
      }
      console.log("getHistoryPref looking for /"+barscope+"/ prefname=/"+prefname+"/");
      if (isAvail(runHistory[prefname])) {
        if (!isAvail(runHistory[prefname].favorite)) {
          runHistory[prefname].favorite = (newpref!==null)?newpref:true; // default is true for new ranges
          console.log("Created new favorite pref for /"+barscope+"/="+(newpref!==null)?newpref:true);
        } else if (newpref !== null) {
          runHistory[prefname].favorite = (newpref!==null)?newpref:true;
        }
      } else {
        runHistory[prefname] = {};
        runHistory[prefname].favorite = (newpref!==null)?newpref:true;
        console.log("Creating new favorate pref for /"+prefname+"/=true");
      }
      //console.log("getHistoryPref /"+prefname+"/="+runHistory[prefname].favorite);

      if (newpref !== null) {
        console.log("Saving history pref for "+prefname);
        saveRunHistory();
      }

      return runHistory[prefname];
    }

    function clearAllBarPresetButtons() {
      const modeBoxes = document.querySelectorAll('#barSelectContainer .mode-box-bars');
      // Loop through the NodeList of elements and print their IDs
      modeBoxes.forEach(box => {
        box.classList.remove('mode-box-bars-selected');
      });
    }

    // Function to change the selected hand in the pulldown menu
    function changeSelectedHand(hand, announce=false) {
      const handmodes = ['lh', 'rh', 'ht'];
      const selmodes = {lh:'left', rh:'right', ht:'both'};
      const modesels = {left:'lh', right:'rh', both:'ht'};

      handmodes.forEach(m => {
        const modeBox = document.getElementById(m);
        if (m === modesels[hand]) {
          modeBox.classList.add('selected');
        } else {
          modeBox.classList.remove('selected');
        }
      });

      setNoteFilters(); // when hand changes this needs to be updated immediately
      const s = computePriorStreakData(); // streak data is hand dependent
      displayPriorRunStats();

      if (s === null) {
        BPMRecommendedRange = [0, 10000];
        PriorStreak = [0,0,0,0];
        practiceStrategy = "";
      }
      if (announce) {
        sayTestParameters(true);
        displayTestStats(null,"reset");
      }

      clearStats(); // when changing hand, clear the stats

      loadTodayStats(); // reload any stats from current date for this hand
    }

    // Function to update the availability of selectable options in the pulldown menu
    function updateSelectableHands(leftAvailable, rightAvailable, bothAvailable) {

      return;  // for now do nothing
      let selHT = document.getElementById('ht');
      let selLH = document.getElementById('lh');
      let selRH = document.getElementById('rh');

      for (let i = 0; i < options.length; i++) {
        let option = options[i];
        let value = option.value;

        if ((value === 'left' && leftAvailable !== null) ||
            (value === 'right' && rightAvailable !== null) ||
            (value === 'both' && bothAvailable !== null)) {
          option.disabled = !(value === 'left' && leftAvailable) &&
                            !(value === 'right' && rightAvailable) &&
                            !(value === 'both' && bothAvailable);
        }
      }

      // Enable the pulldown menu
      handSelect.disabled = false;
    }


    function displayTestStats(notes, displayType) {
      let alerts = []; // alert structures for graph annotations
      let metmean = 0;
      let suppressBestBPM = false;

      if (wrongNotePlayed && preferences['enableTones'] && preferences['toneOnNoteFail'] !== 'none') {
          playMIDINote(preferences['toneOnNoteFail'],
          preferences['toneDuration']*2, preferences['toneVelocity'],
          preferences['toneFailVoice']);
      }

      // Increment the repetition count
      repCount++;

      // Calculate average BPM
      let duration = 1;
      let beatCount = 1;
      if (notes !== null && !wrongNotePlayed) {
        let stime = 0;
        let etime = 0;
        const hand = getSelectedHand();

        if (hand === 'both') {
          stime = Math.min(notes[0][0].sTime, notes[1][0].sTime);
          etime = Math.max(notes[0][notes[0].length-1].eTime, notes[1][notes[1].length-1].eTime);
          beatCount = Math.max(beatsToPlay[0], beatsToPlay[1]);
        } else if (hand === 'left') {
          stime = notes[0][0].sTime;
          etime = notes[0][notes[0].length-1].eTime;
          beatCount = beatsToPlay[0];
        } else {
          stime = notes[1][0].sTime;
          etime = notes[1][notes[1].length-1].eTime;
          beatCount = beatsToPlay[1];
        }
        duration = etime - stime;
        totalDuration += duration;
      }

      averageBPM = totalDuration === 0 ? 0 : Math.trunc((beatCount) * successCount / (totalDuration / 60000));
      let currentBPM = 0;
      if (notes !== null && !wrongNotePlayed) { // don't update currentBPM if we're in error state

        currentBPM = Math.trunc((beatCount) / (duration / 60000));
        if (typeof currentBPM !== "number") {
          warning("currentBPM is not a number. beatCount="+beatCount+" duration="+duration+
            " dur/60k="+duration/60000+" beatstoplay[0]="+beatsToPlay[0]+" beatsToPlay[1]="+beatsToPlay[1]+
            " stime="+stime+" etime="+etime);
            currentBPM = 0;
        }
        if (Math.trunc(currentBPM) >= Math.trunc(maxBPM)) {
          if (maxBPM != 0) {
            say("top speed "+ spokenNumber(currentBPM), false, "TOPSPEED");
            suppressBestBPM = true;
          }
          maxBPM = currentBPM;
        }
      } else {
        currentBPM = 0;
      }

      const curAccuracy = percent(successCount, (successCount + failCount));

      // advise if outside of suggested range
      // Early in a streak (up to 3) we won't warn as this may be a "warmup".
      // Also, we will not warn about dragging if the current session accuracy is low
      // since the user may be slowing down to try to get back on track for accuracy.
      const maxSpeedWarning = 5;

      if (draggingWarning < maxSpeedWarning && currentBPM !== 0 &&
            currentBPM < BPMRecommendedRange[0] && curStreak[2] > 3 && curAccuracy > 85) {
        say("dragging", false, "RUSHDRAG");
        draggingWarning++;
      }
      if (draggingWarning === maxSpeedWarning) {
        say("Dragging warnings suppressed", false, "RUSHDRAG");
        draggingWarning++;
      }
      if (rushingWarning < maxSpeedWarning && currentBPM > BPMRecommendedRange[1]) {
        say("rushing", false, "RUSHDRAG");
        rushingWarning++;
      }
      if (rushingWarning === maxSpeedWarning) {
        say("Rushing warnings suppressed", false, "RUSHDRAG");
        rushingWarning++;
      }

      const s = avail(testOptions.beatDur, 1/4);
      if (s === 1) {
        currentBPMNote = M["whole"];
      } else if (s === 1/2) {
        currentBPMNote = M["half"];
      } else if (s === 1/4) {
        currentBPMNote = M["quarter"];
      } else if (s === 1/8) {
        currentBPMNote = M["8th"];
      } else if (s === 1/16) {
        currentBPMNote = M["16th"];
      } else if (s === 1/32) {
        currentBPMNote = M["32nd"];
      } else {
        currentBPMNote = s; // just use a fraction
      }

      // Print repetition and BPM details
      //console.log("Displaying success:"+successCount+" fail:"+failCount);
      let stats = "<table><tr style='border-bottom:1px solid black'>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="number of successful repetitions">REPS:<br><span class=bigstat style="color:green">' +
        successCount +
        '</span>&nbsp;' + curAccuracy + '%</td>';

      stats += '<td style=vertical-align:top;border:none title="number of note failures">NFail<br><span class=smallstat style="color:red">' +
        failCount + '</span></td>';
      stats += '<td style=vertical-align:top;border:none title="number of quality failures">QFail<br><span class="smallstat" style="color:red">' +
        softFailCount + '</span></td>';

      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="speed of the most recent successful repetition" '+
                'onclick="setMetroBPM('+(currentBPM?Math.trunc(currentBPM):metroBPM)+', true)">BPM:&nbsp;'+currentBPMNote+'<br><span class=bigstat>' +
        (currentBPM?Math.trunc(currentBPM):"&nbsp;") + '</span></td>';
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="average speed over all REPS">Avg:<br><span class=smallstat>' +
        Math.trunc(averageBPM) + "</span></td>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="highest speed over all REPS">Max:<br><span class=smallstat>' +
        Math.trunc(maxBPM) + "</span></td>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px; title="highest speed with a score of EXCELLENT">Best:<br><span class=smallstat>' +
          Math.trunc(bestBPM) + "</span></td>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="average speed of EXCELLENT REPS">AvgHQ:<br><span class=smallstat>' +
          (numQBPM[0]?Math.trunc(sumQBPM[0]/numQBPM[0]):0) + "</span> <span style=font-size:small>("+numQBPM[0]+")</span></td>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="average speed of GOOD REPS">AvgMQ:<br><span class=smallstat>' +
          (numQBPM[1]?Math.trunc(sumQBPM[1]/numQBPM[1]):0) + "</span> <span style=font-size:small>("+numQBPM[1]+")</span></td>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="average speed of PASSING REPS">AvgLQ:<br><span class=smallstat>' +
              ((numQBPM[2])?Math.trunc((sumQBPM[2])/(numQBPM[2])):0) +
              "</span> <span style=font-size:small>("+(numQBPM[2])+")</span></td>";
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="average speed of QFAIL REPS (SLOW DOWN)">AvgQF:<br><span class=smallstat>' +
              ((numQBPM[3])?Math.trunc((sumQBPM[3])/(numQBPM[3])):0) +
              "</span> <span style=font-size:small>("+(numQBPM[3])+")</span></td>";
              let nonzero = (nnAccuracy.success+nnAccuracy.fail)?0:1;
              if (nonzero === 0 && nnAccuracy.fail === 0) {
                // never give 100% accuracy, if for no other reason that if there are only a small
                // number of runs our estimated accuracy can't be very certain.
                // we will estimate that there is a 0.5/numsuccess probability of error that we just
                // haven't been lucky enough to detect.
                nonzero = 1/(nnAccuracy.success+0.001);
              }
              //console.log("NONZERO="+nonzero);
              let displaynacc = (100*(nnAccuracy.success/(nnAccuracy.success+nnAccuracy.fail+nonzero)).toFixed(4)).toFixed(2);
              if (parseFloat(displaynacc) > 99.99) {
                displaynacc = 99.99;
              }
      stats += '<td style=vertical-align:top;border:none;padding-right:2px title="Note to note accuracy, what percentage of actual notes did you get right">NNAcc:<br><span class=smallstat>' +
              displaynacc +
              "</span><br><span style=font-size:x-small>("+nnAccuracy.success+":"+nnAccuracy.fail+")</td>";

      stats += '<td style=vertical-align:top;border:none;padding-right:2px;color:blue><span id=priorRunStatsTD title="Streak data from your prior session (before today)">PriorStrk:</span></td>';
      stats += '<td style=vertical-align:top;border:none;padding-right:2px;color:blue><span id=recommendedBPMTD title="Recommended practice speed of this preset today">RecBPM:</span></td>';
      stats += '<td style=vertical-align:top;border:none;padding-right:2px;color:white;line-height:1.5><div id=currentRunEval title="Qualitative evaluation of current practice run">Eval:</div></td>';

      stats += "</tr>";
      // compute quality metrics, hands togetherness
      // but only compute this if testing in hands together mode, and if
      // both sets of notes are the same length

      let strikes = 0; // three strikes gets you a slow down message

      stats += "<tr style='border:none'>";
      if (notes !== null && !wrongNotePlayed && getSelectedHand() === 'both' &&
          notes[0].length === notes[1].length && testOptions.constDur !== false) {

        let together = 0;
        let apart = 0;
        let htStat = new StatTracker();

        for (let i = 0; i < notes[0].length; i++) {
          apart += Math.abs(notes[0][i].sTime - notes[1][i].sTime);
          apart += Math.abs(notes[0][i].eTime - notes[0][i].eTime);

          let overlap = Math.min(notes[0][i].eTime, notes[0][i].eTime)
                - Math.max(notes[0][i].sTime, notes[1][i].sTime);
          htStat.addDataPoint(percent(overlap, (apart+overlap)));

          if (overlap < 0) overlap = 0;
          together += overlap;
        }

        const htqmerit = percent(together, (together+apart));
        stats += tdPreferenceDisplay("scoreHTQ", "HTQ", htqmerit, "", "Hands Together Quality Metric, click to enable/disable.");

        if (preferences['scoreHTQ']) {
          strikes += strikeScore(htqmerit);
        }

      } else {
        stats += tdPreferenceDisplay("scoreHTQ", "HTQ", 0, "(na)", "Hands Together Quality Metric, click to enable/disable.");
      }

      if (notes !== null && !wrongNotePlayed) {
        // Metric quality: were notes played for the correct amount of time?
        // Could track for left and right independently to find trouble spots.

        let metStat = new StatTracker();

        for (let h = 0; h < 2; h++) {
          for (let i = 0; i < notes[h].length; i++) {
            if (notes[h][i].eTime === null) {
              continue; // don't count notes that are not yet released.
            }

            let d = calcDur(h,i+noteScope[h].first);

            if (d === 0) {
              d = 0.1; // quick fix for now for crushed notes, just make it a fairly short duration
            }

            let std = avail(testOptions.beatDur, 1/4);

            const data = (notes[h][i].eTime - notes[h][i].sTime) * (parseFloat(std) / parseFloat(d));

            //console.log("METQ DP: h="+h+"i="+i+" data="+data+" d:"+d+" std:"+std+" et:"+notes[h][i].eTime+" st:"+notes[h][i].sTime);

            metStat.addDataPoint(
              data,
              [h,i]
            );
          }
        }
        metmean = metStat.calculateMean();
        const metsd = metStat.calculateStandardDeviation();
        let metmerit = metmean?Math.trunc(100*(1 - (metsd/metmean))):0;
        if (metmerit < 0) metmerit = 0;
        //console.log("Generating MetQ, prefs="+preferences['scoreMetQ']);
        stats += tdPreferenceDisplay('scoreMetQ', "MetQ", metmerit, "(" +
          Math.trunc(metmean)+"&plusmn;"+Math.trunc(metsd)+")",
          "Metric Quality, measures whether note durations are consistent with score.");

        metStat.findOutliers("SHORT", "LONG", alerts);

        if (preferences['scoreMetQ']) {
          strikes += strikeScore(metmerit);
        }

        // Dynamic quality: were notes played at approximately the same loudness?
        // Could track this separately for left and right hands as well to see if one is overpowering

        let dynStat = new StatTracker();
        let minVelocity = 1000;
        let maxVelocity = 0;
        let noteMinVelocity = -1;
        let noteMaxVelocity = -1;

        for (let h = 0; h < 2; h++) {
          for (let i = 0; i < notes[h].length; i++) {
            if (notes[h][i].note.number === RESTNOTE) {
              // obviously rest notes have no velocity and shouldn't enter
              // into this metric
              continue;
            }
            const v = 100*notes[h][i].velocity;
            dynStat.addDataPoint(v, [h,i]);
            if (v > maxVelocity) {
              maxVelocity = v;
              noteMaxVelocity = [h,i];
            }
            if (v < minVelocity) {
              minVelocity = v;
              noteMinVelocity = [h,i];
            }
          }
        }
        const dynmean = dynStat.calculateMean();
        const dynsd = dynStat.calculateStandardDeviation();
        let dynmerit = Math.trunc(100*(1 - (dynsd/dynmean)));
        if (dynmerit < 0) dynmerit = 0;

        if (minVelocity < dynmean*0.6) {
          alerts.push({
            name: "QUIET",
            note: noteMinVelocity
          })
        }

        if (maxVelocity > dynmean*1.4) {
          alerts.push({
            name: "LOUD",
            note: noteMaxVelocity
          })
        }

        if (preferences['scoreDynQ']) {
          strikes += strikeScore(dynmerit);
        }
        stats += tdPreferenceDisplay('scoreDynQ', "DynQ", dynmerit,
            "("+Math.trunc(dynmean)+"&plusmn;"+Math.trunc(dynsd)+")",
            "Dynamic Quality metric, measures if loudness of notes is consistent with score.");

        // Legato quality: were consecutive notes in the same hand played with
        // little or no gap and little or no overlap?
        // Could track this separately for left and right hands as well to see
        // if one is better or worse

        let legSum = 0; // sum of all note durations
        let legError = 0; // sum of end/start gap or overlap errors
        let legNum = 0; // number of data points
        let gap = 0;
        let overlap = 0;
        let numgap = 0;
        let numoverlap = 0;
        let staccattoSum = 0;
        let noteMaxOverlap = -1;
        let maxOverlap = 0;

        for (let h = 0; h < 2; h++) {
          for (let i = 0; i < notes[h].length-1; i++) {
            // we will consider perfect to be 0 gap and 0 overlap, so take the absolute value
            // of the end of first note minus start of the next and accumulate this.
            legNum++;
            const notedur = notes[h][i].eTime - notes[h][i].sTime;
            legSum += notedur;
            let diff = notes[h][i].eTime - notes[h][i+1].sTime;
            if (diff > 0) {
              overlap += diff;
              numoverlap++;
              if (diff > maxOverlap) {
                maxOverlap = diff;
                noteMaxOverlap = [h,i];
              }
              // we allow up to 10% overlap of the second note's duration to
              // not be an error at all.
              // ENHANCEMENT: It might be a good idea to let the user determine
              // this percentage as a preference, because there is disagreement among teachers about
              // how much overlap, if any, is permissible.
              const tenpercent = 0.1*(notes[h][i+1].eTime - notes[h][i+1].sTime);
              diff -= tenpercent; // reduce diff by this amount
              if (diff < 0) diff = 0; // but don't let it go below zero

              // add nothing to staccatto sum because any overlap for staccatto is
              // a fail.

            } else if (diff < 0) {
              gap -= diff;
              numgap++;

              if ((1-diff) > notedur) {
                staccattoSum += 100;
              } else {
                staccattoSum += 100*(-diff/notedur);
              }
            }

            legError += Math.abs(diff);
          }
        }
        let legMerit = legSum?Math.trunc(100 - 100*(legError/legSum)):0;
        if (legMerit < 0) legMerit = 0;

        const avggap = numgap?Math.trunc(gap/numgap):0;
        const avgoverlap = numoverlap?Math.trunc(overlap/numoverlap):0;

        //console.log("maxOverlap="+maxOverlap+" avgoverlap="+avgoverlap+" avgdur="+duration/beatCount);
        if (noteMaxOverlap != -1 && maxOverlap > avgoverlap*2 &&
          maxOverlap > (0.1*(duration/beatCount))) {
            // we will always allow up to 10% of average note duration for overlap
            // because some teachers say that lagato has some overlap
          alerts.push( {
            name: "OVLP "+percent(maxOverlap, avgoverlap)+"%",
            note: noteMaxOverlap
          });
          //console.log("Pushed alert");
        }
        stats += tdPreferenceDisplay('scoreLegQ', "LegQ", legMerit, "(g:" + avggap + " o:" + avgoverlap + ")",
                  "Legato quality metric, higher score if there is only a tiny overlap between successive notes of same hand.");

        // staccatto quality
        // staccatto quality will be considered 100% for a note that has a gap after it plays
        // that is greater than the notes duration. if gap is less than that, then quality is 100*gap/duration
        // if this is negative (i.e. overlap) then it's also 0 quality. The average quality of all notes is
        // then computed.
        const stacMerit = legNum?Math.trunc(staccattoSum/legNum):0;

        stats += tdPreferenceDisplay('scoreStaQ', "StaQ", stacMerit, "(g:" + avggap + " o:" + avgoverlap + ")",
                  "Staccatto quality metric, higher score if there is a gap between notes of same hand.");

        // if both legQ and staQ are being scored, we will score strikes based
        // on which one is better. This allows the user to turn both metrics on
        // and then practice legatto vs. staccato at will. Presumably they're trying
        // to do one or the other if they have both turned on.

        if (preferences['scoreStaQ'] && preferences['scoreLegQ']) {
          if (stacMerit > legMerit) {
            strikes += strikeScore(stacMerit);
          } else {
            strikes += strikeScore(legMerit);
          }
        } else if (preferences['scoreStaQ']) {
            strikes += strikeScore(stacMerit);
        } else if (preferences['scoreLegQ']) {
            strikes += strikeScore(legMerit);
        }

      } else {
        // no stats due to error
        stats += tdPreferenceDisplay('scoreMetQ', "MetQ", 0, "(na)", "Metric Quality, measures whether note durations are consistent with score.");
        stats += tdPreferenceDisplay('scoreDynQ', "DynQ", 0, "(na)", "Dynamic Quality metric, measures if loudness of notes is consistent with score.");
        stats += tdPreferenceDisplay('scoreLegQ', "LegQ", 0, "(na)", "Legato quality metric, higher score if there is only a tiny overlap between successive notes of same hand.");
        stats += tdPreferenceDisplay('scoreStaQ', "StaQ", 0, "(na)", "Staccatto quality metric, higher score if there is a gap between notes of same hand.");
      }

      // draw simple graph of number of runs with hq, mq, lq result.
      stats += "<td style=border:none><div id=curStreakDiv title='Current streak, number of consecutive runs without note errors and without QFAIL errors.'></div></td><td style=border:none><div id=maxStreakDiv title='Maximum streak today for current preset.'></div></td>";
      let totqbpm = numQBPM[0]+numQBPM[1]+numQBPM[2]+numQBPM[3];
      if (totqbpm === 0) totqbpm = 1; // avoid div by 0 errors

      // draw a simple bargraph showing relative number of high, medium, low, qfail runs
      stats += "<td style=border:none><div style=position:relative;width:100%;height:50px;><div style='background-color:green;position:absolute;bottom:0;left:20%;right:20%;height:" +
        100*numQBPM[0]/totqbpm + "%'></div></td>";
      stats += "<td style=border:none><div style=position:relative;width:100%;height:50px;><div style='background-color:blue;position:absolute;bottom:0;left:20%;right:20%;height:" +
        100*numQBPM[1]/totqbpm + "%'></div></td>";
      stats += "<td style=border:none><div style=position:relative;width:100%;height:50px;><div style='background-color:yellow;position:absolute;bottom:0;left:20%;right:20%;height:" +
        100*numQBPM[2]/totqbpm + "%'></div></td>";
      stats += "<td style=border:none><div style=position:relative;width:100%;height:50px;display:block><div style='background-color:red;position:absolute;bottom:0;left:20%;right:20%;height:" +
        100*numQBPM[3]/totqbpm + "%'></div></td>";

      stats += "<td colspan=4 style=border:none;vertical-align:middle;>"+
        "<div style='border:1px solid green;border-radius:5px;padding-left:4px' title='Metronome settings, click icon to turn on clicks or off. Click number to expand this area.'>"+
          "<div style=display:flex;flex-direction:row;>"+
            "<div id=metronomeIcon onclick='startMetronome();' "+
                    "style='cursor:pointer;background-color:transparent;align-self:center;border:1px solid black;border-radius:4px;padding-top:3px;padding-left:3px;'>"+
                    metronomeIconSVG()+
            "</div>"+
            "<div  id=metronomeDiv style=display:flex;flex-direction:row>"+
            "</div>"+
          "</div>"+
          "<div id=smartMetronomeDiv onclick=cycleSmartMetronome()><i class=\"fa-solid fa-arrow-rotate-right\"></i>FIXED</div>"+
        "</div>"+
      "</td>";

      stats += "</tr>";

      if (strikes > 2) { // sloppy play! warn user
        softFailCount++;
        // IMPLEMENT: if preferences say that a softFail is a fail, that logic should be here
        // for example this would cause a soft fail to cancel this as a REP
      }
      stats += "</table>";

      if (strikes > 3) {
        strikes = 3;
      }
      //console.log("Final Strikes="+strikes);

      // keep track of high, medium, and low quality runs
      // high quality is 0 strikes, medium is 1 strike, low is
      // 2 or 3 strikes
      if (currentBPM > 0 && !wrongNotePlayed) {
        sumQBPM[strikes] += currentBPM;
        numQBPM[strikes]++;

        if (strikes === 0 && !wrongNotePlayed && currentBPM > bestBPM) {
          if (bestBPM != 0 && !suppressBestBPM) {
            // we used to report bestbpm but it got to be too much talking.

            //const words = new SpeechSynthesisUtterance("Best BPM "+currentBPM);
            //setTimeout(function(){window.speechSynthesis.speak(words);}, 1000);
          }
            bestBPM = currentBPM;
        }
      }

      messageStats(stats);
      updateMetronome();

      // update streaks
      if (displayType !== "reset") { // we don't update streaks if this is just a repaint
        if (!wrongNotePlayed) {
          for (let q = 0; q < strikes; q++) {
            curStreak[q] = 0; // too many strikes for this streak
            curStreakBPM[q] = 0;
          }
          for (let q = strikes; q <= 3; q++) {
            // All streaks greater than or equal to strikes are extended.
            // for example if strikes == 1 (medium quality) then both
            // medium and low quality streaks are extended
            curStreak[q]++
            curStreakBPM[q] += currentBPM;
            // if curstreak > maxstreak, or if they're equal but curstreakbpm is higher,
            // then we have a new max streak.
            if (curStreak[q] > maxStreak[q] ||
                  (curStreak[q] === maxStreak[q] && curStreakBPM[q] > maxStreakBPM[q])) {
              maxStreak[q] = curStreak[q];
              maxStreakBPM[q] = curStreakBPM[q];
            }
          }
        } else {
          // on notefail, all streaks end
          curStreak = [0,0,0,0];
          curStreakBPM = [0,0,0,0];

          if (metroSmart) {
            console.log("RESETTING metroSmartExtra");
            metroSmartExtra = 0;
            updateMetronome();
          }
        }
      }
      displayStreaks();
      displayPriorRunStats();

      if (displayType !== "reset") { // don't log a run on a simple reset of the stats screen
        if (!wrongNotePlayed) {
          drawNoteBarGraph(notes, strikes, alerts, metmean);
          logOneRun(duration, false, strikes, currentBPM);
          scrollToFirstNote();
        } else {
          logOneRun(0, true, 0, 0); // wrong note was played, log a notefail.
        }
      }
      displayRunEval();

      function tdPreferenceDisplay(pref, tag, score, details, helpline="") {

        //console.log("Generating td for pref:/"+pref+"/ val="+preferences[pref]+" tag="+tag+" score="+score+" deets="+details+" title="+helpline);
        return "<td id=td"+pref+" style='vertical-align:top;border:none;padding-right:10px;" +
        "background-color:" + (preferences[pref]?statsColor:togglePrefColor) +
        ";opacity:" + (preferences[pref]?"1":"0.3") + "' " +
        "ontap=\"togglePref('" +pref+ "', null, 'prefIconToggle"+pref+"');\" " +
        "onclick=\"togglePref('" +pref+ "', null, 'prefIconToggle"+pref+"');\" " +
        "title='"+helpline+"' "+
        "><i id='prefIconToggle"+pref+"' class=\"fa fa-toggle-"+(preferences[pref]?"on":"off")+"\"></i>"+ tag +
        ":<br><span class=bigstat style='color:" + colorcode(score) + "'>" + score + "</span>" +
        "<br>"+details+"</td>";
        ;
      }
    }

    function displayRunEval() {

      const evaldiv = document.getElementById("currentRunEval");

      const runName = todayDate() + "|" + curPresetName + historyNameModifier() + "|" + getSelectedHand();
      const hist = runHistory[runName];

      if (!isAvail(hist) || hist.count < 5) {
        evaldiv.style.backgroundColor = "lightgrey";
        evaldiv.innerHTML = "Eval:&nbsp;NONE<br>(too few runs)";
      }

      if (!isAvail(hist)) {
        document.getElementById("elapsedRunTime").innerHTML = "net: "+formatTime(0);
        return; // can't do anything else, no history available
      }

      let elapse = Number((avail(hist.elapsed,0)/1000).toFixed(1));
      // user gets credit for 3 beats worth of rest in between runs
      const avgbpm = Math.trunc(hist.sumBPM/nonZero(hist.count));
      if (avail(avgbpm,0) > 0) {
        elapse += 3*Number(hist.count)*(60/avgbpm); // rest time allowed between runs
      }

      // figure out practice wall clock time efficiency
      const elapsedTime = Date.now() - testStartTime + testPauseTime;
      const elapsedSeconds = Math.floor(elapsedTime / 1000); // Convert milliseconds to seconds
      const eff = Math.trunc(100*elapse/nonZero(elapsedSeconds));

      document.getElementById("elapsedRunTime").innerHTML = "net: "+formatTime(elapse)+ " <span style=font-size:smaller>("+eff+"%)</span>";

      let streakbpm = 0;
      let streak = 0;

      if (isAvail(hist.maxStreakBPM) && isAvail(hist.maxStreakBPM[2]) &&
          isAvail(hist.maxStreak) && isAvail(hist.maxStreak[2])) {
            streak = hist.maxStreak[2];
            streakbpm = Math.trunc(0.5+avail(hist.maxStreakBPM[2],0)/(0.001+avail(hist.maxStreak[2],1)));
      }

      const acc = percent(hist.success, hist.count);
      const maxbpm = Math.trunc(hist.maxBPM);
      const bestbpm = Math.trunc(hist.bestBPM);
      const targetbpm = 0; // avail(data.hist.targetBPM, findTargetBPM(preset));

      let evals = evaluateSessionStats(acc, streak, streakbpm, avgbpm, maxbpm, bestbpm, targetbpm,
                    0, "begin", avail(hist.maxStreakAtEnd[2], false));

      evaldiv.style.backgroundColor = evals.overallColor;
      let longrepsym = "";
      if (evals.longRepertoireMode) {
        longrepsym = '<i class="fa-solid fa-hourglass" title="Long repertoire mode, streaks not required"></i>';
      }
      evaldiv.innerHTML = longrepsym+evals.overallSymbol+
        evals.overallLabel.toUpperCase()+"<br><span style=font-size:smaller>"+ evals.overallReason+"</span>";

      if (preferences.enableVoice) {
        // only say the eval if it has changed and we've had at least 5 tries
        if (priorRunEval !== evals.overallLabel && hist.count >= 4) {
          if (priorRunEval === "Fail" && evals.overallLabel === "Deficient") {
            // if it was fail but is now deficient, that's actually an improvement
            // so say "improving instead of "deficient". It makes more logical sense
            // and is more encouraging to the student.
            say("Overall: Improving");
          } else {
            say("Overall: "+evals.overallLabel);
          }
        }
      }

      priorRunEval = evals.overallLabel;
    }

    function displayPriorRunStats() {

      const priorRun = document.getElementById("priorRunStatsTD");
      const rec = document.getElementById("recommendedBPMTD");

      if (priorRun !== null) {
        if (PriorStreak[0] > 0) {
          priorRun.innerHTML = '<span onclick=setMetroBPM('+PriorStreak[1]+',true)>PriorStrk:<br>' + PriorStreak[0]+"@"+PriorStreak[1]+"<br>"+avail(PriorStreak[3],"NA")+"%<br><span style=font-size:smaller>"+avail(PriorStreak[2],"")+"</span></span>";
        } else {
          priorRun.innerHTML = "PriorStrk:<br>NA</span>";
        }

      } else {
        console.log("PriorRun div is null");
      }

      if (rec != null) {
        if (BPMRecommendedRange[0] > 0) {
          let recstring = 'RecBPM:<br><span onclick=setMetroBPM('+BPMRecommendedRange[1]+',true)>'+
                   BPMRecommendedRange[0]+"-"+BPMRecommendedRange[1]+
                   "<br>("+practiceStrategy+")";

          if (personalBestStreakBPM > 0) {
            recstring += "<br><i class=\"fa-solid fa-trophy\" style=font-size:9px></i>"+
                        personalBestStreakBPM+"</span> <span style=font-size:x-small>"+
                        compactDate(personalBestStreakBPMDate)+"</span>";
          }
          rec.innerHTML = recstring;
        } else {
          rec.innerHTML = 'RecBPM:<br>NA';
        }
      } else {
        console.log("REC div is null");
      }
    }

    function setNoteFilters() {
      let hand = getSelectedHand();

      if (preferences['noteFilter'] === -1) {
        // do not use notefilters
        noteFilterHigh = -1;
        noteFilterLow = 1000;
        return;
      }
      let f = parseInt(preferences['noteFilter']);
      if (hand === 'both') {
        noteFilterHigh = Math.max(...notesToPlay.flat()) + f;
        noteFilterLow = Math.min(...notesToPlay.flat()) - f;
      } else if (hand === 'left') {
        noteFilterHigh = Math.max(...notesToPlay[0]) + f;
        noteFilterLow = Math.min(...notesToPlay[0]) - f;
      } else {
        noteFilterHigh = Math.max(...notesToPlay[1]) + f;
        noteFilterLow = Math.min(...notesToPlay[1]) - f;
      }
    }

    function spokenNumber(n) {
      n = Math.trunc(Number(n));
      if (n < 100) {
        return n;
      } else {
        const h = Math.trunc(n/100);
        const r = n%100;
        if (r === 0) {
          return h+" hundred";
        } else if (r < 10) {
          return String(h) + " oh " + String(r);
        } else {
          return String(h) + " " + String(r);
        }
      }
    }

    function colorcode(merit) {
      if (merit > 84) {
        return "green";
      } else if (merit > 69) {
        return "orange";
      } else {
        return "red";
      }
    }

    function strikeScore(merit) {
      if (merit > 84) {
        return 0;
      } else if (merit > 69) {
        return 1;
      } else if (merit > 50) {
        return 2;
      } else {
        return 3;
      }
    }

    function StatTracker() {
      // Internal variables
      let data = [];
      let notes = [];
      let sum = 0;
      let squaredSum = 0;

      // Function to reset the statistics
      this.reset = function() {
        data = [];
        sum = 0;
        squaredSum = 0;
        notes = [];
      };

      // Function to add a data point
      this.addDataPoint = function(value, note) {
        data.push(value);
        notes.push(note);
        sum += value;
        squaredSum += value * value;
      };

      // Function to calculate the mean
      this.calculateMean = function() {
        if (data.length === 0) {
          return 0;
        }
        return sum / data.length;
      };

      // Function to calculate the standard deviation
      this.calculateStandardDeviation = function() {
        if (data.length <= 1) {
          return 0;
        }
        let mean = this.calculateMean();
        let variance = squaredSum / data.length - mean * mean;
        return Math.sqrt(variance);
      };

      // Function to find outliers using IQR method
        this.findOutliers = function(messagelow, messagehigh, alerts) {
          if (data.length === 0) {
            return { outliers: [], outlierNotes: [] };
          }

          // Step 1: Create an array of objects containing value and note information
          let dataWithNotes = data.map((value, index) => ({ value, note: notes[index] }));

          // Step 2: Sort the dataWithNotes array based on values in ascending order
          dataWithNotes.sort((a, b) => a.value - b.value);

          // Step 3: Calculate Q1 and Q3
          const q1Index = Math.floor(dataWithNotes.length * 0.25);
          const q3Index = Math.floor(dataWithNotes.length * 0.75);
          const q1 = dataWithNotes[q1Index].value;
          const q3 = dataWithNotes[q3Index].value;

          // Step 4: Calculate IQR
          const iqr = q3 - q1;

          // Step 5: Define lower and upper bounds for outliers
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;

          // Step 6: Identify outliers and their corresponding notes
          const outliers = [];
          const outlierNotes = [];
          dataWithNotes.forEach((dataPoint) => {
            if (dataPoint.value < lowerBound || dataPoint.value > upperBound) {
              outliers.push(dataPoint.value);
              outlierNotes.push(dataPoint.note);
            }
          });

          for (let i = 0; i < outlierNotes.length; i++) {
            alerts.push({
              name: ((outliers[i]<lowerBound) ? messagelow : messagehigh),
              data: outliers[i],
              note: outlierNotes[i]
            })
          }

          return { outliers, outlierNotes };
        };

    }

    function calcDur(h, i) {
      let d = parseFloat(avail(testOptions.beatDur, 1/4));

      if (isAvail(durationsToPlay) && isAvail(durationsToPlay[h]) && durationsToPlay[h].length > 0) {
        d = parseFloat(durationsToPlay[h][i%(durationsToPlay[h].length)]); // durations array wraps
        //console.log("calcDur found wrapping d="+d+" for h="+h+" i="+i);
      }

      if (testOptions.swingEighths && d === 1/8) {
        const msg = "Graph SW8 orig="+d;
        if ( (i%2) === 1) {
          // short swung note
          d = d*2/3;
        } else {
          // long swung note
          d = d*4/3;
        }
        //console.log(msg+" adj="+d+" i="+i);
      } else {
        //console.log("Graph NOT SW8. sw8="+testOptions.swingEighths+" d="+d);
      }
      return parseFloat(d);
    }

    function clearStats() {
      //currentBPM = 0;
      averageBPM = 0;
      maxBPM = 0;
      bestBPM = 0;
      successCount = 0;
      failCount = 0;    // a fail could include soft fails depending on prefs
      softFailCount = 0;
      noteFailCount = 0;
      repCount = 0;
      totalDuration = 0;
      startTime = null;
      wrongNotePlayed = false;
      wrongNoteNumber = -1;
      numQBPM = [0,0,0,0];
      sumQBPM = [0,0,0,0];
      midiNotes = [];
      curStreak = [0,0,0,0];
      curStreakBPM = [0,0,0,0];
      maxStreak = [0,0,0,0];
      maxStreakBPM = [0,0,0,0];
      errorNotes = [[],[]];
      nnAccuracy = {success:0, fail:0};
      draggingWarning = 0;
      rushingWarning = 0;
      priorRunEval = null;

      displayTestStats(null, "reset");
    }


     function clearPriorAndRec() {
       let ps = document.getElementById("priorRunStatsTD");
       if (ps !== null) {
         ps.innerHTML = "";
       }
       let rb = document.getElementById("recommendedBPMTD");
       if (rb !== null) {
         rb.innerHTML = "";
       }
     }

    let patternCanvas = null;
    let stripePattern = null;

    function createPattern() {
      // Create a pattern for the diagonal stripes
      patternCanvas = document.createElement('canvas');
      let patternCtx = patternCanvas.getContext('2d');
      patternCanvas.width = 20;
      patternCanvas.height = 20;

      patternCtx.clearRect(0, 0, patternCanvas.width, patternCanvas.height);

      patternCtx.strokeStyle = 'white';
      patternCtx.lineWidth = 6;
      patternCtx.beginPath();
      patternCtx.moveTo(0, patternCanvas.height);
      patternCtx.lineTo(patternCanvas.width, 0);
      patternCtx.stroke();
    }

    let priorOptions = null;

    function redrawNoteBarGraph() {
      if (priorOptions !== null) {
        drawNoteBarGraph(priorOptions[0].slice(), priorOptions[1], priorOptions[2].slice(), priorOptions[3]);
      } else {
        console.log("No prior options, not redrawing graph");
      }
    }

    function drawNoteBarGraph(notes, strikes, alerts, metmean) {
      if (notes === null) {
        return;
      }

      priorOptions = [notes.slice(), strikes, (alerts!==null)?alerts.slice():null, metmean];

      midiNotes = []; // we'll fill this in as we traverse the note data

      //console.log("Drawing graph notes="+notes);
      const graphCanvas = document.getElementById('graphCanvas');
      const s = getComputedStyle(graphCanvas);
      graphCanvas.width = parseInt(s.width);
      graphCanvas.height = parseInt(s.height);
      //console.log("Graph w="+graphCanvas.width+" h="+graphCanvas.height);

      if (canvasLarge === null) {
        canvasLarge = document.createElement("canvas");
        canvasLarge.width = Math.trunc(parseInt(s.width)*MAXGRAPHMAG);
        canvasLarge.height = parseInt(s.height)*MAXGRAPHMAG;
        canvasLarge.style.display = "none";
        document.body.appendChild(canvasLarge);
      }
      canvasLarge.width = parseInt(s.width)*MAXGRAPHMAG;
      canvasLarge.height = parseInt(s.height)*MAXGRAPHMAG;

      // reset magnification and offset.
      graphMag = DEFAULTGRAPHMAG;
      graphOffset = {x:0, y:0};

      const ctx = canvasLarge.getContext('2d');

      if (patternCanvas === null) {
        createPattern();
        // Create the fill pattern from the patternCanvas
        stripePattern = ctx.createPattern(patternCanvas, 'repeat');
      }

      // Clear the canvas
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(0, 0, canvasLarge.width, canvasLarge.height);

      // Define the bar dimensions
      const hand = getSelectedHand();
      let numnotes = 0;
      if (hand === 'both') {
        numnotes = notes[0].length+notes[1].length;
      } else if (hand === 'right') {
        numnotes = notes[1].length;
      } else {
        numnotes = notes[0].length;
      }
      const barSpacing = 5;
      const barHeight = Math.trunc(canvasLarge.height/(numnotes))-barSpacing;
      const noteSpacing = (barHeight+barSpacing);

      // Compute the scaling factor for the horizontal axis
      let totNotes;
      let earlySTime;
      let lateETime;

      if (hand === 'left') {
        totNotes = notes[0].length - 1;
        earlySTime = notes[0][0].sTime;
        lateETime = notes[0][notes[0].length-1].eTime;
      } else if (hand === 'right') {
        totNotes = notes[1].length - 1;
        earlySTime = notes[1][0].sTime;
        lateETime = notes[1][notes[1].length-1].eTime;
      } else {
        totNotes = notes[0].length-1 + notes[1].length-1
        earlySTime = Math.min(notes[1][0].sTime, notes[0][0].sTime);
        lateETime = Math.max(notes[1][notes[1].length-1].eTime, notes[0][notes[0].length-1].eTime);
      }

      const hmargin = 50*MAXGRAPHMAG; // horizontal margin on both left and right.

      const maxDuration = lateETime - earlySTime;
      const scaleFactor = (maxDuration === 0) ? 1 : (canvasLarge.width-2*hmargin) / maxDuration;

      // Draw scale
      const scaleMarkerWidth = 10; // Width of the scale marker line
      const scaleMarkerHeight = 5; // Height of the scale marker line

      ctx.fillStyle = "black";
      ctx.font = "40px Arial";
      let fontHeight = 40;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.lineWidth = 3;

      // Calculate the length of the scale marker line
      const scaleMarkerLength = 100 * scaleFactor; // 100ms scaled to the current scaleFactor

      const scaleX = 20; // canvasLarge.width-scaleMarkerLength-40;
      const scaleY = canvasLarge.height/2;
      ctx.fillText("100 ms", scaleX, scaleY-5); // Draw the scale label above the marker

      // Draw the scale marker line
      ctx.beginPath();
      ctx.moveTo(scaleX, scaleY); // Move to the starting position of the scale marker
      ctx.lineTo(scaleX + scaleMarkerLength, scaleY); // Draw the line
      ctx.stroke();

      // Draw the two vertical ticks at the ends of the scale marker line
      ctx.beginPath();
      ctx.moveTo(scaleX, scaleY-10); // Top vertical tick
      ctx.lineTo(scaleX, scaleY+10);
      ctx.moveTo(scaleX + scaleMarkerLength, scaleY-10); // Bottom vertical tick
      ctx.lineTo(scaleX + scaleMarkerLength, scaleY+10);
      ctx.stroke();

      // Draw the length of one beat
      const beatLength = metmean*scaleFactor;
      const beatY = scaleY+70;
      ctx.fillText("beat = "+Math.trunc(metmean)+" ms", scaleX, beatY-10); // Draw the beat label above the marker

      // Draw the scale marker line
      ctx.beginPath();
      ctx.moveTo(scaleX, beatY); // Move to the starting position of the scale marker
      ctx.lineTo(scaleX + beatLength, beatY); // Draw the line
      ctx.stroke();

      // Draw the two vertical ticks at the ends of the scale marker line
      ctx.beginPath();
      ctx.moveTo(scaleX, beatY-10); // Top vertical tick
      ctx.lineTo(scaleX, beatY+10);
      ctx.moveTo(scaleX + beatLength, beatY-10); // Bottom vertical tick
      ctx.lineTo(scaleX + beatLength, beatY+10);
      ctx.stroke();

      // Draw the note bars
      const barcolors = ["rgba(0,0,255,255)", "rgba(255,0,0,255)"];

      let nextnote = [0,0];  // next notes for left and right hand
      let h = 0; // which hand to graph next
      let i = 0; // which note to graph next
      let totgraphed = 0;

      //
      // Main Loop that Draws Note Bars on Graph
      //
      while (true) {
        // find out which hand plays next
        if (nextnote[0] >= notes[0].length && nextnote[1] >= notes[1].length) {
          break; // we're out of notes.
        }
        if (hand === 'right') {
          h = 1;
        } else if (hand === 'left') {
          h = 0;
        } else {
          h = -1; // have not chosen yet
          if (nextnote[0] >= notes[0].length) {
            h = 1; // we ran out of lefthand notes so right hand wins
          } else if (nextnote[1] >= notes[1].length) {
            h = 0;
          }

          if (h === -1) {
            //console.log("Choosing hand");
            // we failed to find a hand based on just running out of notes.
            // that means both hands have notes.
            // Whichever note has an earlier bar number (or note number) wins. If they're tied, left hand wins.
            let leftbeat;
            let rightbeat;
            if (testOptions !== null && avail(testOptions.graphOrder, null) === "bar") {
              // go bar-by-bar. This is better for songs that have differing notes/durations
              // for the left and right hands.
              leftbeat = Math.trunc((noteStartBeat[0][nextnote[0]+noteScope[0].first])/testOptions.beatsPerBar);
              rightbeat = Math.trunc((noteStartBeat[1][nextnote[1]+noteScope[1].first])/testOptions.beatsPerBar);
            } else if (testOptions !== null && avail(testOptions.graphOrder, null) === "beat") {
              // go beat-by-beat. This is sometimes better looking depending on the song.
              leftbeat = noteStartBeat[0][nextnote[0]+noteScope[0].first];
              rightbeat = noteStartBeat[1][nextnote[1]+noteScope[1].first];
            } else {
              // go by note number. This is better for tests that have a 1:1 correspondence of notes
              // between the left and right hands, such as scales and arpeggios.
              leftbeat = nextnote[0];
              rightbeat = nextnote[1];
            }
            //console.log("LeftBeat:"+leftbeat+" Right:"+rightbeat);
            if (rightbeat <= leftbeat) { // ties go to right hand.
              h = 1;
            } else {
              h = 0;
            }
          }
        }

        if (nextnote[h] >= notes[h].length) {
          break; // oops we ran out of notes in both hands, we're done
        }
        i = nextnote[h];
        nextnote[h]++; // increment for next iteration

        //console.log("graphing note hand:"+h+" noteindex:"+i+" len:"+notes[h].length);

        const n = notes[h][i];
        const sTime = n.sTime - earlySTime;
        const eTime = n.eTime - earlySTime;
        const w = (eTime - sTime) * scaleFactor;

        // take into account note durations here

        let d = calcDur(h,i+noteScope[h].first);
        if (d === 0) {
          d = 1/64; // assign a very short duration for "crushed" notes

          // implement: We should actually include the crushed note duration in the next noncrushed note since
          // crush note durations are technically included in in the duration of the 'real' note that follows them.
        }
        //console.log("d:"+d+" metmean="+metmean);
        const adjmetmean = metmean*d/avail(testOptions.beatDur, 1/4);
        //console.log("Duration of note h="+h+"i="+(i+noteScope[h].first)+":dur="+d+" metmean:"+adjmetmean+" beatdur:"+testOptions.beatDur);
        const wmean = adjmetmean * scaleFactor;

        // we conveniently have everything we need to set up the midi replay
        // data structure right here. So, although it doesn't have much to do
        // with the graph, go ahead and grab the data.
        //console.log("New note:"+n.note);

        if (n.note.number !== RESTNOTE) {
          const tt = "+"+(sTime).toString();
          //console.log("Pushing new note:"+n.note.number+" et:"+n.eTime+" st:"+n.sTime+" v:"+n.velocity+" tt:"+tt);
          const nn = new Note(n.note.number);
          nn.options = {
            duration:   n.eTime - n.sTime,
            attack:     n.velocity,
            time:       tt
          }
          nn.scoreNote = {hand:h, index: i+noteScope[h].first};
          midiNotes.push(nn);
        }

        // Draw bar
        //console.log("Drawing bar, flushright="+flushRight);
        const x = (!flushRight)?(sTime * scaleFactor+hmargin):40;

        const y = totgraphed * noteSpacing;

        // Draw rectangular outline with 100% opacity
        ctx.strokeStyle = `rgba(${h === 0 ? 0 : 255}, 0, ${h === 1 ? 0 : 255}, 1)`;
        ctx.strokeRect(x, y, w, barHeight);

        // fill in the rectangle proportional to square of loudness (works better if squared)
        let speed = Math.trunc(100*notes[h][i].velocity);
        // Set opacity based on velocity (loudness)
        ctx.fillStyle = `rgba(${h === 0 ? 0 : 255}, 0, ${h === 1 ? 0 : 255}, ${(speed/100)*(speed/100)})`;

        // Fill the bar with adjusted opacity
        ctx.fillRect(x, y, w, barHeight);

          // see if there is an alert for this note
          let numalertsfound = 0;
          for (let a = 0; a < alerts.length; a++) {
            //console.log("Alerts["+a+"]="+alerts[a].name+" n="+alerts[a].note);
            if (alerts[a].note && alerts[a].note[0] === h && alerts[a].note[1] === i) {
              // found an alert for this note, highlight it
              //console.log("Found an alert on note:"+alerts[a].note);

              if (alerts[a].name.startsWith("LONG") || alerts[a].name.startsWith("SHORT")) {
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = barcolors[h];
                ctx.font = fontHeight+"px Arial";
                console.log("ADDED ALERT:"+alerts[a].name+" at x="+(x+wmean)+" y="+y+barHeight/2)
                ctx.fillText(alerts[a].name, x+wmean+10, y+barHeight/2);
              } else if (alerts[a].name.startsWith("OVLP")) {
                // draw a striped rectangle showing the overlap visually
                const nextstart = notes[h][i+1].sTime - earlySTime;
                const x2 = nextstart * scaleFactor + hmargin;

                //ctx.strokeRect(x2,y,w-(x2-x),barHeight*2);
                ctx.setLineDash([]);  // turn of dashes
                ctx.fillStyle = stripePattern;
                ctx.fillRect(x2,y,w-(x2-x),barHeight*2);
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = barcolors[h];
                ctx.font = fontHeight+"px Arial";
                console.log("ADDED ALERT:"+alerts[a].name+" at x="+(x+wmean)+" y="+y+barHeight/2)
                ctx.fillText(alerts[a].name, x+wmean+10, y+barHeight/2);
                //console.log("ADDED ALERT OVERLAP x="+x+" x2="+x2);
              }

              ctx.setLineDash([]);  // turn of dashes

              numalertsfound++;
            }
          }

          // Show a dashed line of
          // the "correct" length of this note given its duration and BPM figures.
          // So the steps are: (1) take the BPM figure computed by stats and then figure out
          // the number of milliseconds that implies for beatDur. Then scale that to the dur of
          // this note. Then draw a dashed line starting where this note started and ending
          // at the "ideal" length figure. Cap it off with a vertical stroke at the end of the dashed
          // line. Dashed lines are color coded depending on how good or bad the actual duration was
          // compared to the ideal duration, with worse durations getting thicker and redder lines.
          // Takes into account swung eighths too.

          ctx.save();

          // draw different emphasis depending on how close the expected duration was
          // the played duration
          let err = adjmetmean/(eTime - sTime);
          if (err > 1) { // short note
            err = 1/err; // gives us value between 0 and 1 where 1 === perfect
          }

          if (err > 0.9) { // good match
            ctx.strokeStyle = "green";
            ctx.setLineDash([4,12]);
            ctx.lineWidth = 4;
          } else if (err > 0.70) { // not so good
            ctx.strokeStyle = "orange";
            ctx.setLineDash([12,12]);
            ctx.lineWidth = 6;
          } else { // bad
            ctx.strokeStyle = "red";
            ctx.setLineDash([12,4]);
            ctx.lineWidth = 9;
          }

          ctx.fillStyle = "black";

          // draw the ideal duration dashed line
          const adj = barHeight/2;
          ctx.beginPath();
          ctx.moveTo(x, y+adj);
          ctx.lineTo(x+wmean, y+adj);
          ctx.stroke();
          // cap it off with a solid line
          ctx.beginPath();
          ctx.moveTo(x+wmean, y+adj-adj/2);
          ctx.lineTo(x+wmean, y+adj+adj/2);
          ctx.setLineDash([]);
          ctx.stroke();
          ctx.restore();


          if (barHeight < 18) {
            fontHeight = 11;
          } else {
            fontHeight = Math.trunc(barHeight*0.7);
            if (fontHeight > 50) {
              fontHeight = 50;
            }
          }
          // need a smaller font for the speed data because it's stacked
          ctx.font = fontHeight + "px Arial";

          // find finger, if any available
          let finger = "";
          if (isAvail(fingersToPlay) && isAvail(fingersToPlay[h])) {
                if (isAvail(fingersToPlay[h][i+noteScope[h].first]) && fingersToPlay[h][i+noteScope[h].first] !== -1) { // -1 means rest note which of course has no "finger"
                  finger = fingersToPlay[h][i+noteScope[h].first];
                }
          }

          // find duration, if any available
          let dur = "";
          let note = prnote(notes[h][i].note);
          if (notes[h][i].note.number === RESTNOTE) {
            dur = restWithDur(h, i);
            note = "";
            ctx.font = 1.5*fontHeight + "px Arial";
            finger = "";
          } else {
            dur = prDur(h, i);
          }

          // draw the note name to left of bar
          ctx.fillStyle = barcolors[h];
          ctx.textAlign = "right";
          ctx.textBaseline = "top";

          ctx.fillText(note+dur+"  ", x, y+barHeight/5);
          ctx.font = Math.trunc(fontHeight*.6) + "px Arial";
          ctx.fillText(finger+" ", x, y+barHeight/5);

          // Show velocity
          if (speed < 70) {
            ctx.fillStyle = "black"; // easier to see if low opacity
          } else {
            ctx.fillStyle = "white";
          }

          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";

          let speednotation = "";
          if (notes[h][i].note.number === RESTNOTE) {
            speednotation = "";
            speed = "rest";
          } else if (speed < 25) {
            speednotation = M["piano"]+M["piano"]+M["piano"];
          } else if (speed < 33) {
            speednotation = M["piano"]+M["piano"];
          } else if (speed < 42) {
            speednotation = M["piano"];
          } else if (speed < 51) {
            speednotation = M["mezzo"]+M["piano"];
          } else if (speed < 63) {
            speednotation = M["mezzo"]+M["forte"];
          } else if (speed < 75) {
            speednotation = M["forte"];
          } else if (speed < 88 ) {
            speednotation = M["forte"]+M["forte"];
          } else {
            speednotation = M["forte"]+M["forte"]+M["forte"];
          }

          // need smaller font for speed data because it's stacked
          ctx.font = fontHeight + "px Arial";

          ctx.fillText(speed, x+3, y+barHeight+1);
          if (speednotation !== "(rest)") {
            ctx.font = 2*fontHeight + "px 'Noto Music'";
          }
          ctx.fillText(speednotation, x+3, y+barHeight+1-fontHeight);
          totgraphed++; // increment total notes graphed, this is used to find y coordinate
    }

    if (!flushRight) {
      const evalarea = document.getElementById("runEvalArea");
      ctx.font = "120px Arial";
      if (strikes > 2) {
        ctx.fillStyle = "red";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        //ctx.fillText("SLOW DOWN!", 10, canvasLarge.height-30*MAXGRAPHMAG);
        evalarea.innerHTML = "QFAIL";
        evalarea.style.color = "red";
      } else if (strikes === 2) {
        ctx.fillStyle = "orange";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        //ctx.fillText("PASSING", 10, canvasLarge.height-30*MAXGRAPHMAG);
        evalarea.innerHTML = "PASSING";
        evalarea.style.color = "ORANGE";
      } else if (strikes === 1) {
        ctx.fillStyle = "blue";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        //ctx.fillText("GOOD", 10, canvasLarge.height-30*MAXGRAPHMAG);
        evalarea.innerHTML = "GOOD";
        evalarea.style.color = "blue";
      } else {
        ctx.fillStyle = "green";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "left";
        //ctx.fillText("EXCELLENT", 10, canvasLarge.height-30*MAXGRAPHMAG);
        evalarea.innerHTML = "EXCELLENT!";
        evalarea.style.color = "green";
      }
    }

    if (metroSmart) {
      console.log("Updating smart metronome. strikes:"+strikes+" incstr:"+preferences.metroSmartIncStrikes+" inc:"+preferences.metroSmartInc);

      if (strikes <= preferences.metroSmartIncStrikes) {
        metroSmartExtra += preferences.metroSmartInc;
        if (metroSmartExtra > preferences.metroSmartExtraMax) {
          metroSmartExtra = preferences.metroSmartExtraMax;
        }
      } else if (strikes >= preferences.metroSmartResetStrikes || wrongNotePlayed) {
        console.log("RESETTING metroSmartExtra");
        metroSmartExtra = 0;
      }
      updateMetronome();
    }

    let delay = 300; // used to schedule various tones out into the future
    if (!wrongNotePlayed && preferences['enableTones']) {
      if (strikes > 2) {
        if (preferences['toneOnQFail'] !== 'none') {
          playMIDINote(preferences['toneOnQFail'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneFailVoice']);
            delay = preferences['toneDuration'];
        }
      } else if (strikes === 2) {
        if (preferences['toneOnPassing'] !== 'none') {
          playMIDINote(preferences['toneOnPassing'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneSuccessVoice']);
            delay = preferences['toneDuration'];
        }
      } else if (strikes == 1) {
        // play both the passing and good tones one after the other
        if (preferences['toneOnGood'] !== 'none') {
          playMIDINote(preferences['toneOnPassing'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneSuccessVoice']);

          playMIDINote(preferences['toneOnGood'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneSuccessVoice'], 1.2*preferences['toneDuration']);

          delay = 2.5*preferences['toneDuration'];
        }
      } else {
        // play passing, good, and excellent tones
        if (preferences['toneOnExcellent'] !== 'none') {
          playMIDINote(preferences['toneOnPassing'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneSuccessVoice']);
          playMIDINote(preferences['toneOnGood'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneSuccessVoice'],
            1.2*preferences['toneDuration']);
          playMIDINote(preferences['toneOnExcellent'],
            preferences['toneDuration'], preferences['toneVelocity'],
            preferences['toneSuccessVoice'],
            2.4*preferences['toneDuration']);
          delay = 3.5*preferences['toneDuration'];
        }
      }

      // play an indication if reps is a multiple of 10
      if (successCount > 0 && (successCount%10) === 0) {
        let sc = successCount;
        // first a lower tone if multiples of 50
        for (let i = 0; Math.trunc(sc/50) > 0; i++) {
          playMIDINote("C6", 120, 127, preferences['toneFailVoice'], delay + i*200);

          sc -= 50;
          delay += 250;
        }
        for (let i = 0; i < sc/10; i++) {
          playMIDINote("C7", 120, 127, preferences['toneFailVoice'], delay + i*200);
        }
        say(successCount + " Reps");
      }
    }
    if (!wrongNotePlayed) {
      graphShow();
    } else {
      if (metroSmart) {
        metroSmartExtra = 0;
        updateMetronome();
      }
    }
  }

  function graphShow() {
    const graphCanvas = document.getElementById('graphCanvas');
    const ctx = graphCanvas.getContext("2d");

    if (canvasLarge === null) {
      return; // no graph yet
    }
    const ctxLarge = canvasLarge.getContext("2d");

    ctxLarge.setLineDash([7,7]);
    //ctxLarge.strokeRect(0,0,canvasLarge.width,canvasLarge.height);

    ctx.clearRect(0,0,graphCanvas.width,graphCanvas.height);

    console.log("ShowGraph: cw="+canvasLarge.width+" ch="+canvasLarge.height+" gw="+graphCanvas.width+" gh="+graphCanvas.height);
    ctx.drawImage(canvasLarge, graphOffset.x, graphOffset.y, canvasLarge.width, canvasLarge.height,
                          0, 0, Math.trunc(canvasLarge.width*graphMag), Math.trunc(canvasLarge.height*graphMag));
    ctx.save();
    ctx.setLineDash([2,2]);
    ctx.strokeStyle = "orange";
    ctx.strokeRect(0,0,graphCanvas.width,graphCanvas.height);

    ctx.restore();
  }

  function prDur(h, i) {
    let dur = "";
    if (isAvail(durationsToPlay) && isAvail(durationsToPlay[h])
          && durationsToPlay[h].length > 0) {
        dur = durationsToPlay[h][i%durationsToPlay[h].length];
        dur = durUnicode(dur);
    }
    return dur;
  }

  function durFrac(dur) {
    dur = dur.toString();
    const durmap = { "1":"1/1", "1.5": "1.5/1",
      "0.5":"1/2", "0.75":"3/4", "0.25":"1/4", "0.375":"3/8",
      "0.125":"1/8", "0.0625":"1/16", "0.1875":"3/16", "0.5625":"9/16",
      "0.03125":"1/32", "0.09375":"3/32", "0.041666666666666664":"1/24",
    };
    if (isAvail(durmap[dur])) {
      dur = durmap[dur];  //"<span style=font-size:10px>"+durmap[dur]+"</span>";
    }
    return dur;
  }

  function graphTap(event) {
    const canvas = document.getElementById('graphCanvas');
    const rect = canvas.getBoundingClientRect();
    const tapX = event.clientX - rect.left; // X-coordinate of the tap relative to the canvas
    const tapY = event.clientY - rect.top;

    // Calculate the center of the canvas
    const centerX = canvas.width / 2;
    const oneHalfY = canvas.height / 2;

    // Set flushRight based on the tap position
    if (tapY > oneHalfY) {
          // don't count it close to the top of the canvas because there are other controls there and the user's
          // finger could touch the top of the canvas sometimes.
          flushRight = tapX < centerX;
          redrawNoteBarGraph();
    }
  }

  function noteDisplayAreaMenuShow() {
    console.log("Showing noteDisplayAreaMenu");
    const menu = document.getElementById("noteDisplayAreaMenuDiv");
    const button = document.getElementById("noteDisplayAreaMenuButton");

    // Get the position and dimensions of the button
    const buttonRect = button.getBoundingClientRect();

    // Calculate the position for the menu
    const menuLeft = buttonRect.left;
    const menuTop = buttonRect.top; //buttonRect.top + buttonRect.height / 2 - menu.clientHeight / 2;

    console.log("left:"+menuLeft+" top:"+menuTop);

    // Set the menu's position
    menu.style.left = menuLeft + "px";
    menu.style.top = menuTop + "px";

    // Display the menu
    menu.style.display = "block";

  }


// Attach the graphTap function to the onload event of the window
// and initialized a bunch of other things.

window.addEventListener('load', function () {

  redirectConsole();

  //console.error("Test console error redirect");

  // MOVED TO audio.js: synth initialization
  initSynth();

  // Attach event listeners to the canvas for tap and click events
  const canvas = document.getElementById('graphCanvas');
  canvas.addEventListener('mousedown', graphDragStart);
  canvas.addEventListener('mousemove', graphDragMove);
  canvas.addEventListener('mouseup', graphDragEnd);

  canvas.addEventListener('touchstart', graphDragStart);
  canvas.addEventListener('touchmove', graphDragMove);
  canvas.addEventListener('touchend', graphDragEnd);

  //warning("loading prefs");
  //loadPrefs();

  loadPrefs();

  //warning("displaying empty results");
  displayTestStats(null, "reset");

  document.getElementById('pedalSymbolDiv').innerHTML = M["pedal"];
  setTimeout(function() {
    document.getElementById('pedalSymbolDiv').innerHTML = M["pedalup"];
  }, 2000);

  // set up the START/STOP button so a long tap both stops the current test and goes right
  // to the skills map

  setupLongPressStart();

});

function setupLongPressStart() {
  const button = document.getElementById('testNotesButton');
  let pressTimer = null;

  function longPressStart() {
    // on a long press we will both finish the current test and go to the skill map
    testNotes();
    setTimeout(showSkillMap, 800); // do this a bit in the future so the user sees the test end.
  }

  button.addEventListener('mousedown', function(e) {
    // Prevent firing in case of right click
    if (e.button === 2) return;

    if (currentState === STATE.TESTING_NOTES) {
      pressTimer = window.setTimeout(function() { longPressStart(); }, 700); // 700ms for long press
    }

  });

  button.addEventListener('mouseup', function() {
    if (pressTimer !== null) {
      clearTimeout(pressTimer); // Prevent long press action if the button is released
      pressTimer = null;
    }

    if (whiteNoiseStarted === false) {
      whiteNoiseStarted = true;
      startWhiteNoise(0.02);
      warning("White noise started");
    }
  });

  button.addEventListener('mouseleave', function() {
    clearTimeout(pressTimer); // Cancel on mouse leave
    pressTimer = null;
  });

  // Touch Events
  button.addEventListener('touchstart', function(e) {
    pressTimer = window.setTimeout(function() { longPressStart(); }, 800); // 800ms for long press
  }, {passive:false});

  button.addEventListener('touchend', function(e) {
    //e.preventDefault();
    clearTimeout(pressTimer); // Prevent long press action if the touch is ended
    pressTimer = null;
  }, {passive:false});

  button.addEventListener('touchcancel', function() {
    clearTimeout(pressTimer); // Cancel on touch cancel
    pressTimer = null;
  });

  // To prevent firing the short press action after a long press
  button.addEventListener('click', function(e) {
    console.log("START CLICK");
    e.preventDefault();
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    testNotes(); // Call short press action if the timer hasn't been cleared
  });

}


let dragOrigin = null;
let startOffset = null;

function graphDragStart(event) {
  dragOrigin = {x:0,y:0};
  //warning("Event type:"+event.type);
  if (event.type === 'touchstart') {
    dragOrigin.x = event.touches[0].clientX;
    dragOrigin.y = event.touches[0].clientY;
    //warning("Touches:"+ event.touches.length+" x:"+dragOrigin.x+" y:"+dragOrigin.y);
    if (typeof dragOrigin.x === 'undefined') {
      dragOrigin.x = 0;
    }
  } else {
    dragOrigin.x = event.clientX;
    dragOrigin.y = event.clientY;
  }

  if (dragOrigin.x > graphCanvas.width*0.66 || graphMag === DEFAULTGRAPHMAG) { // ignore touchstart near the right edge, or if not magnified, so its easier to scroll the window
    dragOrigin = null;
    return;
  }
  event.preventDefault();
  startOffset = {x:0,y:0};
  startOffset.x = graphOffset.x;
  startOffset.y = graphOffset.y;
  graphCanvas.style.zIndex = 10000;
  //warning("DRAGSTART: offx:"+dragOrigin.x+" offy:"+dragOrigin.y+" gx"+graphOffset.x+" gy:"+graphOffset.y+" cw:"+graphCanvas.width);
}

function graphDragMove(event) {
  if (graphMag === DEFAULTGRAPHMAG || graphOffset === null) {
    return; // no dragging needed when half magnified because entire graph fits on screen
  }
  //warning("Event type:"+event.type);
  event.preventDefault();
  if (dragOrigin === null) { // there's been no touchstart inside the window
    return;
  }
  let x;
  let y;
  if (event.type === 'touchmove') {
    x = event.touches[0].clientX;
    y = event.touches[0].clientY;
    //warning("Touches:"+ event.touches.length+" x:"+x+" y:"+y);
  } else {
    x = event.clientX;
    y = event.clientY
  }

  graphOffset.x = startOffset.x+dragOrigin.x-x;
  graphOffset.y = startOffset.y+dragOrigin.y-y;
  //warning("DRAG: offx:"+graphOffset.x+" offy:"+graphOffset.y+" x:"+x+" y:"+y+" startx:"+startOffset.x+" starty:"+startOffset.y);
  graphShow();
}

function graphDragEnd(event) {
  event.preventDefault();
  dragOrigin = null;
  startOffset = null;
  graphCanvas.style.zIndex = 0;
}

function magnifyScreen(dir) {
  if (dir === -1) {
    graphMag *= 4/5;
  } else {
    graphMag *= 5/4;
  }

  if (graphMag > MAXGRAPHMAG) {
    graphMag = MAXGRAPHMAG;
  } else if (graphMag <= DEFAULTGRAPHMAG) {
    graphMag = DEFAULTGRAPHMAG;
    graphOffset = {x:0,y:0}; // reset when things get small enough to show entire thing on the screen
  }
  graphShow();
}

function clearPlayedNotes(matchhand=null, firstnon=-1) {

  if (notesToPlay === null || !isAvail(notesToPlay) || notesToPlay.length === 0 ||
      !isAvail(notesToPlay[0]) || !isAvail(notesToPlay[1]) ||
      notesToPlay[0].length + notesToPlay[1].length === 0) {
    return;
  }

  const en = document.getElementById("ntp_error_note");
  if (en) {
    en.parentNode.style.lineHeight = "1.6";
    en.remove(); // remove the error note.
  }

  wrongNotePlayed = false;
  wrongNoteNumber = -1;

  for (let h = 0; h < 2; h++) {
    for (let i = 0; i <= notesToPlay[h].length; i++) {
      if (matchhand === h && i < firstnon) {
        //console.log("Not clearing nonrest h="+h+" i="+i);
        continue; // don't clear rests that have already moved.
      }
      //console.log("Clearing h="+h+" i="+i);
      let ntp = null;
      if (i === notesToPlay[h].length) {
        ntp = document.getElementById("ntp_"+h+"_error");
      } else {
        ntp = document.getElementById("ntp_"+h+"_"+i);
      }
      if (ntp !== null) {
        ntp.style.color = "black";
        ntp.style.fontWeight = "normal";
        ntp.style.backgroundColor = "";
      } else {
        console.log("**** NTP is null during RESET");
      }
    }
  }

  for (let h = 0; h < 2; h++) {
    if (noteScope[h].first != 0 || noteScope[h].last != notesToPlay[h].length-1) {
      for (let n = noteScope[h].first; n <= noteScope[h].last; n++) {
        if (matchhand === h && n < firstnon) {
          //console.log("Not clearing nonrest h="+h+" n="+n);
          continue; // don't clear rests that have already moved.
        }
        const ntp = document.getElementById("ntp_"+h+"_"+n);
        ntp.style.backgroundColor = "#CCCCFF";
        if (n === noteScope[h].first) {
          // scroll the played note onto the left if it is more than 50% past center of screen horizontally
          const leftpos = ntp.getBoundingClientRect().left/window.innerWidth;
          if (leftpos > 0.75 || leftpos < 0) {
              ntp.scrollIntoView({behavior:'instant', block: 'nearest', inline: 'start'});
          }
        }
      }
    }
  }
}


function clearNotesToPlay() {
  notesToPlay = [[], []];
  errorNotes = [[],[]];
  let notesDiv = document.getElementById('notesLH');
  notesDiv.innerHTML = '';
  notesDiv = document.getElementById('notesRH');
  notesDiv.innerHTML = '';
  wrongNotePlayed = false;
  wrongNoteNumber = -1;
  noteScope = null;
  errorStats(wrongNotePlayed);
}

function prnotenum(note, h=null, i=null, c=null) {
  const octave = Math.floor(note / 12) - 1;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  if (note === RESTNOTE) {
    if (h !== null && i !== null) {
      // print rest with its duration
      return(restWithDur(h,i,c));
    }
    return "\u2014"; // rest represented by mdash
  }
  if (typeof note === 'string') {
    return note;
  } else {
      return noteNames[note % 12] + octave;
  }

}

function prnote(note) {
  return prnotenum(note.number);
}

if (typeof WebMidi !== 'undefined' && WebMidi !== null) {
  // Check if Web MIDI is supported
  if (WebMidi.supported) {
    WebMidi.enable(function (err) {
      if (err) {
        console.error('WebMidi could not be enabled:', err);
      } else { // initialize

        WebMidi.addListener("connected", function(event) {
            warning("Connection to MIDI received");
            connectMidi();

        });

        WebMidi.addListener("disconnected", function(event) {
            warning("Lost MIDI connection: "+event.port.id+" "+event.port.manufacturer+" "+event.port.name);
            clearMidiChannels();
            keyboardStatus = 'disconnected';
            keyboardOptions.notesOn = []; // reset in case some where on
            if (currentState === STATE.TESTING_NOTES) {
              alert("MIDI CONNECTION LOST"); // prevent a quick reconnect from causing a test failure.
              // reset the current test as this most assuredly interupted ability to process notes.
              //stopTheTest();
              //say("MIDI Disconnected");
            }
        });

        connectMidi();

      } // end of initialize
    }); // end of webmidi.enable
  } else { // end of if webmidi supported
    console.error('Web MIDI is not supported in this browser.');
  }
} else {
  console.error('Web MIDI is null--is not supported in this browser.');
}

function connectMidi() {
  let outputs = WebMidi.outputs;
  if (outputs.length > 0) {
    for (let i = 0; i < outputs.length; i++) {
      message("Output["+i+"]="+outputs[i].type+"/"+outputs[i].manufacturer+"/"+outputs[i].name);
    }
    midiOutput = outputs[0];
    playMIDINote("C1", 300, 80, 52, 1000);
    playMIDINote("C2", 300, 100, 52, 1400);
    playMIDINote("C3", 300, 127, 52, 1800);
  } else {
    warning('No MIDI output devices found. Using internal synth.');
  }

  // Retrieve the first available MIDI input device
  let input;
  if (WebMidi.inputs.length > 0) {

    for (let i = 0; i < WebMidi.inputs.length; i++) {
      WebMidi.inputs[i].removeListener(); // remove any prior listeners so we don't get double-listeners
    }
    input = WebMidi.inputs[0];
    message("Connected to WebMidi input port 0:" + WebMidi.inputs[0].name + " " + WebMidi.inputs[0].manufacturer);
    keyboardStatus = 'connected';
    keyboardOptions.notesOn = []; // reset in case some where on before reset.
  } else {
    warning('No MIDI input devices found. Please connect a device.');
    keyboardStatus = 'disconnected';
    keyboardOptions.notesOn = []; // reset in case some where on before reset.
    return;
  }

  input.addListener('controlchange', "all", controlChangeHandler, { once: true });

  function controlChangeHandler(event) {
    if (event.controller.name === 'holdpedal') {
      if (event.value) {
        document.getElementById('pedalSymbolDiv').innerHTML = M["pedal"];
      } else {
        document.getElementById('pedalSymbolDiv').innerHTML = M["pedalup"];
      }
    }
  }

  input.addListener('noteoff', 'all', noteOffHandler, { once: true });
  input.addListener('noteon', 'all', noteOnHandler, { once: true });

  function noteOffHandler(e) {

    lastNoteTime = Date.now();

    if (preferences.synthLocalEcho) {
      const frequency = Tone.Midi(e.note.number).toFrequency();  // Convert MIDI note to frequency
      synth.triggerRelease(frequency, Tone.now());  // Stop note
    }

    // remove from list of notes showing on mini keyboard canvas
    keyboardOptions.notesOn = keyboardOptions.notesOn.filter((element) => element !== e.note.number);

    if (currentState !== STATE.SETTING_NOTES && !timerPaused &&
      (e.note.number > noteFilterHigh || e.note.number < noteFilterLow)) {
      console.log("ignoring note out of range");
      return;
    }
    const all = [waitNotes, playedNotes];  // the ending note could be in either

    for (let d = 0; d < 2; d++) {
      if (d === 0 && all[d] === null) {
        console.log("Waitnotes null, skipping d="+d);
        continue; // waitNotes can be null if processing was previously completed
      }
      for (let hand = 0; hand < 2; hand++) {
        // go backwards since most recent notes are likely the ones that have just finished playing
        //console.log("Finding note in: d="+d+" hand=" + hand);
        for (let n = all[d][hand].length-1; n >= 0; n--) {
            if (all[d][hand][n].note.number === e.note.number && all[d][hand][n].eTime === null) {
              all[d][hand][n].eTime = e.timestamp;
              //console.log("found ending note");
              if (d === 0) {  // if the note was found in the waitNotes array
                // we found the noteoff in the waitNotes array so it might now
                // be complete. see if it has any eTime === null
                for (let h2 = 0; h2 < 2; h2++) {
                  for (let n2 = 0; n2 < waitNotes[h2].length; n2++) {
                    if (waitNotes[h2][n2].eTime === null) {
                      console.log("waitNotes is still incomplete");
                      return; // no we're still waiting for at least 1 note
                    }
                  }
                }

                // if we get here then waitNotes is now full so we can compute stats and
                // clear it out.
                // to avoid blocking here, we spin it off async using a 0 second timeout.
                // to avoid race conditions, we send it a copy of the waitNotes array.

                setTimeout(function() {displayTestStats(waitNotes.slice());}, 0);
              }
              return;
            }
          }
      }
    }
    console.log("Could not find ending note");
    //debugWindow();
  }

  // This is the main function to score incoming notes. It's really too long and complex
  // and should be broken up into subfunctions.

  function noteOnHandler(e) {

    if (preferences.noteDebug) {
      console.log("*****NoteOn: "+e.note.number+" v:"+e.velocity);
    }
    lastNoteTime = Date.now();

    if (e.velocity === 0) {
      // some midis use a noteon event with 0 velocity to mean noteoff.
      // IMPLEMENT: we should really check to see if this note is still live (i.e.
      // sitting in the keyboardOptions.notesOn array) before concluding this is
      // a noteoff, since some keyboards do transmit a 0 velocity noteon in the case
      // of a very softly played note. The current logic would cause that to be flagged
      // as an error, which is mostly ok since the note wouldn't sound in that case, but
      // more accurate would be to treat the cases separately (two cases: noteon 0 velocity when that
      // note is not active versus when active).
      noteOffHandler(e);
      if (preferences.noteDebug) warning("0v");
      return;
    }

    if (preferences.synthLocalEcho) {
      const frequency = Tone.Midi(e.note.number).toFrequency();  // Convert MIDI note to frequency
      synth.triggerAttack(frequency, undefined, e.velocity/127);  // Play note
    }

    keyboardOptions.notesOn.push(e.note.number);

    // the user can define a highest and lowest note on the keyboard that will
    // signify that the user is canceling the current partial run. So if the user
    // starts to feel they are messing up, then can cancel the rest of the current run and
    // safely start over.

    const isCancelKey = (e.note.number === noteToMidiNumber(preferences['runCancelKeyHigh']) ||
                          e.note.number === noteToMidiNumber(preferences['runCancelKeyLow']));

    // we ignore notes that are significantly out of range
    // of the current hand. This allows you, for example, to accompany
    // a RH scale with a LH chord progression (common when practicing blues scales)
    // and the LH chords will simply be ignored for scoring purposes

    if (currentState !== STATE.SETTING_NOTES && !isCancelKey &&
      (e.note.number > noteFilterHigh || e.note.number < noteFilterLow)) {
      console.log("ignoring note out of range");
      return;
    }

    currentHand = getSelectedHand();

    // store stats (used further down in the code)
    const notestruct = {
        note:   e.note,
        velocity: e.velocity,
        sTime:  e.timestamp,
        eTime:  null
    };

    // helper function to find the next non-rest note (which could also be a chord)
    function nextNonRest(notes, start) {
      //console.log("NextNonRest start="+start+" notes="+notes);
      for (let i = start; i < notes.length; i++) {
        if (notes[i] !== RESTNOTE) {
          //console.log("Returning:"+notes[i]+" at position:"+i);
          return notes[i];
        }
      }
      //console.log("### Ran out of notes while skipping rests. start="+start+" notes="+notes);
      return null;
    }

    if (currentState === STATE.SETTING_NOTES) {
      // IMPLEMENT: THIS IS CURRENTLY OBSOLETE CODE ... WE NEED A BETTER SYSTEM
      // FOR NOTE INPUT, probably using a third party library.
      let note = e.note.number;
      if (currentHand === 'left') {
        notesToPlay[0].push(note);
        // Display the human-readable note name on the main screen
        let noteName = prnote(e.note);
        let notesDiv = document.getElementById('notesLH');
        notesDiv.textContent = notesDiv.textContent + " " + noteName;
      }
      if (currentHand === 'right' || currentHand === 'both') {
        notesToPlay[1].push(note);
        // Display the human-readable note name on the main screen
        let noteName = prnote(e.note);
        let notesDiv = document.getElementById('notesRH');
        notesDiv.textContent = notesDiv.textContent + " " + noteName;
      }
      updateDisplayedNotesToPlay();

    } else if (currentState === STATE.TESTING_NOTES && !timerPaused) {

      // This is the main section that handles testing notes.
      // IMPLEMENT: This is way too long and complex and should be refactored
      // into some strategic subroutines.

      //console.log("STATE.TESTING_NOTES");

      // Check if the played note matches the expected note
      let playedNote = e.note.number;

      // IMPLEMENT: It might be a good idea to ignore one or both of the cancel keys if the current test
      // note ranges actually contain one or both of them. The right place to detect this is whenever
      // the user selects a new range of notes, or when a new set of notes is loaded, a flag could be set
      // to indicate that the score contains one or both of the cancel keys.

      if (isCancelKey) {
        console.log("Run Canceled using keyboard");
        startTime = performance.now(); // we always start when the first note starts
        clearPlayedNotes();
        return; // do not continue in this case
      }

      let matchhand = 0;

      if (0) {
        // IMPLEMENT: compute the set of possible notes we're expecting for all relevant hands.
        // this is not currently used but is a strategy to handle chorded notes.
        let expected = [[],[]];
        for (h = 0; h < 2; h++) {
          const lastPlayed = playedNotes[h].length-1;
          if (isChord(playedNotes[h][lastPlayed])) {
            // see if all the notes in the chord have been played cn
            const chordnotesplayed = playedNotes[h][lastPlayed].length;
            //if (chordnotesplayed === notesToPlay[])
          } else {
            expected[h].push();
          }
        }

        // IMPLEMENT: handle chords in note positions
        if (currentHand === 'left' || currentHand === 'both') {
          if (isChord(playedNotes[0][playedNotes[0].length-1])) {

          }
        }
        if (currentHand === 'right' || currentHand === 'both') {
          if (isChord(playedNotes[1][playedNotes[1].length-1])) {

          }
        }
      }
      /* end of experimental chord handling code */

      if (currentHand === 'left') {
        moveRests(0, e);
        playedNotes[0].push(notestruct);
      } else if (currentHand === 'right') {
        moveRests(1, e);
        playedNotes[1].push(notestruct);
        matchhand = 1;
      } else { // both hands
        // take a peek and see if it matches expected left hand or right hand
        const nextLeft = nextNonRest(notesToPlay[0], playedNotes[0].length+noteScope[0].first); //notesToPlay[0][playedNotes[0].length];
        const nextRight = nextNonRest(notesToPlay[1], playedNotes[1].length+noteScope[1].first); //notesToPlay[1][playedNotes[1].length];

        if (playedNote === nextLeft && playedNote === nextRight) {
          // ok, this can happen if one the same note has to be hit by each hand serially, which
          // does occur from time to time. One or the other of theses notes must have a lower beat number,
          // since it's not physically possible (or useful) for both hands to hit the same key simultaneously.
          // So whichever hand expects a lower beat number next wins.

          // I'm not sure if it's possible for the two lines below to be off because the next note(s) is/are
          // rests ... for further study.
          moveRests(0, e);
          moveRests(1, e);
          const leftbeat = noteStartBeat[0][playedNotes[0].length+noteScope[0].first];
          const rightbeat = noteStartBeat[1][playedNotes[1].length+noteScope[1].first];
          if (leftbeat < rightbeat) { // the left hand is first in line to play the note
            playedNotes[0].push(notestruct);
            matchhand = 0;
          } else { // the right hand is first in line
            playedNotes[1].push(notestruct);
            matchhand = 1;
          }
        } else if (playedNote === nextLeft) {
          moveRests(0, e);
          playedNotes[0].push(notestruct);
        } else if (playedNote === nextRight){
          moveRests(1, e);
          playedNotes[1].push(notestruct);
          matchhand = 1;
        } else {
          // it doesn't match either hand. Choose the hand where the played note is
          // closest to the expected note (in terms of midi number of the notes)

          if (Math.abs(playedNote-nextLeft) < Math.abs(playedNote-nextRight)) {
            matchhand = 0;
          } else {
            matchhand = 1;
          }
          console.log("MISMATCH: pn="+playedNote+" nextLeft="+nextLeft+
            " nextRight="+nextRight+
            " matchhand="+matchhand
          );
          moveRests(matchhand, e);
          playedNotes[matchhand].push(notestruct);
        }
      }

      const expectedNote = notesToPlay[matchhand][playedNotes[matchhand].length - 1 +
                              noteScope[matchhand].first]; // note number

      // if this is the first non-rest note for the matching hand, and
      // there are no played non-rests in the other hand, then this is the very
      // first note of the new test cycle so start the timer.

      //console.log("mh="+matchhand+" pnm.len="+playedNotes[matchhand].length+" firstnon:"+noteScope[matchhand].firstrangenonrest+" othlen:"+playedNotes[1-matchhand].length+" othfnr:"+noteScope[1-matchhand].firstrangenonrest);
      if (playedNotes[matchhand].length === 1+(noteScope[matchhand].firstrangenonrest-noteScope[matchhand].first)
            && playedNotes[1-matchhand].length <= (noteScope[1-matchhand].firstrangenonrest-noteScope[1-matchhand].first)) {
        startTime = performance.now(); // we always start when the first note starts
        clearPlayedNotes(matchhand, noteScope[matchhand].firstrangenonrest);
        console.log("FIRST NOTE OF NEW TEST");
      }

      if (0) {
        console.log("Test: Expected: " + expectedNote + " got: " + playedNote + " start=" + notestruct.sTime);

        console.log("NOTE ANALYSIS: curhand:"+currentHand+" priorFailed:"+priorFailed+
          " played0:"+playedNotes[0].length+" played1:"+playedNotes[1].length+
          " played=expected:"+(playedNote===expectedNote));
      }

      if (noteMatches(playedNote, expectedNote)) {
        showPlayedNote(e.note, matchhand, playedNotes[matchhand].length - 1 + noteScope[matchhand].first, true);
        wrongNotePlayed = false;
        wrongNoteNumber = -1;
        errorStats(wrongNotePlayed);
        nnAccuracy.success++;
        goodNotes++;  // this is the number of good notes just in the current run, it gets reset by logOneRun
        //console.log("NN.SUCCESS "+goodNotes);
      } else if (
        (currentHand === 'both' &&
            (noteMatches(playedNote, notesToPlay[0][noteScope[0].firstrangenonrest]) ||
              noteMatches(playedNote, notesToPlay[1][noteScope[1].firstrangenonrest])))
         ||
        (currentHand === 'right' && noteMatches(playedNote, notesToPlay[1][noteScope[1].firstrangenonrest]))
          ||
        (currentHand === 'left' && noteMatches(playedNote, notesToPlay[0][noteScope[0].firstrangenonrest]))
      ) {
          // FALSE FAIL DETECT #1 (Restart cancels run)
          // This could, rarely, result in a false good run, but it is necessary to
          // avoid false fails. Basically, at any time the user can restart the current run
          // without penalty as long as they haven't hit a wrong note.
          // Without this code, with scales and arpeggios the starting and ending notes
          // of each hand are the same, so if a user hits a wrong note and doesn't notice
          // and continues playing, the ending notes will be falsely detected as the
          // starting note, which will cause failures to stack up even though no actual mistakes
          // are being made.

          // no credit for notes played if you cancel early!
          const canc = goodNotes - 1; // cancel them all except the one just played
          nnAccuracy.success -= canc; // adjust entire session accuracy figures too
          goodNotes = 1; // just the one just played is now considered good
          console.log("CANCELED GOOD NOTES "+canc+" gn="+goodNotes);

          playedNotes = [[],[]];
          clearPlayedNotes();
          if (noteMatches(playedNote, notesToPlay[0][noteScope[0].firstrangenonrest])) {
            matchhand = 0;
          } else {
            matchhand = 1;
          }
          moveRests(matchhand, e);
          playedNotes[matchhand].push(notestruct);
          showPlayedNote(e.note, matchhand, noteScope[matchhand].firstrangenonrest, true);
          wrongNotePlayed = false;
          wrongNoteNumber = -1;
          startTime = performance.now();
          errorStats(wrongNotePlayed);
      } else if (currentHand === 'both' && priorFailed === true &&
           (playedNotes[0].length===(1+noteScope[0].firstrangenonrest) &&
             playedNotes[1].length===(1+noteScope[1].firstrangenonrest)
           )) {
          //(playedNotes[0].length+playedNotes[1].length)===2+noteScope[0].firstrangenonrest+noteScope[1].firstrangenonrest) {
        // FALSE FAIL DETECTION #2
        // ok, this is a missed note that occurred in a very specific situation:
        // 1. we are in hands together mode
        // 2. the prior result was failure, meaning we recently came back into a new run after a fail
        // 3. Exactly one note has been recognized as good so far.
        // 4. We now have a bad note.
        // In this situation, if we count this as a failed run, we will very frequently be causing a
        // false bad run. What can happen (esp with scales/arps) is that the user kept playing after
        // a bad note (which in fact they should get in the habit of doing: keep playing after a mistake)
        // and, for example, the left hand gets up to the tonic note of the right hand, which would cause
        // a new run to start being counted, however as soon as the right hand plays another note it would
        // be logged as yet another failure. So essentially we are saying that in this situation it would
        // be better to just consider this to be part of the prior failure rather than count it as a new
        // failure. Another way to look at it is that after a fail state, we will require BOTH hands to play
        // one good note before we'll consider a new run to be truly started. As with the code above, this
        // may on occassion fail to count a legit error, but the vast majority of the time this will stop
        // a false failure.
        currentState = STATE.TEST_FLUSHING;
        wrongNotePlayed = true;
        priorFailed = true;
        console.log("***********TEST OF FALSE NEG TRIGGERED");
      } else { // missed the note
        console.log("NFail got:"+prnote(e.note));
        warning("Nfail:"+prnote(e.note)+" expected:"+expectedNote+" played:"+playedNote);
        wrongNotePlayed = true;
        wrongNoteNumber = e.note.number;
        nnAccuracy.fail++;
        //console.log("NN.FAIL");
        // add one error at note position played.
        const errorindex = playedNotes[matchhand].length-1+noteScope[matchhand].first
        if (!isAvail(errorNotes[matchhand])) {
          errorNotes[matchhand] = [];
        }
        if (!isAvail(errorNotes[matchhand][errorindex])) {
          errorNotes[matchhand][errorindex] = 0;
        }
        currentErrorNote = {hand:matchhand, errorIndex:errorindex}; // needed for logOneRun
        errorNotes[matchhand][errorindex]++;

        showPlayedNoteErrors(e.note, matchhand, errorindex, errorNotes[matchhand][errorindex]);
        showPlayedNote(e.note, matchhand, errorindex, false);
        errorStats(wrongNotePlayed);

        failCount++; // we do this here, but not again in the flushing state
        noteFailCount++;
        displayTestStats(null, "failure");
        currentState = STATE.TEST_FLUSHING;
        //console.log("State=flushing, failcount=" + failCount);
        priorFailed = true;
      }

      // See if we have played the last note required, thus ending this
      // test cycle.

      if ( (!wrongNotePlayed) &&
        (
          (currentHand === 'right' && playedNotes[1].length === (noteScope[1].last-noteScope[1].first+1)) ||
          (currentHand === 'left' && playedNotes[0].length === (noteScope[0].last-noteScope[0].first+1)) ||
          (currentHand === 'both' && playedNotes[0].length === (noteScope[0].last-noteScope[0].first+1) &&
            playedNotes[1].length === (noteScope[1].last-noteScope[1].first+1))
        )
      ) {
        // we've come to the end of a successful test cycle.
        //message("Completed Test Cycle");
        console.log("TEST COMPLETE. pn0len:"+playedNotes[0].length+" pn1len:"+playedNotes[1].length+" ns0:"+noteScope[0].last+"/"+noteScope[0].first+" ns1:"+noteScope[1].last+"/"+noteScope[1].first);
        successCount++;
        splitRests();
        waitNotes = playedNotes.slice(); // copy of array
        playedNotes = [[], []];
        //clearPlayedNotes();
        priorFailed = false;
      }
    } else if (currentState === STATE.TEST_FLUSHING) {
      // continue testing when we see either the first LH or first RH
      console.log("FLUSHING got:"+e.note.number);
      let playedNote = e.note.number;

      console.log("first nr L:"+notesToPlay[0][noteScope[0].first]+" R:"+notesToPlay[1][noteScope[1].first]);
      const firstLeft = nextNonRest(notesToPlay[0], noteScope[0].first);
      const firstRight = nextNonRest(notesToPlay[1], noteScope[1].first);

      if (
          ( currentHand === 'right' && noteMatches(playedNote, firstRight) ) ||
          (currentHand === 'left' && noteMatches(playedNote, firstLeft)) ||
          (currentHand === 'both' &&
            (noteMatches(playedNote, firstRight) || noteMatches(playedNote, firstLeft))
          )
        ) {
        wrongNotePlayed = false;
        wrongNoteNumber = -1;
        playedNotes = [[], []];
        clearPlayedNotes();
        if (currentHand === 'left') {
          moveRests(0, e);
          playedNotes[0].push(notestruct);
          showPlayedNote(e.note, 0, playedNotes[0].length-1+noteScope[0].first, true);
        } else if (currentHand === 'right') {
          moveRests(1, e);
          playedNotes[1].push(notestruct);
          showPlayedNote(e.note, 1, playedNotes[1].length-1+noteScope[1].first, true);
        } else if (playedNote === firstLeft) {
          moveRests(0, e);
          playedNotes[0].push(notestruct);
          showPlayedNote(e.note, 0, playedNotes[0].length-1+noteScope[0].first, true);
        } else if (playedNote === firstRight) {
          moveRests(1, e);
          playedNotes[1].push(notestruct);
          showPlayedNote(e.note, 1, playedNotes[1].length-1+noteScope[1].first, true);
        } else {
          console.error("RAN OUT OF CONDITIONS IN STATE FLUSHING");
        }
        startTime = performance.now();
        //console.log("While Flushing, got start note: going back into state testing");
        currentState = STATE.TESTING_NOTES;
      } else {
        wrongNotePlayed = true;
        currentState = STATE.TEST_FLUSHING;
        console.log("In state flushing, note still wrong, still flushing failed=" + failCount);
      }
    }
  } // end of noteOnHandler

  // IMPLEMENT: This is the first baby-step toward handling chords. It allows a note to match
  // any one of notes in an array of notes. Considerably more work needs to be done, though, because
  // we can't match a note that's already been matched, as well as a host of other changes. Ultimately
  // this feature may require a major overhaul to the noteOnHandler to use a totally different strategy.
  function noteMatches(note, expected) {
    if (Array.isArray(expected)) {
      return expected.includes(note);
    } else {
      return note === expected;
    }
  }

  function moveRests(h, e) {
    while (notesToPlay[h][playedNotes[h].length+noteScope[h].first] === RESTNOTE) {
      let starttime = e.timestamp-250; // arbitrary start of rest when first "note" of entire piece is a rest
      if (playedNotes[h].length > 0) {
        // the start time of the rest is the end time of the prior note for this hand
        starttime = playedNotes[playedNotes.length-1].eTime;
      }
      const restnote = {
          note:   {number:RESTNOTE},
          velocity: 0,
          sTime:  starttime,
          eTime:  starttime+250 // this is just a placeholder
      };
      showPlayedNote(RESTNOTE, h, playedNotes[h].length+noteScope[h].first, true); // show that it's been "played"
      playedNotes[h].push(restnote);
    }
} // end of moveRests

function splitRests() {
  // check to see if there are two rest notes in a row and divide time between them
  // proportionately with respect to their durations.
  // Also, fix up rest start and end times.

  for (let h = 0; h < 2; h++) {
    for (let cur = 0; cur < playedNotes[h].length-1; cur++) {
      //console.log("SPLIT h="+h+" cur="+cur);

      if (playedNotes[h][cur].note.number === RESTNOTE) {
        if (!isAvail(playedNotes[h][cur].sTime)) {
          if (cur > 0) {
            // the start time of a rest is the end time of the prior note
            playedNotes[h][cur].sTime = playedNotes[h][cur-1].eTime;
            if (!isAvail(playedNotes[h][cur].eTime)) {
              playedNotes[h][cur].eTime = playedNotes[h][cur+1].sTime;
            }
          } else {
            // if the rest is the very first note, arbitrarily put its start time
            // 250 ms in the past. IMPLEMENT: There should be a better solution here.
            playedNotes[h][cur].eTime = playedNotes[h][cur+1].sTime;
            playedNotes[h][cur].sTime = playedNotes[h][cur].eTime - 250;
          }
        }
      }

      // IMPLEMENT: This only works for at most 2 rests in a row. This should be generalized to handle
      // any number of rests in a row since there could be cases of multiple bars of rests. To do this,
      // the if statements below need to be changed into loops.

      if (playedNotes[h][cur].note.number === RESTNOTE && playedNotes[h][cur+1].note.number === RESTNOTE) {

        if (cur+2 < playedNotes[h].length) {
          // make end time of the rests the same as start time of next note, if there is one
          playedNotes[h][cur].eTime =
          playedNotes[h][cur+1].eTime =
            playedNotes[h][cur+2].sTime;
        } else if (cur > 0) {
          playedNotes[h][cur].eTime =
          playedNotes[h][cur+1].eTime = playedNotes[h][cur-1].eTime+250; // punt! These rests were the last notes, so when did they end? You're guess is as good as mine.
        }

        if (cur > 0) {
          // make start time of rests the same as end time of prior note
          playedNotes[h][cur].sTime =
          playedNotes[h][cur+1].sTime =
            playedNotes[h][cur-1].eTime;
        } else {
          playedNotes[h][cur].sTime =
          playedNotes[h][cur+1].sTime =
            playedNotes[h][cur+1].sTime-250;
        }

        const dur1 = durationsToPlay[h][(cur+noteScope[h].first)%durationsToPlay[h].length];
        const dur2 = durationsToPlay[h][(cur+1+noteScope[h].first)%durationsToPlay[h].length];

        console.log("SPLITTING: hand="+h+"curnote="+cur+" dur1="+dur1+" dur2="+dur2+" curst="+playedNotes[h][cur].sTime+" curet="+playedNotes[h][cur].eTime+" nxtst"+playedNotes[h][cur+1].sTime+" nxtet="+playedNotes[h][cur+1].eTime);

        console.log("typeof stime:'"+(typeof playedNotes[h][cur].sTime)+"'");

        if (typeof playedNotes[h][cur].sTime !== "number" || isNaN(playedNotes[h][cur].sTime)) {
          playedNotes[h][cur].sTime = playedNotes[h][cur].eTime - 250;
          //console.log("SPLITTING FIX: hand="+h+"curnote="+cur+" dur1="+dur1+" dur2="+dur2+" curst="+playedNotes[h][cur].sTime+" curet="+playedNotes[h][cur].eTime+" nxtst"+playedNotes[h][cur+1].sTime+" nxtet="+playedNotes[h][cur+1].eTime);

        }
        if (typeof playedNotes[h][cur+1].sTime !== "number" || isNaN(playedNotes[h][cur+1].sTime)) {
          playedNotes[h][cur+1].sTime = playedNotes[h][cur+1].eTime - 250;
          //console.log("SPLITTING FIX: hand="+h+"curnote="+cur+" dur1="+dur1+" dur2="+dur2+" curst="+playedNotes[h][cur].sTime+" curet="+playedNotes[h][cur].eTime+" nxtst"+playedNotes[h][cur+1].sTime+" nxtet="+playedNotes[h][cur+1].eTime);

        }
        const elapsed = playedNotes[h][cur+1].eTime-playedNotes[h][cur].sTime;
        playedNotes[h][cur+1].sTime =
            playedNotes[h][cur].sTime + (dur1/(dur1+dur2))*elapsed;
        playedNotes[h][cur+1].eTime = playedNotes[h][cur].eTime;
        playedNotes[h][cur].eTime = playedNotes[h][cur+1].sTime;
        //console.log("SPLIT RESTS: elapsed:"+elapsed+" dur1:"+dur1+" dur2:"+dur2+" times:"+playedNotes[h][cur].sTime+":"+playedNotes[h][cur].eTime+"::"+playedNotes[h][cur+1].sTime+":"+playedNotes[h][cur+1].eTime);
      }
    } // end of for (cur...)
  } // end of for (h...)
} // end of splitRests()

} // end of connectMidi

// Function to start the test and initialize the start time
function startTest() {
  let button = document.getElementById('testNotesButton');

  testStartTime = Date.now(); // - avail(testOptions.wallTimeToday, 0);
  testPauseTime = 0;
  console.log("Cleared testPauseTime in starttest");
  timerPaused = false;
  lastNoteTime = 0; // for autopause feature
  button.textContent = "STOP";
  document.getElementById("timerPauseButton").style.display = "inline-block";
  document.getElementById("timerPauseButton").style.color = "gray";
  updateElapsedTime(); // Update elapsed time starts a timer to keep it up to date

  if (preferences['autoFullscreenStart'] && !testOptions.isFreePlay) {
    console.log("Full Screen auto on start");
    setTimeout(function() {fullscreen(true);}, 300);
  } else {
    console.log("Not going full screen: autoFS:"+preferences['autoFullscreenStart']+" isfree:"+presets[curPresetIndex].isFreePlay);
  }
}

// MOVED TO ui.js: function showPlayedNote(note, hand, index, correct) - simplified version in ui.js
// MOVED TO ui.js: function showPlayedNoteErrors(note, hand, index, errors) - simplified version in ui.js

function printObject(obj) {
  let p = "";
  for (const key in obj) {
    p += `${key}:`+obj[key]+'\n';
  }
  return p;
}

function replay(notes, hand, speedMultiplier) {
  if (midiOutput === null || notes === null) {
    warning("No MIDI output device available for replay.");
    return;
  }

  let startTime;

  if (hand === 'left') {
    startTime = notes[0][0].sTime;
  } else if (hand === 'right') {
    startTime = notes[1][0].sTime;
  } else {
    startTime = math.Min(notes[0][0].sTime, notes[0][1].sTime);
  }

  for (let i = 0; i < notes.length; i++) {
    if (hand === 'both' || hand === 'left') {

    }
    if (hand === 'both' || hand === 'right') {

    }
  }
}

// Function to play a MIDI note for a specific duration
// The time parameter allows you to schedule the note to play in
// the future (milliseconds) using the midi scheduler.

let midiVoiceChannelMap = [0]; // initialize to having just a grand piano in first channel.

function clearMidiChannels() { // do this on disconnect
  midiVoiceChannelMap = [0];
}

// MOVED TO audio.js: function playSynthNote(noteNumber, duration, velocity)

function playMIDINote(noteNumber, dur, vel, voice, time=0) {
  if (preferences.synthPlaySongs || midiOutput === null) {
    playSynthNote(noteNumber, dur, vel);
    return;
  }

  let c = midiVoiceChannelMap.indexOf(voice);
  if (c === -1) { // not found, allocate a new one
    if (midiVoiceChannelMap.length < 16) {
      c = midiVoiceChannelMap.length;
      midiOutput.channels[c+1].sendProgramChange(voice); // channels start at 1, not 0
      midiVoiceChannelMap[c] = voice;
      console.log("Playnote: creating channel map: c="+(c+1)+" voice="+voice);
    } else {
      c = 0; // punt and use a grand piano. We're out of channels to define new voices.
    }

  }

  dur = (typeof dur === 'string') ? parseInt(dur) : dur;
  vel = (typeof vel === 'string') ? parseInt(vel) : vel;
  voice = (typeof voice === 'string') ? parseInt(voice) : voice;

  const opts = {
    duration: dur,
    time: "+"+time,
    attack: (vel/128),
  };

  //console.log("Playing note "+noteNumber+" att:"+vel+" dur:"+dur+" voice:"+voice);

  midiOutput.channels[c+1].playNote(noteNumber, opts);

}

// Function to update the elapsed time display
function updateElapsedTime() {
  if (testStartTime) {
    if (timerPaused) {
      return;
    }

    if (false && preferences.autoPauseClock) {
      if ((Date.now()-lastNoteTime) > 5000) {
        pauseTimer(true);
        return;
      } else {
        pauseTimer();
      }
    }
    let currentTime = Date.now();
    let elapsedTime = currentTime - testStartTime + testPauseTime;
    let elapsedSeconds = Math.floor(elapsedTime / 1000); // Convert milliseconds to seconds

    // Update the element with the elapsed time
    let elapsedTimeElement = document.getElementById('elapsedTime');
    elapsedTimeElement.textContent = formatTime(elapsedSeconds);
    // Schedule the next update in 0.1 second
    setTimeout(updateElapsedTime, 100);
  }
}

function pauseTimer(autoPause=false) {
  if (timerPaused) {
    resumeTimer();
    return;
  }
  console.log("Pause Timer, autopause="+autoPause);
  let currentTime = Date.now();
  testPauseTime = currentTime - testStartTime + testPauseTime;
  console.log("Set testpausetime to:"+testPauseTime);
  timerPaused = true;
  const button =document.getElementById("timerPauseButton");
  button.style.color = "red";
  if (autoPause) {
    button.innerHTML = "&#9208;<span style=font-size:x-small>a</span>";
  } else {
    button.innerHTML = "&#9208";
  }
}

function resumeTimer() {
  testStartTime = Date.now();
  timerPaused = false;
  updateElapsedTime();
  document.getElementById("timerPauseButton").style.color = "gray";
}

// Function to format the elapsed time in MM:SS format
function formatTime(seconds) {
  //console.log("Formatting number:"+seconds);
  seconds = Number(seconds);
  let hours = Math.floor(seconds/(60*60));
  let minutes = Math.floor((seconds-hours*60*60) / 60);
  let remainingSeconds = Math.trunc(seconds % 60);
  //console.log("hours="+hours+" min:"+minutes+" remsec="+remainingSeconds);

  // Pad single-digit seconds with leading zero
  let secondsString = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
  //console.log("secstr="+secondsString);

  if (hours === 0) {
      return String(minutes) + ':' + secondsString;
  } else {
      return String(hours) + ":" + String((minutes<10)?'0':'') + String(minutes) + ':' + secondsString;
  }

}

// Function to end the test and reset the start time
let run = 0;

async function endTest() {
  if (testOptions.isFreePlay) {
    const elapsed = Date.now() - testStartTime + testPauseTime;
    await logFreePlay(elapsed);
    console.log("Free play time logged in endTest");
    
    // Update the manual input field to show the new total
    const newTotal = getTodayFreePlayTime();
    const inputField = document.getElementById("freePlayManualInput");
    if (inputField) {
      inputField.value = newTotal;
      console.log("Updated freePlayManualInput to:", newTotal);
    }
    //document.getElementById("PresetMenu").disabled = false; // it was disabled during the test.
  } else {
    // Regular timed practice (not free play)
    const elapsed = Date.now() - testStartTime + testPauseTime;
    if (typeof getVimsyPreferences === 'function' && typeof isVimsyEnabled === 'function' && typeof addToVimsyBuffer === 'function') {
      const prefs = getVimsyPreferences();
      if (isVimsyEnabled() && prefs.autoSync && prefs.includePractice && elapsed > 0) {
        console.log("[Vimsy] Adding timed practice to buffer:", curPresetName, elapsed);
        addToVimsyBuffer(elapsed, curPresetName);
      }
    }
  }
  testStartTime = null;
  testPauseTime = 0;
  console.log("Cleared testPauseTime in endtest");
  enablePresetMenu();

  if (preferences.autoExitFullscreenStop) {
    exitFullscreen();
  }
}

function debugWindow() {

  let d = "<p>Notes list:";

  for (let hand = 0; hand < 2; hand++) {
    for (let n = 0; n < playedNotes[hand].length; n++) {
      if (playedNotes[hand][n].sTime !== null && playedNotes[hand][n].eTime !== null) {
        //continue; // this note was finished
      }
      d += "H"+hand+"N"+n+
        "(" + prnote(playedNotes[hand][n].note) + ") s=" +
        Math.trunc(playedNotes[hand][n].sTime) + " e="+
        (playedNotes[hand][n].eTime !==null?Math.trunc(playedNotes[hand][n].eTime):"NULL") + "</br>";
    }
  }
  d+="</p>";

  document.getElementById("debugDiv").innerHTML = d;
}



function scrollToDataTop(godata) {

  if (godata) {
    const dataTable = document.getElementById('data');
    if (dataTable) {
      const dataTableRect = dataTable.getBoundingClientRect();
      const dataTableTop = dataTableRect.top + window.scrollY - 3;
      window.scrollTo({
        top: dataTableTop,
        behavior: 'smooth'
      });
    }
  } else {
    const uitop = document.getElementById('uitop');
    console.log("UITOP in scrolldata:"+uitop)
    if (top) {
      const rect = uitop.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      console.log("UITOP Scroll pos:"+top);
      setTimeout(function() {
        window.scrollTo({
          top: 1,
          behavior: 'smooth'
        });
      },500);
    }
  }
}

// MOVED TO ui.js: function drawPianoKeyboard(options) - simplified version in ui.js

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

const voiceNumberElement = document.getElementById('voiceNumber');
const incrementButton = document.getElementById('increment');
const decrementButton = document.getElementById('decrement');

// MOVED TO ui.js: let counterValue = 0;
// MOVED TO ui.js: function updateCounterDisplay()

function incrementCounter() {
  if (counterValue < 100) {
    counterValue++;
    updateCounterDisplay();
  }
}

function decrementCounter() {
  if (counterValue > 1) {
    counterValue--;
    updateCounterDisplay();
  }
}

if (incrementButton !== null) incrementButton.addEventListener('click', incrementCounter);
if (decrementButton !== null) decrementButton.addEventListener('click', decrementCounter);

updateCounterDisplay(); // Initialize the display with the initial value

function playVoice(event) {
  let vn = document.getElementById("voiceNumber");
  let voice = 1;

  if (vn !== null) {
    voice = vn.textContent;
  }

  console.log("Playing voice "+voice);
  playMIDINote("C4", 500, 100, voice);

}

// This makes it easier to debug on tablet devices with no access to the console.
// Since the midi is using the OTG port, it's hard to get debugging info out.
function redirectConsole() {
  // Override the console.log function
  const originalConsoleError = console.error;
  console.error = function (...args) {
    // Call the original console.error function
    originalConsoleError.apply(console, args);

    // Create a new div element to display the message
    warning(args.join(' ')); // Join arguments into a single string
  };
}

// MOVED TO history.js: function populateTestNameOptions()
// MOVED TO history.js: function sortSelectedOptions(select)
// MOVED TO history.js: function decodeHTMLEntities(html)
// MOVED TO history.js: function populateHistoryTable()

// MOVED TO history.js: function filterAndDisplayHistory()
// MOVED TO history.js: function showStreakData(name)
// MOVED TO history.js: function showErrorMap(name)

// MOVED TO history.js: function drawHistoryGraph(stats, firstMonth, lastMonth, maxBPM, minBPM)
// MOVED TO history.js: function isWithinLastMonths(dateString, n)

// MOVED TO freeplay.js: function showFreePlay()
// MOVED TO freeplay.js: function showFreePlayHiddenItems()
// MOVED TO freeplay.js: function displayFreePlay(edit=-1) - large ~340 line function with drag-and-drop

// MOVED TO freeplay.js: function deleteFreePlay(index, value=true)
// MOVED TO freeplay.js: function addNewFreePlay()
// MOVED TO freeplay.js: function saveEditFreePlay(edit)

// MOVED TO history.js: function dateToDaysSince1970(dateString)

function scrollToFirstNote() {

  if (beatsToPlay === null || noteScope === null) {
    console.log("scrollToFirstNote: returning because beatstoplay or notescope null: btp:"+beatsToPlay+" ns:"+noteScope);
    return;
  }
  const firstbeat = [ beatsToPlay[0][noteScope[0].first], beatsToPlay[1][noteScope[1].first]];
  const hand = (firstbeat[0]>firstbeat[1]) ? 1 : 0;
  const ntp = document.getElementById("ntp_"+hand+"_"+noteScope[hand].first);
  //console.log("NTP="+ntp+" hand="+hand+" note="+noteScope[hand].first);
  if (ntp !== null) {
      setTimeout(function() {
        ntp.scrollIntoView({behavior:'instant', block: 'nearest', inline: 'start'})
      }, 50);
  } else {
    console.log("Cannot scroll to first note, ntp is null: ntp_"+hand+"_"+noteScope[hand].first);
  }
}

// MOVED TO history.js: function importExportHistory()


/////////////////// New note playing code.
/*
 * This code provides functionality to play a sequence of musical notes using the Web MIDI API,
 * with the ability to incrementally schedule notes, cancel playback, and highlight notes on a user interface as they are played.
 * It is designed for a music training web application to assist users in practicing keyboard music.
 *
 * Key Features:
 * - Incremental Scheduling: Notes are scheduled in chunks (e.g., next 500 milliseconds), allowing for real-time control over playback.
 * - Playback Control: Users can pause or cancel playback, with minimal delay before the action takes effect.
 * - Note Highlighting: As notes are played, corresponding visual elements can be highlighted and unhighlighted on the UI.
 * - Dynamic Expression: Attack (volume) values are calculated based on the beat position to simulate musical stress patterns.
 * - Debugging Support: Optional console logging provides detailed information for debugging purposes.
 *
 * Usage:
 * - To start playback, call `playNotesToPlay(speed)`, where `speed` is a multiplier for the playback speed (default is 1.0).
 * - To cancel playback, call `cancelPlayingNotes()`.
 * - To enable debug logging, set `debugPlayingNotes = true;`.
 *
 * Functions:
 * - `playNotesToPlay(speed)`: Initializes playback, builds the note event list, and starts scheduling notes.
 * - `scheduleNextNotes()`: Schedules notes incrementally by checking which notes fall within the next scheduling window.
 * - `scheduleNoteEvent(noteEvent)`: Schedules individual note events, sets up MIDI playback, and manages highlighting.
 * - `cancelPlayingNotes()`: Stops playback by clearing all scheduled timeouts and preventing further scheduling.
 * - `highlightNote()` and `unhighlightNote()`: Placeholder functions to implement UI highlighting logic.
 * - `computeAttack(bpb, noteStartBeat)`: Calculates the attack value for a note based on its position in the bar.
 *
 * Global Variables:
 * - `playbackStartTime`: Timestamp marking the start of playback.
 * - `noteEvents`: Array storing all note events to be played.
 * - `scheduledTimeouts`: Array of timeout IDs for scheduled functions, used for cancellation.
 * - `scheduledAnimationFrames`: Array of animation frame IDs (not extensively used in this code).
 * - `playbackCanceled`: Flag indicating whether playback has been canceled.
 * - `debugPlayingNotes`: Flag to enable or disable debug logging (set to `true` to enable).
 *
 * How It Works:
 * 1. **Initialization**:
 *    - `playNotesToPlay()` checks if there are notes to play and retrieves playback parameters (e.g., BPM, beats per bar).
 *    - Global variables are reset to ensure a clean state for playback.
 * 2. **Building Note Events**:
 *    - The code loops through the `notesToPlay` array for each hand (left and right), creating `noteEvent` objects.
 *    - Each `noteEvent` contains information about the note, including its start time, duration, and playback options.
 *    - Attack values are computed using `computeAttack()` to simulate musical stress patterns.
 * 3. **Scheduling Notes**:
 *    - Notes are sorted by start time to ensure correct playback order.
 *    - `scheduleNextNotes()` is called to schedule notes incrementally.
 *    - The function schedules notes that fall within the next 500 milliseconds (the lookahead window).
 *    - For each note to be scheduled, `scheduleNoteEvent()` is called.
 * 4. **Playing Notes and Highlighting**:
 *    - `scheduleNoteEvent()` calculates when the note should be played relative to the current time.
 *    - MIDI playback is scheduled using `midiOutput.channels[1].playNote()`, with timing options.
 *    - `highlightNote()` and `unhighlightNote()` are scheduled using `setTimeout` to visually indicate notes being played.
 *    - Chords (arrays of notes) are handled by iterating over the notes in the chord.
 * 5. **Cancellation**:
 *    - If `cancelPlayingNotes()` is called, `playbackCanceled` is set to `true`, and all scheduled timeouts are cleared.
 *    - This stops any further scheduling and prevents pending callbacks from executing.
 * 6. **Debugging**:
 *    - When `debugPlayingNotes` is `true`, detailed logs are output to the console at various stages of playback.
 *    - This includes information about note scheduling, timing calculations, and function calls.
 *
 * Important Notes:
 * - **Time Units**: Timing values used with the Web MIDI API (`opts.time`, `opts.duration`) are in seconds.
 *   Timing values used with `setTimeout` are in milliseconds.
 * - **Variable Dependencies**: The code assumes the existence of certain global variables and functions:
 *   - `notesToPlay`, `durationsToPlay`, `holdsToPlay`, `noteScope`, `noteStartBeat` are arrays containing note data.
 *   - `midiOutput` is an initialized MIDI output object.
 *   - `avail()` and `isAvail()` are utility functions for accessing optional parameters.
 *   - `getSelectedHand()` returns which hand(s) are selected for playback ('left', 'right', or 'both').
 *   - `warning()` is a function to display warnings to the user.
 * - **Customization**: You need to implement the `highlightNote()` and `unhighlightNote()` functions to interact with your UI.
 * - **Edge Cases**: The `computeAttack()` function currently handles common time signatures but can be expanded for others.
 *
 * Example:
 * ```javascript
 * // Enable debug logging
 * debugPlayingNotes = true;
 *
 * // Start playback at normal speed
 * playNotesToPlay();
 *
 * // Cancel playback after 5 seconds
 * setTimeout(cancelPlayingNotes, 5000);
 * ```
 */
// Global variables to manage playback state
let playbackStartTime = 0;
let noteEvents = [];
let scheduledTimeouts = [];
let scheduledAnimationFrames = [];
let playbackCanceled = false;
let playbackInProgress = false;
let playNotesButton = null;

// Debug flag
let debugPlayingNotes = true; // Set this to true to enable debug logs

function changePlayButton(playing) {
  document.getElementById(playNotesButton).innerHTML =
    playing ? '<i class="fa-solid fa-stop"></i>' : '<i class="fa-solid fa-play"></i>';
}

function playNotesToPlay(speed = 1.0) {
  if (playbackInProgress) {
    // if the playback was already in progress, then it should be cancelled now since
    // the play button will have been turned to a stop button.
    playbackCanceled = true;
    playbackInProgress = false;
    changePlayButton(playbackInProgress);
    return;
  }
  if (debugPlayingNotes) console.log("Starting playNotesToPlay with speed:", speed);

  if (!notesToPlay || notesToPlay.length === 0) {
    alert("There are no notes to play.");
    return;
  }
  let substituteSynth = false;
  if (midiOutput === null || preferences.synthLocalEcho) {
    substituteSynth = true;
  }
  playNotesButton = "playNotesToPlayButton";
  playbackInProgress = true;
  changePlayButton(playbackInProgress);

  const handSelection = getSelectedHand();
  const voice = avail(testOptions.midiVoice, 0); // Default is grand piano

  if (!substituteSynth) {
      midiOutput.channels[1].sendProgramChange(voice);
  }

  if (debugPlayingNotes) console.log("Selected voice:", voice);

  const bpm = avail(testOptions.targetBPM, 120);
  const bpb = avail(testOptions.beatsPerBar, 4);
  const beatdur = avail(testOptions.beatDur, 1 / 4);
  const disconnectDur = avail(testOptions.disconnectDur, 10); // ms

  if (debugPlayingNotes) {
    console.log("Playback parameters:");
    console.log("BPM:", bpm, "Beats per bar:", bpb, "Beat duration:", beatdur, "Disconnect duration:", disconnectDur);
  }

  // Initialize global variables
  playbackStartTime = performance.now() + 1200; // add an offset so all the timers have a chance to get set up
  noteEvents = [];
  scheduledTimeouts = [];
  scheduledAnimationFrames = [];
  playbackCanceled = false;

  // Variables to find the last note for cleanup
  let maxEndTime = -1;
  let maxIndex = -1;

  // Build the noteEvents array
  for (let h = 0; h < 2; h++) {
    if ((h === 0 && handSelection === 'right') || (h === 1 && handSelection === 'left')) {
      if (debugPlayingNotes) console.log(`Skipping hand (only playing ${handSelection})`);
      continue; // Not playing this hand
    }
    let firstBeat = -1;

    for (let n = noteScope[h].first; n <= noteScope[h].last; n++) {
      if (firstBeat === -1) {
        firstBeat = noteStartBeat[h][n];
        if (debugPlayingNotes) console.log("First beat for hand", h, "is", firstBeat);
      }

      const note = notesToPlay[h][n];

      if (note === -1 || note === undefined) {
        if (debugPlayingNotes) console.log("Skipping rest or undefined note at index", n, "for hand", h);
        continue; // Skip rests or undefined notes
      }

      let dur = durationsToPlay[h][n % durationsToPlay[h].length];

      // Use hold duration if available
      const hold = isAvail(holdsToPlay[h]) ? holdsToPlay[h][n % holdsToPlay[h].length] : dur;

      const t = ((60000 / speed) * (noteStartBeat[h][n] - firstBeat) / bpm); // Start time in ms from start to this note's beat
      const absoluteStartTime = playbackStartTime + t; // Absolute start time in ms

      let durms;
      let endtime;

      if (Array.isArray(hold)) {
        console.log("ARRAY DURATION FOUND");
        durms = [1/4,1/4,1/4,1/4,1/4,1/4,1/4,1/4,1/4,1/4,1/4,1/4]; // kludge, make sure we don't run out of durs
        endtime = []; // end times are also arrays in this case
        for (let d = 0; d < hold.length; d++) {
          if (dur[d] === 0) { // Crushed note
            dur[d] = 1 / 64; // Very short duration
            if (debugPlayingNotes) console.log("Crushed note at index", n, "for hand", h, "setting duration to", dur);
          }
          durms[d] = ((60000 / speed) * (hold[d] / beatdur) / bpm - disconnectDur); // Duration in ms
          endtime.push(absoluteStartTime + durms[d]);
        }
      } else {
        if (dur === 0) { // Crushed note
          dur = 1 / 64; // Very short duration
          if (debugPlayingNotes) console.log("Crushed note at index", n, "for hand", h, "setting duration to", dur);
        }
        durms = ((60000 / speed) * (hold / beatdur) / bpm - disconnectDur); // Duration in ms
        endtime = absoluteStartTime + durms;
      }

      if (debugPlayingNotes) {
        console.log(`Hand: ${h}, Note Index: ${n}`);
        console.log(`Duration (dur): ${dur}`);
        console.log(`Hold Duration (hold): ${hold}`);
        console.log(`Duration in ms (durms): ${durms}`);
        console.log(`Absolute Start Time (ms): ${absoluteStartTime}`);
      }

      // Compute attack based on beat
      let attack = computeAttack(bpb, noteStartBeat[h][n]);

      // Prepare options
      const opts = {
        duration: durms,
        attack: attack
      };

      // Add note event to the array
      noteEvents.push({
        hand: h,
        noteIndex: n,
        note: note, // can be an array for currentHistoryDisplayGraph
        startTime: absoluteStartTime, // Absolute start time in ms
        duration: durms, // Duration in ms, could be an array for chords
        endTime: endtime, // absoluteStartTime + durms, // Absolute end time in ms
        opts: opts,
        scheduled: false,
        finalNoteCleanup: false,
        useSynth: substituteSynth,
      });

      if (absoluteStartTime + durms > maxEndTime) {
        maxEndTime = absoluteStartTime + durms;
        maxIndex = noteEvents.length - 1;
      }

      if (debugPlayingNotes) {
        console.log(`Scheduled playnote hand=${h} note=${n}:`);
        console.log("Note:", note, "Start time (ms):", absoluteStartTime, "Duration (ms):", durms, "Options:", opts);
      }
    }
  }

  if (maxIndex >= 0) {
    noteEvents[maxIndex].finalNoteCleanup = true;
  }

  // Sort the noteEvents by startTime
  noteEvents.sort((a, b) => a.startTime - b.startTime);

  if (debugPlayingNotes) console.log("Total note events to play:", noteEvents.length);

  // Start scheduling notes
  scheduleNextNotes();
} // End of playNotesToPlay

function scheduleNextNotes() {
  if (playbackCanceled) {
    if (debugPlayingNotes) console.log("Playback has been canceled. Exiting scheduleNextNotes.");
    playbackInProgress = false;
    changePlayButton(playbackInProgress);
    return;
  }

  const currentTime = performance.now(); // ms
  const lookahead = 1000; // ms. We shedule this many notes ahead so a cancel will at most leave a small number playing.
  const scheduleUntil = currentTime + lookahead;

  if (debugPlayingNotes) console.log("Scheduling notes from", currentTime, "ms to", scheduleUntil, "ms");

  // Schedule notes within the next lookahead window
  for (let i = 0; i < noteEvents.length; i++) {
    const noteEvent = noteEvents[i];
    if (!noteEvent.scheduled && noteEvent.startTime <= scheduleUntil) {
      scheduleNoteEvent(noteEvent);
      noteEvent.scheduled = true; // Mark as scheduled
    } else if (noteEvent.startTime > scheduleUntil) {
      break; // Future notes will be scheduled later
    }
  }

  // Schedule the next call to scheduleNextNotes
  if (!playbackCanceled && noteEvents.some(ne => !ne.scheduled)) {
    const timer = lookahead / 10; // ms
    const timerId = setTimeout(scheduleNextNotes, timer); // Call again
    scheduledTimeouts.push(timerId);

    if (debugPlayingNotes) console.log("Scheduled next scheduleNextNotes call in " + timer + "ms");
  } else {
    if (debugPlayingNotes) console.log("All notes have been scheduled.");
    // Should add code here to clean up all outlines on notes in case any didn't clear
  }
}

function scheduleNoteEvent(noteEvent) {
  const { hand, noteIndex, note, startTime, duration, opts, finalNoteCleanup, useSynth } = noteEvent;

  // Calculate delays for highlighting and unhighlighting
  const highlightDelay = startTime - performance.now(); // in ms

  const unhighlightdur = isChord(duration)?Math.max(...duration):duration;
  const unhighlightDelay = highlightDelay + unhighlightdur; // in ms

  // Schedule highlightNote
  if (highlightDelay >= 0) {
    const highlightTimerId = setTimeout(() => {
      highlightNote(hand, noteIndex);
    }, highlightDelay); // Delay in ms
    scheduledTimeouts.push(highlightTimerId);
  } else {
    // Note is due or overdue, highlight immediately
    highlightNote(hand, noteIndex);
  }

  // Schedule unhighlightNote
  // implement: a chord may have different durations for each note so this
  // should be changed to handle chords when notes have different durations.
  // Right now it will unhighlight the whole chord as a unit.
  if (unhighlightDelay >= 0) {
    const unhighlightTimerId = setTimeout(() => {
      unhighlightNote(hand, noteIndex, finalNoteCleanup);
    }, unhighlightDelay); // Delay in ms
    scheduledTimeouts.push(unhighlightTimerId);
  } else {
    // Unhighlight immediately
    unhighlightNote(hand, noteIndex, finalNoteCleanup);
  }

  // Schedule the note to play at the correct absolute time
  opts.time = startTime; // Convert ms to seconds for MIDI API
  if (isChord(note)) {
    if (debugPlayingNotes) console.log("Playing chord:", note);
    for (let n = 0; n < note.length; n++) {
      let dur = opts.duration;
      if (isChord(dur)) { // the dur could apply to the entire chord, or there could be different durs for each note in the chord
        dur = dur[n];
      }
      if (useSynth) {
        console.log("PLAYSYNTH SCHEDULED ARRN="+n+" START:"+startTime+" now="+Date.now()+" dur:"+opts.duration);
        setTimeout( function () { playSynthNote(note[n], dur, opts.attack)},
            highlightDelay);
      } else {
        newopts = {...opts}; // shallow copy
        newopts.duration = dur; // in case the chord has different note durations
        midiOutput.channels[1].playNote(note[n], newopts);
      }
    }
  } else {
    if (debugPlayingNotes) console.log("Playing note:", note);
    if (useSynth) {
      console.log("PLAYSYNTH SCHEDULED "+startTime+" now="+Date.now()+" dur:"+opts.duration);
      //warning("P");
      setTimeout( function () { playSynthNote(note, opts.duration, opts.attack)},
          highlightDelay);
    } else {
      midiOutput.channels[1].playNote(note, opts);
    }
  }
  if (debugPlayingNotes) {
    console.log(`Scheduled note hand=${hand}, note=${noteIndex} start=${startTime} dur=${duration}`);
  }
}

function cancelPlayingNotes() {
  playbackCanceled = true;
  // Clear timeouts
  for (let i = 0; i < scheduledTimeouts.length; i++) {
    clearTimeout(scheduledTimeouts[i]);
  }
  scheduledTimeouts = [];
  // Cancel animation frames
  for (let i = 0; i < scheduledAnimationFrames.length; i++) {
    cancelAnimationFrame(scheduledAnimationFrames[i]);
  }
  scheduledAnimationFrames = [];

  if (debugPlayingNotes) console.log("Playback canceled. Future notes cleared.");
}

function highlightNote(hand, noteIndex, highlight = true) {
  if (debugPlayingNotes) console.log(`Highlight note index=${noteIndex} hand=${hand}, highlight=${highlight}`);
  const ntp = document.getElementById("ntp_" + hand + "_" + noteIndex);
  ntp.style.outline = highlight ? "2px solid black" : "none";
  if (highlight) {
    // If being highlighted, scroll it into view
    const leftpos = ntp.getBoundingClientRect().left / window.innerWidth;
    if (leftpos > 0.75 || leftpos < 1) { // Scroll if over 75% of screen already, or offscreen to the left
      setTimeout(function() {
        ntp.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'start' });
      }, 250);
    }
  }
}

function unhighlightNote(hand, noteIndex, finalNoteCleanup = false) {
  highlightNote(hand, noteIndex, false);
  if (finalNoteCleanup) {
    if (debugPlayingNotes) console.log("FINAL PLAYED NOTE CLEANUP");
    // Playback complete
    scheduledTimeouts = [];
    scheduledAnimationFrames = [];
    // Change button back to play in half a second
    setTimeout(function () {
      playbackInProgress = false;
      changePlayButton(playbackInProgress);
    }, 500);
    // Scroll back to first note of selection
    let hand;
    if (noteStartBeat[0][noteScope[0].first] < noteStartBeat[1][noteScope[1].first]) {
      hand = 0;
    } else {
      hand = 1;
    }
    const firstnote = document.getElementById("ntp_" + hand + "_" + noteScope[hand].first);
    setTimeout(function () {
      firstnote.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'start' });
    }, 1000);
  }
}

function computeAttack(bpb, noteStartBeat) {
  let attack = 0.51; // Default mezzo-piano
  const curbeat = noteStartBeat % bpb;

  if (bpb === 4) {
    if (curbeat === 0) {
      attack = 0.75; // strong beat, forte
    } else if (curbeat === 2) {
      attack = 0.63; // less strong beat, mezzo-forte
    } else if (curbeat > Math.trunc(curbeat)) {
      // Fractional beat, even weaker than weak
      attack = 0.4;
    }
  } else if (bpb === 3) {
    if (curbeat === 0) {
      attack = 0.75; // strong beat, forte
    } else if (curbeat > Math.trunc(curbeat)) {
      // Fractional beat, even weaker than weak
      attack = 0.4;
    } else {
      attack = 0.51;
    }
  } else if (bpb === 6) {
    if (curbeat === 0 || curbeat === 3) {
      attack = 0.85; // strong beat, forte
    } else if (curbeat > Math.trunc(curbeat)) {
      // Fractional beat, even weaker than weak
      attack = 0.4;
    } else {
      attack = 0.51;
    }
  } else {
    // Punt. First beat strong, fractional very weak, rest weak.
    if (curbeat === 0) {
      attack = 0.75; // Strong beat
    } else if (curbeat > Math.trunc(curbeat)) {
      attack = 0.4; // Fractional beat, very weak
    } else {
      attack = 0.63; // Weak beat
    }
  }

  if (debugPlayingNotes) {
    console.log(`Computed attack for beat ${curbeat} (bpb: ${bpb}):`, attack);
  }

  return attack;
}

// playing notes from the graph uses the same infrastructure.

function playGraph(speed = 1.0) {
  if (playbackInProgress) {
    // If playback was already in progress, then cancel it
    playbackCanceled = true;
    playbackInProgress = false;
    changePlayButton(playbackInProgress);
    console.log("Canceled playing notes from graph");
    return;
  }

  console.log("Playing MIDI notes from graph");

  if (!midiNotes || midiNotes.length === 0) {
    alert("There are no notes to play.");
    return;
  }

  playbackInProgress = true;
  playNotesButton = "playGraphNotesButton";
  changePlayButton(playbackInProgress);

  midiOutput.channels[1].sendProgramChange(0); // Grand piano or a default piano sound

  // Initialize global variables
  playbackStartTime = performance.now() + 800; // Add time so all the timers have a chance to get set up
  noteEvents = [];
  scheduledTimeouts = [];
  scheduledAnimationFrames = [];
  playbackCanceled = false;

  // Variables to find the last note for cleanup
  let maxEndTime = -1;
  let maxIndex = -1;

  // Build noteEvents from midiNotes
  for (let i = 0; i < midiNotes.length; i++) {
    const midiNote = midiNotes[i];
    const note = midiNote.number; // The note number
    const originalOpts = midiNote.options;
    const opts = Object.assign({}, originalOpts); // Make a shallow copy of the options

    // Adjust time and duration based on speed
    opts.duration = parseFloat(opts.duration) / speed; // Adjust duration for speed
    opts.time = parseFloat(opts.time) / speed;         // Adjust time for speed

    const absoluteStartTime = playbackStartTime + opts.time; // Absolute start time in ms
    const duration = opts.duration;
    const endTime = absoluteStartTime + duration;

    if (endTime > maxEndTime) {
      maxEndTime = endTime;
      maxIndex = noteEvents.length;
    }

    // Prepare noteEvent
    noteEvents.push({
      noteIndex: midiNote.scoreNote.index,
      hand: midiNote.scoreNote.hand,
      note: note,
      startTime: absoluteStartTime,
      duration: duration,
      endTime: endTime,
      opts: {
        ...opts,
        time: absoluteStartTime // Set the absolute time in options
      },
      scheduled: false,
      finalNoteCleanup: false,
      useSynth: (midiOutput === null || preferences.synthLocalEcho)
    });
  }

  if (maxIndex >= 0) {
    noteEvents[maxIndex].finalNoteCleanup = true;
  }

  // Sort noteEvents by startTime
  noteEvents.sort((a, b) => a.startTime - b.startTime);

  if (debugPlayingNotes) console.log("Total note events to play:", noteEvents.length);

  // Start scheduling notes
  scheduleNextNotes();
}

/////////////////// END OF Note Playing Code /////////////////////


function getToday() {
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  let dd = String(today.getDate()).padStart(2, '0');
  let formattedDate = `${yyyy}-${mm}-${dd}`;
  return formattedDate;
}

// MOVED TO import-export.js: function exportBackupFile()
// MOVED TO import-export.js: function toggleAdvancedImportExport()


let currentHistoryDisplayGraph = true;

function toggleGraphRawData() {
  const button = document.getElementById("toggleGraphRawData");
  const graphdiv = document.getElementById("historyGraphDiv");
  const datadiv = document.getElementById("historyRawDataDiv");

  if (currentHistoryDisplayGraph) {
    button.innerHTML = "Show Graph";
    graphdiv.style.display= "none";
    datadiv.style.display= "block";
  } else {
    button.innerHTML = "Show Raw Data";
    graphdiv.style.display= "block";
    datadiv.style.display= "none";
    showHistory();
  }
  currentHistoryDisplayGraph = !currentHistoryDisplayGraph;
}

/// Metronome feature code and data
const metronomeTickBase64 = `AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAHRltZGF0IRFFABRQAUb/8QpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpd/+IUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0uYQpaWlpaXghGxOjDoyMEbBQYhQIkBRElVrmqqURVNZqmSUGsnKXQEPQKUtn4oSzNXbdXJ5WynHAaT/b5jvfcW6Y14bvcOjMLc+PcDCK6QekAI3eNYfeO3TmC/YJjDLdOI3A+RPxrHuIgU9qw8PcQpnPwGD48sAI/b/f3w4AoGcS0aQ+QB4EbESMBYajEYKakRiqpKlKtmq1koKprJylwR/0ClLZ8U+555r2eMnl6d4FEVn3Hh6SjGEADt2AA93zvI7uj/wBt4GHpEUld7aQA/k5hcIjONTjgnZVkb5QEIsIAXUKUX+Lxdlk2e/j030Cc/KiwarYrGq69mvt7/RvXX8Zrc1jVWAA+NQ25qflEN/+IUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0u8GEKWlpaWlpaWlpaWlpaWlpaWlpaXBwAAAAIJEAAAAB1nQgQf6QCgC3f+AAIAAoEAAAMAAQAAAwA8jwiEagAAAARozjyAAAAKmmWIhABf///h4SKAAItvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrwISsT+w7+BwgYRpnG9FTea5u5u+dS7ZeXvhTv4BEY2Wwx4oYd5D9S6w4wzR8JlOa/hNnc23UHnDkfMfbmBh648f4hDZ/DmqtxZmV+SKnE5PeYf8nlcH2u4kXxn6/8nylWo/63nGUbA/qel3/5GZhSYL2CoxfU8oZgyx/4d6+J/b+hs6E+YxTZjsdMbc8/DXQGTw/CRQ5zFQgodKA7dF+f+55Q2J3hsyYNccwtq3ANiq7MJEufLtDxLyTsj0fuu7AcAoYHEOnejmUE/SRenP/VBgv/fG9LD+3/8x4fONed4624LkMOZklmD/X2ePqr/RviePbHv/z1B8ftXl/meku7NzsH3/N/OHG/3P+nsq+PsePwar6gdUmioMnr2QDZwyGHsD929WThac20AUgsLttkBo6U8h5D9BmC2P2ncmFaRusP4fi/8HjOYP3Fwc6+n8VZH3IoxRoSJFCOOWcrisJEpSR9McjsjDfkRPmMFgfkacgALpmPtEMyIAf0FSLwCBEq75l1UmYVxu8ri6rnz49uXEzoA8+HJpONonoJN1uas2bINt/u1YC4s3BCcqCuTrTf93h8X3/PX6j9Z+s9f3dRATj3/8/WVbGkwa8swjkmz6DiHD8rh90eP39tuuTxcDw+oB9L7gaEmvfvf1K3AfO7iz5pPsvtv+BLhHRmDjTBAfY25WA+ctMn1dO1zf/wbfK/YlYDshdE/y+GO/xdUVZRNvqlLoA+dj4AMYrwuo08DtAsB7ouSnM+fwZXFG7RTn2zVf/5jwvOG69l9Dd3+d/0PD/aHPG99Sin93zfTcHWz5aBgjDPmQA8xwdONHFkqVoC5s8ba3JvXAg2aXufC4u/yZD/e80Zm+0fdOsXGOWAAAAWaOOBiBgdkYYh3AQCebfs/gFSNzm/z5ZgiRIkYIhYHTE7hJhF4P9TrMfoEwNCQ4IIUAQdJ1QsAcAhTcb1424fdt/0IhqWaakHfYO+xIK+zIJpzXxzqb5965fHWr5+f7+b3+K83xXj/0/9u+/1711fA7y/Xc2wGcM77hqfeYdnTqi+wCv/qD4pNqCnekpF1bmLkLD+t3Xs/5pz7DLegZ1gz0xDsw9s7vapeif/H4aHpg+SZ/aT1+Ow7jAviTV9EsothZPtsec9wfr+0Kx//4Hwv67Uv9/pqVAfY97fVPFMkUZ9UqQH/hrT2/cen6BhbTxZTyxy7oMdUfHkDcABmK3QZG/Ce5dU2zUQfvege054+n5ZvNU//HZbfsX9vqL8RmrMfwnKmFUMCxg9kO9kbrkzz0JTvY2Hcem1kE2iQsvFtk6i4lf87AvVhJCE06GnDHW5dS02/Uorc7v5g9q1CJSk2PpuYs+W0650BKwVGjWKPzCh1Tk9zVVsWDPmbXRHqVzCf4THEH9inMVVzcgSnGOemlk4kyLS/TuKfolAhdcNfRoCqLDNQDl7P3NrSTIO5Ttg77B32DQ3xRkiQTRzL1M5r9PaXXEn7clSa1fj36lfHd+WkUNnAAyBG9HHPTVgK1VePHopqiKTxuC+evaH0VIn7MZi7X0LbLZic09WA4LKtHzLtEH2j3DLMZyrx864xkPkOyM1MFsqcYtn5bcl5fCdYZYtq+FR1jcg6zc/wvkZkIpaj9m+LWxfFtzBo8+AAFgPIgAHwFINZo4WxGJ/lfuzqD+5nmswxloz7hVEhSWsfn5fB0NlnR86DlwufeNrb7f/V2kKzgbH7qspcDFjfw+hMvc18+yJ1Xo3JP9O6AR7Rnlf/95i58w1EGpTpXNcdVMHPr+iq0Ad/d50g+8F1OKF60sUTDyei387bhWFWDMTqwYN5NTmnAtV5F/z8ox80UziSwikiHNOZtE3EM9HYxLZCNac3luwOgk0Ytl6NhU59rf9s+9+99x7QqqoTCOqMwsRFdnyO5e/FzyesBwQgBwAAAACCTAAAAAIQZoiAZ4AOEYhexRVLtdIgoEErmr13u9d+/iedeUzmr44y8SXd1PumGshWgMTvGWdlxM7cZ19uo6SxWSzroW1Vra8bgX2RsOclYT8D9vk8H2CkmLEWp0odAdc2VX8hmt8oXU2dRUhrfLk3vmm+ME6BpiyvPIjxo7MPTX2mP3Y5Y0i15zIGLQZpPFJwvNMxVOoGEu3+KtxujzjK8zJYbPcxZJROyEjhJGvTtPHAPsFNVODYOmjHqkLqbBhqsehPz8V52iHyhW9PgTNNrzVjt+LoNjMmXTZ+S7XHgFFVnF0z3VM8fb2GcoXDmNVydNL/wl5k+YWkFTjw6fypYAzgupTt3JvNWHA1nt7vze9nRlhWkmSk+oUFo5OnvEtM4N+l1Y9SRfAqr4mt/E1ywNBE5fATJXQRJBSqWXzHblFlsCLVdip8CsJBYYJeF8Pzrjx6yav2qPEnHFXhNNVbWVLI4AAKAl5f3YkiK7BHbjtxaN697vLkTrfqDkp0tnFsiDxj0He6sqkQ5BRYOyloB/B1T2LrvJnOAjmZRCDctZxXlei2e3BqA4ookUkeZOQPEU16EEvAMvKLZTZlrHYOx+XqGecdrkMNAW03b7lomJiONrIOPiejcHxvpVSgRGe6azpdhqZUZsejyGgvbSvfhCQuVDF9b4ydnbpDPNyL9FSXjuJSL6C2Ft47uN0LMIbR9ZGFGAAAdH1aMu1y3hTj1VSYL19XkqQArsoT3+z6gGHhtHA0CkrfToOm7hjEjAHAAAAAgkwAAAACEGaRAGeADhGIRsULS7FRrHRbOoQMIyqXuVm/4r286TNtamaZdcRH7qB5o8xMf018utRlPllboKCPvcFkeqVHWtYalv5/9zdAtDxoh2mRg5DcKsQYwfyuU8spXSZpYKTVcrrEb3z7HA5qvuorfL7kf9CWgPvSfcO0OP9jXaWMtZY1kkgr1a2eZgRG2D5HVym9Bbc6eqfnWdwQ2vcUs55UALOtc/1TnN4itVlkuKMuikRTNpbK7k0mTdHqrurR3jSCO39ZDpeRoxEOX1RzjRyTtj24wyjbNMyEXC5haIxZN+MQStleAABmRJ6nml5islXNMAyeBAFSU1fl5wECcAe3Q5pAaIHIuooLEnJoKZcIsAawFAAAxMY8Tg0OFUmGbjIdBj4nXJfDH0b/96wJQ/LcvClhKRFIIZUWYQ0pw0Jw0GSgUiBvj1d5z+nPxr2MzOOJS8alS6/yUOx2gz2/w7NJ4OlgaGg+sM9ZyKouGpgdYlHXlTdrAa8f7rk8NPUZ8zVDZpLpFv5zC6FpFMeifRB+q7R3d3dB9Qm7t/W69P45bFEivPzSnPbt9UuSfmmrTeVWKE1DB8czMWp+ckZTwM/2LvPW/Cv7Hm18BfcBgjwcToBfwVlXTf3LvhaTOvb9saSVaXlKMdzfAxQZ/7tL+z31IoKGyn7zt8l5ndQbk+iq2Gc/RfaPifs3rIA6vpt2y+nA3cTQBXL4e0npMwDQ9x5HquvN+L0PWOJepryVsnPAAueE3lgF3ZV+5k3K7euBAMJkMRNMAMHIRsP5bv//wBC1SEqFiiEhiNBGVJuXXj3nV3bO7mrXlStSrLBeNZYgpJEkDoFEIhJe84kcfQSq+Ysk/yfCTT1EF/z/04DsG3+u23b4B7/ygUHD8wf8r3TgW7DSLHnWscbyreOrprA85/wmF0dunLOmuHM3jEPY9oo1L5Tndyxw+Y1z9Bcn3hlkGGUQ+UgiXEdGJopJF2mDTVONgy7idGpbGUzJm3rZJq2cJaoZq2e5qbUmqClG4O17mptWaR7mhhqa2cgnAGqWoRzBY7uf6f8xVGA3Z/v/nL2UJIVNtSG7p2kd8wGgMtt+DFZOnalKOkjoIE0kwC8VNM4snkcxIKmnqIlCDCMrAjxXVdWi/qxWh44YrHBTKwu8FZxqvJWaq8FZxCyMIPkUgOYLIwiuRW7w7Fp8FYUDYiDYtCNzOuYc/bf3tNc704tMq1xEdBeNZYgpJEkDoFSkiqubMolrhoSv6er4S0tDHKOuyLsjCxNUDGs9CNEwDNQ/QujaQYiUl3e7FRcCaChgazW4U890aDiQCc7Nr/gDn/pZ/NwUSGhiCtJGEBnyQyVPHnTZ2G9c0MgiZJBVTtiQv+OVJbtRALIIIbTSYnNXgnbKvAeGtGBcm9Y7SuJU0c5LpUea4oLh+T2tUeF7KKhA45sf3+nu4m5OAgA1rud8SQwQLNmoEEjt6/zY+P55ogoADF8XpjTBSw2BSGRnBcplo2LLIwiuRSA9QsjCK5FID1MqZcmzuozrnzkyvqyplumztnzrnskyvqyaW6bO2fN57JMr5cmluoztnzfKyrK+XJs7qM657HysqyplyuoVTFvVww79lFTq+cPNzwj7P30JJsox7XTl/dxRRRRcAAAAAIJMAAAAAhBmmYBngA4RiEbD8GEP///t9phqDEIQYQKK55zJ53q8XRM1jWVhMJ6IAHigUJSbWCk9AJDDXYaBHk4n5MiQE/Dl4n4HgnW3ouhPz258s1DcXKp2tKfi6ZOLVYYlVJY7bJYnLJSHi2UeplFswFBMI7OAubdN1tVJYvktUd7g2HHi4L82DfarxVgmqSPb5tspJLOoXSUz4X0YWTVy421YxJSkh0VrMIAAA42qGEJQhEhA3VVvK7nTjKp7SkxrJg2AeFAoSk1pGfdswCyrBfmYo7xz/d5g/FeS9Af0uf8RkBTOFR1mSTLm3TdrlS73taWsqoYrRYlmEgUi80NlItnBfZQjUWLbJoV2TvR+22NxxzUhk8+Vrnytc8zv25Vc5syaOfLnzc25xrnytADBwAABi5tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAApwABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAACS3RyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAhgAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAFAAAAAtAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAIYAAAAAAAEAAAAAAcNtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAADwAAAAIAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAFubWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABLnN0YmwAAACac3RzZAAAAAAAAAABAAAAimF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAFAALQAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAA0YXZjQwFCBB//4QAdZ0IEH+kAoAt3/gACAAKBAAADAAEAAAMAPI8IhGoBAARozjyAAAAAGHN0dHMAAAAAAAAAAQAAAAQAAAIAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAArNAAAAEgAAABIAAAASAAAAIHN0Y28AAAAAAAAABAAABIoAABT2AAAXOgAAHAwAAAJ2dHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAgAAAAAAAACnAAAAAAAAAAAAAAABAQAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAJGVkdHMAAAAcZWxzdAAAAAAAAAABAAAAeAAACAAAAQAAAAAB7m1kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAArEQAABzBVcQAAAAAAC1oZGxyAAAAAAAAAABzb3VuAAAAAAAAAAAAAAAAU291bmRIYW5kbGVyAAAAAZltaW5mAAAAEHNtaGQAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAV1zdGJsAAAAZ3N0c2QAAAAAAAAAAQAAAFdtcDRhAAAAAAAAAAEAAAAAAAAAAAACABAAAAAArEQAAAAAADNlc2RzAAAAAAOAgIAiAAIABICAgBRAFQAAAAADYVQAA2FUBYCAgAISEAaAgIABAgAAACBzdHRzAAAAAAAAAAIAAAAHAAAEAAAAAAEAAADBAAAAQHN0c2MAAAAAAAAABAAAAAEAAAACAAAAAQAAAAMAAAABAAAAAQAAAAQAAAACAAAAAQAAAAUAAAABAAAAAQAAADRzdHN6AAAAAAAAAAAAAAAIAAACLQAAAi0AAALJAAAC1gAAAjIAAAI9AAACgwAAASMAAAAkc3RjbwAAAAAAAAAFAAAAMAAAD1cAABUIAAAXTAAAHB4AAAAac2dwZAEAAAByb2xsAAAAAgAAAAH//wAAABxzYmdwAAAAAHJvbGwAAAABAAAACAAAAAEAAAD5dWR0YQAAAPFtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAMRpbHN0AAAALal0b28AAAAlZGF0YQAAAAEAAAAAaHR0cHM6Ly9jbGlwY2hhbXAuY29tAAAAj6ljbXQAAACHZGF0YQAAAAEAAAAAQ3JlYXRlIHZpZGVvcyB3aXRoIGh0dHBzOi8vY2xpcGNoYW1wLmNvbS9lbi92aWRlby1lZGl0b3IgLSBmcmVlIG9ubGluZSB2aWRlbyBlZGl0b3IsIHZpZGVvIGNvbXByZXNzb3IsIHZpZGVvIGNvbnZlcnRlci4=`;


function metronomeIconSVG(small=false) {
  if (small) {
    return `<svg version="1.1" id="small_Metronome" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 11 11" style="enable-background:new 0 0 314 314;" xml:space="preserve" width="11" height="11"><path d="M9.874 1.634a0.251 0.251 0 0 0 -0.122 -0.168l-0.394 -0.22 0.185 -0.333a0.245 0.245 0 1 0 -0.428 -0.239l-0.185 0.333 -0.394 -0.22a0.245 0.245 0 0 0 -0.351 0.134L7.7 2.326a0.244 0.244 0 0 0 0.112 0.294l0.166 0.093 -0.81 1.454L6.466 0.599A0.762 0.762 0 0 0 5.737 0H3.774a0.762 0.762 0 0 0 -0.729 0.6l-1.43 7.263v0.001l-0.481 2.443c-0.035 0.178 0.007 0.355 0.115 0.486s0.274 0.207 0.455 0.207h6.103c0.181 0 0.346 -0.075 0.455 -0.207s0.151 -0.309 0.115 -0.486l-0.481 -2.443 -0.581 -2.95L8.407 2.953l0.166 0.093a0.244 0.244 0 0 0 0.309 -0.059l0.941 -1.151a0.251 0.251 0 0 0 0.051 -0.201M3.526 0.694a0.275 0.275 0 0 1 0.247 -0.204h1.964c0.108 0 0.227 0.097 0.247 0.204l0.815 4.136 -1.054 1.894a2.357 2.357 0 0 0 -0.744 -0.188v-0.522h0.384a0.245 0.245 0 1 0 0 -0.49h-0.384V4.079h0.384a0.245 0.245 0 1 0 0 -0.49h-0.384V2.145h0.384a0.245 0.245 0 1 0 0 -0.49h-0.384v-0.431a0.245 0.245 0 1 0 -0.49 0v0.431h-0.384a0.245 0.245 0 1 0 0 0.49h0.384v1.444h-0.384a0.245 0.245 0 1 0 0 0.49h0.384V5.524h-0.384a0.245 0.245 0 1 0 0 0.49h0.384v0.522c-0.681 0.062 -1.127 0.375 -1.527 0.654 -0.277 0.194 -0.525 0.368 -0.824 0.441zm4.357 9.787c-0.015 0.019 -0.042 0.028 -0.076 0.028H1.705c-0.034 0 -0.061 -0.01 -0.076 -0.028s-0.02 -0.047 -0.013 -0.08l0.444 -2.255c0.496 -0.056 0.856 -0.309 1.207 -0.554 0.423 -0.296 0.822 -0.576 1.49 -0.576s1.067 0.28 1.49 0.576c0.35 0.246 0.712 0.498 1.207 0.554l0.444 2.255q0.009 0.052 -0.013 0.08M7.35 7.629c-0.299 -0.073 -0.548 -0.247 -0.824 -0.441a7.857 7.857 0 0 0 -0.349 -0.236l0.768 -1.379zm1.282 -5.113 -0.402 -0.224 0.321 -0.934 0.706 0.393z"/></svg>
    `;
  } else {
    return `<svg version="1.1" id="large_Metronome" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 40 40" style="enable-background:new 0 0 314 314;" xml:space="preserve" width="40" height="40"><path d="M35.905 5.94a0.892 0.892 0 0 0 -0.442 -0.612l-1.434 -0.799 0.675 -1.212a0.892 0.892 0 1 0 -1.558 -0.868l-0.675 1.212 -1.434 -0.799a0.892 0.892 0 0 0 -1.277 0.489l-1.759 5.109a0.892 0.892 0 0 0 0.409 1.069l0.604 0.337 -2.945 5.287 -2.555 -12.975C23.274 0.957 22.11 0 20.864 0h-7.14c-1.246 0 -2.41 0.957 -2.651 2.18l-5.2 26.41 -0.001 0.004 -1.749 8.882c-0.127 0.645 0.026 1.291 0.42 1.77 0.394 0.479 0.997 0.754 1.655 0.754h22.19c0.658 0 1.261 -0.275 1.655 -0.754s0.548 -1.124 0.421 -1.77l-1.749 -8.884 0 -0.001 -2.113 -10.729 3.969 -7.127 0.604 0.337a0.891 0.891 0 0 0 1.124 -0.215l3.419 -4.185a0.892 0.892 0 0 0 0.185 -0.731M12.823 2.524c0.076 -0.388 0.506 -0.741 0.901 -0.741h7.14c0.395 0 0.825 0.353 0.901 0.741l2.962 15.041L20.892 24.45c-0.786 -0.337 -1.671 -0.589 -2.706 -0.683v-1.901h1.396a0.892 0.892 0 1 0 0 -1.783h-1.396v-5.25h1.396a0.892 0.892 0 1 0 0 -1.783h-1.396v-5.25h1.396a0.892 0.892 0 1 0 0 -1.783h-1.396V4.451a0.892 0.892 0 1 0 -1.783 0v1.566h-1.396a0.892 0.892 0 1 0 0 1.783h1.396v5.25h-1.396a0.892 0.892 0 1 0 0 1.783h1.396v5.25h-1.396a0.892 0.892 0 1 0 0 1.783h1.396v1.901c-2.477 0.225 -4.101 1.362 -5.55 2.378 -1.006 0.705 -1.908 1.337 -2.996 1.602zm15.844 35.589c-0.055 0.067 -0.154 0.104 -0.278 0.104H6.199c-0.124 0 -0.223 -0.037 -0.278 -0.104s-0.072 -0.171 -0.048 -0.293l1.615 -8.2c1.802 -0.203 3.115 -1.122 4.389 -2.015 1.536 -1.077 2.987 -2.095 5.417 -2.095s3.881 1.017 5.417 2.095c1.274 0.894 2.587 1.812 4.389 2.015l1.615 8.2c0.024 0.122 0.007 0.226 -0.048 0.293m-1.936 -10.367c-1.089 -0.265 -1.991 -0.896 -2.996 -1.602 -0.404 -0.284 -0.822 -0.577 -1.269 -0.857l2.793 -5.015zm4.661 -18.596 -1.462 -0.814 1.169 -3.396 2.565 1.429z"/></svg>
    `;
  }
}

// MOVED TO audio.js: audioContext, gainNode, audioBuffer initialization
// MOVED TO audio.js: function setMetroBPM(value, absolute=false)
// MOVED TO audio.js: function loadAudioBuffer()
// MOVED TO audio.js: function scheduleTick(time)
// MOVED TO audio.js: function flashMetronome(flashColor)
// MOVED TO audio.js: function playTick()
// MOVED TO audio.js: function startMetronome()
// MOVED TO audio.js: function stopMetronome()
// MOVED TO audio.js: function updateMetronome()
// MOVED TO audio.js: function drawMetronomeIndicators()
// MOVED TO audio.js: function cycleSmartMetronome()
// MOVED TO audio.js: function cycleMetroBeat()
// MOVED TO audio.js: function updateSmartMetronome()
// MOVED TO audio.js: function adjustMetroVolume()

function toggleLearningScheduleMenu() {
    var menu = document.getElementById('learningScheduleMenu');
    if (menu.style.display === 'none') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

function updateLearningSchedule(schedule) {
    console.log("Schedule updated to:", schedule);
    // Here you would typically update some data or call a server-side API
    document.getElementById('learningScheduleMenu').style.display = 'none'; // hide menu after selection
    setLearningSchedule(schedule, true);
}

function setLearningSchedule(schedule, isnew = false) {

  if (isnew) {
    testOptions.learningSchedule = schedule;
    runHistory[".PREF.LEARNINGSCHEDULE."+stripPresetModifiers(curPresetName)] = schedule;
    saveRunHistory();
  }

  const icondiv = document.getElementById("learningScheduleDiv");
  if (schedule === "" || schedule === null) {
    //console.log("empty schedule, set to begin");
    schedule = "begin";
  }
  //console.log("Setting LearningSchedule for /"+avail(schedule, "begin")+"/ to icon: /"+learningScheduleIconName[schedule]+"/");
  icondiv.innerHTML = `<i id=learningScheduleIcon class="${learningScheduleIconName[schedule]}" style=font-size:18px aria-hidden="true"></i>`;
}

// MOVED TO ui.js: function busyIndicator(show)
// MOVED TO ui.js: function updateBusyIndicator()

//
// Experimental code to detect chord names and display them near the keyboard
//

/**
 * Convert a MIDI note number (e.g. 60) into a pitch class (0-11).
 * 0 = C, 1 = C#, 2 = D, ... 11 = B
 */
function midiToPitchClass(midiNote) {
  return midiNote % 12;
}

/**
 * A helper to name pitch classes. Feel free to change # to b or vice versa.
 */
const PITCH_CLASS_NAMES = [
  "C",  // 0
  "C#", // 1
  "D",  // 2
  "D#", // 3
  "E",  // 4
  "F",  // 5
  "F#", // 6
  "G",  // 7
  "G#", // 8
  "A",  // 9
  "A#", // 10
  "B"   // 11
];

/**
 * Each chord definition:
 *   intervals: an array of semitones from the root (0 is always the root).
 *   name: the string to insert after the root note (e.g. "maj", "min7", etc.)
 *
 * You can expand or customize these definitions based on the chords you want.
 */
const CHORD_DEFINITIONS = [
  // Triads
  { name: "maj", intervals: [0, 4, 7] },
  { name: "min", intervals: [0, 3, 7] },
  { name: "sus2", intervals: [0, 2, 7] },
  { name: "sus4", intervals: [0, 5, 7] },
  // 7ths
  { name: "maj7", intervals: [0, 4, 7, 11] },
  { name: "7", intervals: [0, 4, 7, 10] },      // Dom7
  { name: "min7", intervals: [0, 3, 7, 10] },
  // 9th (here just an example: 1-3-5-b7-9)
  // For full detection, you might handle 5 notes carefully.
  // Simplistic approach: if chord has the intervals for a Dom7 plus a 2 or 14 => "9"
  {
    name: "9",
    intervals: [0, 2, 4, 7, 10], // 2 is the 9, also can check 14 mod 12 => 2
    optional: true // We'll treat the 5th as optional or more flexible as needed
  }
];

/**
 * Given a set of pitch classes (distinct, sorted), check if they match
 * one of the chord definitions. We allow some chord intervals to be "optional"
 * if you want to be more flexible (especially for 9ths).
 */
function matchChordType(sortedIntervals) {
  // For each chord definition, see if the pitch-class intervals match.
  // This is a simplified approach that tries the entire set or subset match.
  for (let chordDef of CHORD_DEFINITIONS) {
    if (matchesTemplate(sortedIntervals, chordDef)) {
      return chordDef.name;
    }
  }
  return null;
}

/**
 * Check if the sortedIntervals match the chordDef intervals.
 * If chordDef has an "optional" property, you can tweak the logic to be more flexible.
 */
function matchesTemplate(sortedIntervals, chordDef) {
  let intervalsNeeded = new Set(chordDef.intervals);
  // If you want to allow missing the 5th or other chord tones, you can do so here
  // For a simple match, we require exact sets or 'intervalsNeeded' as a subset.

  // Quick check: if chordDef has more intervals than sortedIntervals, can't match
  if (chordDef.intervals.length > sortedIntervals.length) {
    return false;
  }

  // Check that all intervals in chordDef are in sortedIntervals
  for (let interval of chordDef.intervals) {
    if (!sortedIntervals.includes(interval)) {
      return false;
    }
  }

  // For a simpler approach, we also require that all intervals in `sortedIntervals`
  // are in chordDef. (So no extraneous notes beyond definition)
  // But if you want to allow extra tensions, you can remove this.
  for (let i of sortedIntervals) {
    if (!intervalsNeeded.has(i)) {
      return false;
    }
  }

  return true;
}

/**
 * Compute the ascending intervals (mod 12) from a root pitch class
 * to all other pitch classes in `pitchClasses`.
 */
function getIntervalsFromRoot(root, pitchClasses) {
  return pitchClasses.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);
}

/**
 * Detect chord name from a list of MIDI note numbers.
 *
 * @param {number[]} midiNotes - e.g. [60, 64, 67]
 * @return {string} chordName   - e.g. "Cmaj", "Cmaj7/E", or "" if no chord
 */
function detectChord(midiNotes) {
  if (!midiNotes || midiNotes.length === 0) return "";

  // 1. Convert to pitch classes, remove duplicates
  let pitchClasses = [...new Set(midiNotes.map(midiToPitchClass))];

  // 2. If fewer than 3 distinct pitch classes, not a chord in your context
  if (pitchClasses.length < 3) return "";

  // 3. Sort the original notes so we know the absolute lowest note
  //    (for slash chord or inversion detection)
  let sortedMidi = [...midiNotes].sort((a, b) => a - b);
  let lowestMidi = sortedMidi[0];
  let lowestPitchClass = midiToPitchClass(lowestMidi);

  // We'll store potential chord matches here, in case there's more than one guess
  let chordMatches = [];

  // 4. Try each pitch class as potential root
  for (let pc of pitchClasses) {
    // Compute intervals from pc to the others
    let intervals = getIntervalsFromRoot(pc, pitchClasses);

    // Attempt to match a chord type
    let chordType = matchChordType(intervals);
    if (chordType) {
      // We found a chord whose root is `pc`
      chordMatches.push({ root: pc, type: chordType });
    }
  }

  // If no chord found, return ""
  if (chordMatches.length === 0) {
    return "";
  }

  // 5. For now, just pick the *first* matched chord. You could decide
  //    heuristics to prefer certain chord definitions over others.
  let chosenChord = chordMatches[0];
  let rootPC = chosenChord.root;
  let chordType = chosenChord.type;

  // 6. Figure out if we have a slash or inversion
  // Identify the chord tones in that chord
  // (We can get them by computing intervals from root, then see which pitch classes match)
  let intervalsFromRoot = getIntervalsFromRoot(rootPC, pitchClasses);
  // In sorted order, the chord’s pitch classes from the root’s perspective
  let chordTonesPC = intervalsFromRoot.map(i => (rootPC + i) % 12);

  // The label for the root
  let rootName = PITCH_CLASS_NAMES[rootPC];

  // The lowest pitch-class note
  // Decide if it's the root, a chord tone (for inversion?), or something else
  let bassIsChordToneIndex = chordTonesPC.indexOf(lowestPitchClass);

  // We’ll store an inversion or slash string. In triads, we typically have (Ia), (Ib), (Ic).
  // In seventh chords, we can have (Ia), (Ib), (Ic), (Id).
  // If the bass note is not a chord tone, we do slash notation: e.g. Cmaj/B.
  let inversionOrSlash = "";

  // For simplicity, let's see if the chord has 3 or 4 main notes:
  let isSeventhChord = chordType.includes("7") || chordType.includes("9");

  if (bassIsChordToneIndex === -1) {
    // Bass is not in chord tones -> slash chord
    let bassName = PITCH_CLASS_NAMES[lowestPitchClass];
    inversionOrSlash = `/${bassName}`;
  } else {
    // It's an inversion. We'll say:
    // Triads: 0 -> (Ia), 1 -> (Ib), 2 -> (Ic)
    // 7th chords: 0 -> (Ia), 1 -> (Ib), 2 -> (Ic), 3 -> (Id)
    let inversionIndex = bassIsChordToneIndex; // which chord tone is in the bass
    let inversionSymbols = isSeventhChord
      ? ["(Ia)", "(Ib)", "(Ic)", "(Id)"]
      : ["(Ia)", "(Ib)", "(Ic)"];

    if (inversionIndex > 0 && inversionIndex < inversionSymbols.length) {
      inversionOrSlash = ` ${inversionSymbols[inversionIndex]}`;
    }
    // For your special corner case, if the left hand is just a single note E
    // while the right hand is root position, you might want "Cmaj/E (Ia)".
    // That requires extra checks to see how many chord tones are in the “upper cluster”
    // vs. the single left-hand note. You can expand logic here if needed.
  }

  // 7. Construct the final chord name
  let finalChordName = rootName + chordType + inversionOrSlash;
  return finalChordName;
}



// End of chord detection code


function repianoAbout() {
  alert("REPiano is an experimental piano practice management program.\n"+
  "It can track your performance on practice routines and display\n"+
  "statistics to help you improve. It understands MIDI output from\n"+
  "electric keyboards to score your practice runs and show detailed\n"+
  "graphs of your performance. It can generate scales and arpeggios\n"+
  "automatically, guide you using voice output, generate metronome\n"+
  "clicks and track time spent onitems you practice outside of REPiano\n"+
  "(Free Play). It stores your practice history on the local device\n"+
  "but you can export the file for backup purposes.\n\n"+
  "Currently, repertoire items are hard coded, for further\n"+
  "study is integrating an input library, and many other improvements.\n"+
  "\nCopyright (C) 2024,2025 J. Stephen Pendergrast.");
}
