"use strict";

// Scales module - generates scales and arpeggios for practice

function showScaleArpWizard() {
  const popupContainer = document.getElementById('scaleArpWizardContainer');
  popupContainer.style.display = 'block';
}

function dismissScaleArpWizard() {
  const popupContainer = document.getElementById('scaleArpWizardContainer');
  popupContainer.style.display = 'none';
}

function generateTest() {
  const testType = document.getElementById('test-type').value;
  const tonic = document.getElementById('tonic').value;
  const mode = document.getElementById('mode').value;
  const octaves = document.getElementById('octaves').value;
  const lhStartOctave = document.getElementById('lh-start-octave').value;

  let modename = mode;
  if (testType === 'Arpeggio') {
    modename += "Arp";
  }
  console.log("Modename:"+modename);

  // Call your generateTestNotes function here with the retrieved values
  const tmp = presets.length;

  const p = generateScalePreset(tonic, modename, parseInt(octaves), parseInt(lhStartOctave));

  if (p === null) {
    // generate failed.
    alert("Not able to generate that arpeggio yet: try Major or Minor");
    return;
  }
  presets.push(p);
  let option = document.createElement('option');
  option.value = tmp;
  option.innerHTML = presets[tmp].name;
  option.style.fontSize = "16px";
  //presetMenu.appendChild(option);
  option.selected = true;

  handlePresetSelection(tmp);

  dismissScaleArpWizard();
}

function generateScalePreset(noteName, scaleType, numOctaves, lhOctave,
                                name = null, metrics = null, dur = [[1/4],[1/4]]) {

  const scaleIntervals = {
    maj: [0, 2, 4, 5, 7, 9, 11, 12],
    natMin: [0, 2, 3, 5, 7, 8, 10, 12],
    harMin: [0, 2, 3, 5, 7, 8, 11, 12],
    melMin: [0, 2, 3, 5, 7, 9, 11, 12], // we have to hack the fact that descending goes back to natMin
    melMinJ: [0, 2, 3, 5, 7, 9, 11, 12], // Jazz version of melodic minor doesn't change on descending
    chroma: [0,1,2,3,4,5,6,7,8,9,10,11,12],
    mixoBlues: [0, 2, 3, 4, 5, 6, 7, 9, 10, 12],
    majArp: [0,4,7],
    natMinArp: [0,3,7],
    majBlues: [0, 2, 3, 4, 7, 9, 12],
    minBlues: [0, 3, 5, 6, 7, 10, 12],
    majPent: [0, 2, 4, 7, 9, 12],
    minPent: [0, 3, 5, 7, 10, 12],
    dor: [0, 2, 3, 5, 7, 9, 10, 12],
    lyd: [0, 2, 4, 6, 7, 9, 11, 12],
    mixolyd: [0, 2, 4, 5, 7, 9, 10, 12],
    phryg: [0, 1, 3, 5, 7, 8, 10, 12],
    loc: [0, 1, 3, 5, 6, 8, 10, 12],
    aeo: [0, 2, 3, 5, 7, 8, 10, 12],
  };

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const fingerings = new Object();

  // The "standard" fingering applies to many different scales
  fingerings["C maj"] =
    fingerings["D maj"] =
    fingerings["E maj"] =
    fingerings["G maj"] =
    fingerings["A maj"] =
    fingerings["A natMin"] =
    fingerings["C natMin"] =
    fingerings["G natMin"] =
    fingerings["D natMin"] =
    fingerings["E natMin"] =
    fingerings["A harMin"] =
    fingerings["E harMin"] =
    fingerings["D harMin"] =
    fingerings["C harMin"] =
    fingerings["G harMin"] =
      [
        { start: [5,4,3,2,1], oct: [3,2,1,4,3,2,1], end: [3,2,1] },
        { start: [1,2,3], oct: [1,2,3,4,1,2,3], end: [1,2,3,4,5] }
      ];


  fingerings["B maj"] =
    fingerings["B natMin"] =
    [
      { start: [4,3,2,1], oct: [4,3,2,1,3,2,1], end: [4,3,2,1] },
      { start: [1,2,3], oct: [1,2,3,4,1,2,3], end: [1,2,3,4,5] }
    ];

  fingerings["C mixoBlues"] =
    fingerings["B natMin"] =
    [
      { start: [1,2,3,1,2,3], oct: [1,2,3,1,2,3,1,2,3], end: [1,2,3,4] },
      { start: [3,2,1,3,2,1], oct: [3,2,1,3,2,1,3,2,1], end: [3,2,1,3] }
    ];

    fingerings["C blues"] =
    [
      {start:[1,1,1,1,1,1], oct:[], end:[]},
      { start: [1,3,1,3,1,3], oct:[1,3,1,3,1,3], end:[4] }
    ]

  const label = name?name:`${noteName} ${scaleType} Scale (${numOctaves} Oct)`;
  let menuName = label.replace(/ \(\d+ Oct\)/g, '');
  menuName = menuName.replace(/Arp Scale$/g, ' Arpeggio');

  const typeMap = {
    "maj": "major scale",
    "natMin": "minor scale",
    "harMin": "harmonic minor scale",
    "melMin": "melodic minor scale",
    "majArp":"major arpeggio",
    "natMinArp":"minor arpeggio",
    "chroma":"chromatic scale",
  };

  const fullName = name?name:(pronounceLetter(noteName) + avail(typeMap[scaleType], scaleType) + " " + numOctaves + " octave" +
    ((numOctaves===1)?"":"s"));

  let fingers = fingerings[noteName+" "+scaleType];
  if (typeof fingers === "undefined") {
    fingers = null;
  }

  function pronounceLetter(letter) {
    letter = letter.replace("#", " sharp");
    return letter.slice(0,1)+". "+letter.slice(1);
  }

  const preset = {
    name: label,
    category: 'scaleArp',
    menuValue: -1, // not assigned yet
    menuName: menuName,
    leftHand: [],
    rightHand: [],
    leftFingers: null,
    rightFingers: null,
    metrics: {HTQ: true, MetQ: true, DynQ: true, LegQ: true, StaQ: false},
    fullName: fullName,
    isFreePlay: false,
  };

  if (metrics !== null) {
    preset.metrics = metrics;
  }

  const arpmode = scaleType.includes("Arp");
  //console.log("arpmode="+arpmode);

  if (arpmode) {
    preset.beatsPerBar = 3;
    preset.targetBPM = 180;
  } else {
    preset.beatsPerBar = 4;
    preset.targetBPM = 240;
  }

  // Get the index of the starting note in the noteNames array
  const startNoteIndex = noteNames.indexOf(noteName);

  if (typeof scaleIntervals[scaleType] === "undefined" || scaleIntervals[scaleType] === null) {
    warning("No intervals found for scale type="+scaleType);
    return null;
  }

  // we allow the user to change the octave parameters on the fly using buttons
  // underneath the presets pulldown
  preset.allowOctaveChange = true;
  preset.octaveParams = {
    noteName:noteName,
    scaleType: scaleType,
    lhOctave: lhOctave,
    numOctaves: numOctaves
  };

  // Generate the scale notes for the specified number of octaves

  // first, ascending
  for (let octave = lhOctave; octave <= lhOctave + numOctaves - 1; octave++) {
    for (let i = ((arpmode||(octave===lhOctave))?0:1); i < scaleIntervals[scaleType].length; i++) {
      const noteIndex = (startNoteIndex + scaleIntervals[scaleType][i]);
      const noteNumber = (octave+1) * 12 + noteIndex;
      preset.leftHand.push(noteNumber);
      preset.rightHand.push(noteNumber+12);
    }
  }

  if (arpmode) {
    // arpeggios usually play the tonic one beyond the top octave
    const noteIndex = (startNoteIndex + scaleIntervals[scaleType][0]);
    const noteNumber = (lhOctave+numOctaves+1) * 12 + noteIndex;
    preset.leftHand.push(noteNumber);
    preset.rightHand.push(noteNumber+12);
  }

  // then, descending. In arpeggio mode do not include the very last note
  // because arpeggios are typically practiced by 'cycling' which does not
  // repeat the first note after the end note is played

  // Also, if this is a melodic minor scale, descending substitutes the
  // natural minor. If you don't want that, use melMinJ (Jazz version)

  if (scaleType === 'melMin') {
    scaleType = 'natMin';
  }
  for (let octave = lhOctave+numOctaves-1; octave >= lhOctave; octave--) {
    for (let i = scaleIntervals[scaleType].length-(arpmode?1:2); i >= 0; i--) {
      if (arpmode && octave === lhOctave && i === 0) {
        break; // arpeggios "cycle"
      }
      const noteIndex = (startNoteIndex + scaleIntervals[scaleType][i]);
      const noteNumber = (octave+1) * 12 + noteIndex;
      preset.leftHand.push(noteNumber);
      preset.rightHand.push(noteNumber+12);
    }
  }

  if (fingers) {
    preset.leftFingers = [];
    preset.rightFingers = [];

    // ASCENDING

    // start sequences
    for (let i = 0; i < fingers[0].start.length; i++) {
      preset.leftFingers.push(fingers[0].start[i]);
    }
    for (let i = 0; i < fingers[1].start.length; i++) {
      preset.rightFingers.push(fingers[1].start[i]);
    }

    // extra octaves
    for (let oct = numOctaves-1; oct > 0; oct--) {
      for (let i = 0; i < fingers[0].oct.length; i++) {
        preset.leftFingers.push(fingers[0].oct[i]);
      }
      for (let i = 0; i < fingers[1].oct.length; i++) {
        preset.rightFingers.push(fingers[1].oct[i]);
      }
    }

    // end sequences
    for (let i = 0; i < fingers[0].end.length; i++) {
      preset.leftFingers.push(fingers[0].end[i]);
    }
    for (let i = 0; i < fingers[1].end.length; i++) {
      preset.rightFingers.push(fingers[1].end[i]);
    }

    // DESCENDING

    // end sequences
    for (let i = fingers[0].end.length-2; i >= 0; i--) {
      preset.leftFingers.push(fingers[0].end[i]);
    }
    for (let i = fingers[1].end.length-2; i >= 0; i--) {
      preset.rightFingers.push(fingers[1].end[i]);
    }

    // extra octaves
    for (let oct = numOctaves-1; oct > 0; oct--) {
      for (let i = fingers[0].oct.length-1; i >= 0; i--) {
        preset.leftFingers.push(fingers[0].oct[i]);
      }
      for (let i = fingers[1].oct.length-1; i >= 0; i--) {
        preset.rightFingers.push(fingers[1].oct[i]);
      }
    }

    // start sequences
    for (let i = fingers[0].start.length-1; i >= 0; i--) {
      preset.leftFingers.push(fingers[0].start[i]);
    }
    for (let i = fingers[1].start.length-1; i >= 0; i--) {
      preset.rightFingers.push(fingers[1].start[i]);
    }

  }

  if (dur) {
    preset.rightDur = avail(dur[0], [1/4]);
    preset.leftDur = avail(dur[1], [1/4]);
    preset.beatDur = avail(dur[2], 1/4);
    preset.swingEighths = avail(dur[3], false);
  } else {
    // use defaults
    preset.rightDur = [1/4];
    preset.leftDur = [1/4];
    preset.beatDur = 1/4;
    preset.swingEighths = false;
  }

  //console.log("At end of preset push of "+label);
  return preset;
}
