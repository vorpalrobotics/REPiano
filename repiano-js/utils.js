"use strict";
// Helper functions to test if a value is defined and set to non-null
function avail(item, defaultValue = null) {
  if (typeof item !== 'undefined' && item !== null) {
    return item;
  }
  return defaultValue;
}
// Boolean version of avail(), useful for if statements
function isAvail(item) {
  // the item===item tests for NaN
  if (typeof item !== 'undefined' && item !== null && item === item) {
    return true;
  }
  return false;
}
// Convert note name to MIDI number
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
// Check if a note is a chord (array)
function isChord(note) {
  if (Array.isArray(note)) {
    return note.length;
  } else {
    return false;
  }
}
// Convert duration to unicode musical symbols
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
// Convert rest duration to unicode musical symbols
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
// Convert duration to fractional notation
function durFrac(dur) {
  dur = dur.toString();
  const durmap = { "1":"1/1", "1.5": "1.5/1",
    "0.5":"1/2", "0.75":"3/4", "0.25":"1/4", "0.375":"3/8",
    "0.125":"1/8", "0.0625":"1/16", "0.1875":"3/16", "0.5625":"9/16",
    "0.03125":"1/32", "0.09375":"3/32", "0.041666666666666664":"1/24",
  };
  if (isAvail(durmap[dur])) {
    dur = durmap[dur];
  }
  return dur;
}
// Format time in HH:MM:SS or MM:SS format
function formatTime(seconds) {
  seconds = Number(seconds);
  let hours = Math.floor(seconds/(60*60));
  let minutes = Math.floor((seconds-hours*60*60) / 60);
  let remainingSeconds = Math.trunc(seconds % 60);
  // Pad single-digit seconds with leading zero
  let secondsString = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
  if (hours === 0) {
      return String(minutes) + ':' + secondsString;
  } else {
      return String(hours) + ":" + String((minutes<10)?'0':'') + String(minutes) + ':' + secondsString;
  }
}
// Calculate percentage
function percent(a, b) {
  return Math.trunc(100*nonZero(a)/nonZero(b));
}
// Ensure non-zero value
function nonZero(n) {
  n = avail(n, 1);
  return n?n:1;
}
// Convert number to spoken format
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
// Convert date string to days since 1970
function dateToDaysSince1970(dateString) {
    const parts = dateString.split('-');
    if (parts.length === 2) {
      parts[2] = 1;
      console.log("auto added 01 day to date");
    } else if (parts.length !== 3) {
        throw new Error("Invalid date format. '"+dateString+"' Use yyyy-mm-dd.");
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JavaScript
    const day = parseInt(parts[2], 10);
    const inputDate = new Date(year, month, day);
    const januaryFirst1970 = new Date(1970, 0, 1); // January is month 0
    // Calculate the difference in milliseconds and convert to days
    const daysDifference = Math.floor((inputDate - januaryFirst1970) / (24 * 60 * 60 * 1000));
    return daysDifference;
}
// Get today's date in YYYY-MM-DD format
function getToday() {
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
  let dd = String(today.getDate()).padStart(2, '0');
  let formattedDate = `${yyyy}-${mm}-${dd}`;
  return formattedDate;
}
// Display a message in the console
function message(text) {
  let consoleDiv = document.getElementById('console');
  let messageP = document.createElement('p');
  messageP.innerHTML = text;
  consoleDiv.appendChild(messageP);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}
// Display a warning message in the console
function warning(text) {
  let consoleDiv = document.getElementById('console');
  let messageP = document.createElement('p');
  messageP.style.color = 'red';
  messageP.textContent = text;
  consoleDiv.appendChild(messageP);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}
// Limit input element to 4 characters
function limitNumber(inputElement) {
    if (inputElement.value.length > 4) {
        inputElement.value = inputElement.value.slice(0, 4);
    }
}
