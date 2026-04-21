"use strict";

// UI module - handles display, animation, and canvas rendering

// Animation functions
function animateOpen(divelement, delay=0) {
  divelement = document.getElementById(divelement);
  if (!divelement) {
    console.error("animateOpen: element not found");
    return;
  }
  setTimeout(function() {
    divelement.style.display = "block";
    divelement.style.transform = "scaleY(0)";
    divelement.style.transformOrigin = "top";
    setTimeout(function() {
      divelement.style.animation = "expandModeDiv 0.5s forwards";
    }, 0);
  },delay);
}

function animateClose(divelement) {
  divelement = document.getElementById(divelement);
  if (!divelement) {
    console.error("animateClose: element not found");
    return;
  }
  divelement.style.animation = "contractModeDiv 0.5s forwards";
  divelement.style.transformOrigin = "top";
  setTimeout(function() {
    divelement.style.display = "none";
  }, 510);
}

// Busy indicator
function busyIndicator(show) {
  isBusy = show;
}

function updateBusyIndicator() {
    if (priorIsBusy === isBusy) {
      return;
    }
    priorIsBusy = isBusy;
    const indicator = document.getElementById('busy-indicator');

    if (isBusy) {
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

// Note highlighting for playback
function highlightNote(hand, noteIndex, highlight = true) {
  if (debugPlayingNotes) console.log(`Highlight note index=${noteIndex} hand=${hand}, highlight=${highlight}`);
  const ntp = document.getElementById("ntp_" + hand + "_" + noteIndex);
  ntp.style.outline = highlight ? "2px solid black" : "none";
  ntp.style.outlineOffset = "-2px";
  if (highlight) {
    ntp.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }
}

function unhighlightNote(hand, noteIndex, finalNoteCleanup = false) {
  highlightNote(hand, noteIndex, false);
  if (finalNoteCleanup) {
    if (debugPlayingNotes) console.log("FINAL PLAYED NOTE CLEANUP");
    playbackInProgress = false;
    changePlayButton(playbackInProgress);
  }
}

// Elapsed time display
function updateElapsedTime() {
  if (testStartTime) {
    if (timerPaused) {
      return;
    }
    const elapsedTime = Date.now() - testStartTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    const milliseconds = Math.floor((elapsedTime % 1000) / 10);
    document.getElementById('elapsedTime').textContent =
      `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }
}

// Counter display
let counterValue = 0;

function updateCounterDisplay() {
  if (voiceNumberElement !== null) voiceNumberElement.textContent = counterValue;
}

// Piano keyboard canvas rendering
function drawPianoKeyboard(options) {
  const canvas = document.getElementById(options.canvasId);
  const ctx = canvas.getContext('2d');
  const s = getComputedStyle(canvas);
  canvas.width = parseInt(s.width);
  canvas.height = parseInt(s.height);

  const numOctaves = options.numOctaves || 5;
  const startingOctave = options.startingOctave || 1;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const whiteKeyWidth = canvasWidth / (1 + numOctaves * 7); // we will tack on one extra "C" at the end
  const whiteKeyHeight = canvasHeight;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 0.6;

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (preferences.showKeyboard === false) {
    return;
  }

  const whiteKeyOffsets = [0,2,4,5,7,9,11]; // offset within an octave of white key numbers

  // Draw white keys
  for (let o = 0; o <= numOctaves; o++) {
    for (let i = 0; i < 7; i++) {
      const x = o * 7 * whiteKeyWidth + i * whiteKeyWidth;
      ctx.fillStyle = 'white';
      ctx.fillRect(x, 0, whiteKeyWidth, whiteKeyHeight);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(x, 0, whiteKeyWidth, whiteKeyHeight);

      // Check if the current note should be highlighted
      const noteNumber = (startingOctave+o+1) * 12 + whiteKeyOffsets[i];

      if (noteNumber === 60) {
        ctx.font = "8px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "black";
        ctx.fillText("C4", x+1, whiteKeyHeight-2);
      }

      if (options.notesOn && options.notesOn.includes(noteNumber)) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(x+1, 1, whiteKeyWidth-3, whiteKeyHeight-2);
        ctx.fillStyle = 'white';
        ctx.font = "8px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(prnotenum(noteNumber), x+1, whiteKeyHeight-2)
      }

      if (o === numOctaves) {
        break;  // this is just one more C to end the keyboard.
      }
    }
  }

  // Draw black keys
  ctx.fillStyle = 'black';
  const blackKeyIndices = [1, 2, 4, 5, 6];
  const blackKeyOffsets = [1,3,6,8,10];
  for (let o = 0; o < numOctaves; o++) {
    let keynum = 0;
    for (const keyIndex of blackKeyIndices) {
      const x = o * 7 * whiteKeyWidth + keyIndex * whiteKeyWidth - blackKeyWidth / 2;
      ctx.fillRect(x, 0, blackKeyWidth, blackKeyHeight);
      // Check if the current note should be highlighted
      const noteNumber = (startingOctave+o+1) * 12 + blackKeyOffsets[keynum];
      if (options.notesOn && options.notesOn.includes(noteNumber)) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(x+1, 1, blackKeyWidth-2, blackKeyHeight-2);
        ctx.fillStyle = 'white';
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.font = "8px Arial";
        ctx.fillText(prnotenum(noteNumber), x+1, blackKeyHeight-2);
        ctx.fillStyle = 'black';
      }
      keynum++;
    }
  }
}

// Show played note with color coding
function showPlayedNote(note, hand, index, correct) {
  // Display the played note during the test phase, highlighting in green or red
  const ntp = document.getElementById("ntp_" + hand + "_" + index);

  if (ntp === null) {
    return;
  }

  if (correct) {
    ntp.style.backgroundColor = "lightgreen";
  } else {
    ntp.style.backgroundColor = "pink";
  }

  if (index === 0) {
    ntp.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start'
    });
  }
}

// Show error count on notes
function showPlayedNoteErrors(note, hand, index, errors) {
  if (index >= notesToPlay[hand].length) {
    index = "error"; // we're past the end of the played notes
  }
  const ntp = document.getElementById("ntp_" + hand + "_" + index);

  if (ntp === null) {
    return;
  }

  if (errors > 0) {
    ntp.innerHTML = `<span style=color:red;font-size:x-small>${errors}</span>`;
  } else {
    ntp.innerHTML = "";
  }
}
