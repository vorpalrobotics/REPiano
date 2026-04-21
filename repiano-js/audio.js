"use strict";

// Audio module - handles Tone.js synth and metronome functionality

// Tone.js synth for MIDI playback
let synth = null;

// Initialize Tone.js synth
function initSynth() {
  if (synth === null) {
    // Create a polyphonic synth using a piano-like sound (Tone.js)
    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: "square"
        },
        envelope: {
            attack: 0.05,
            decay: 1,
            sustain: 0.2,
            release: 1
        }
    }).toDestination();

    if (synth === null) {
      error("Synth could not be created");
    }
  }
}

// Play a note using the Tone.js synth
function playSynthNote(noteNumber, duration, velocity) {
  const frequency = Tone.Midi(noteNumber).toFrequency();  // Convert MIDI note to frequency
  console.log(" f="+frequency+" vel="+velocity);
  synth.triggerAttack(frequency, Tone.now(), velocity);  // Play note

  setTimeout(function() {
    synth.triggerRelease(frequency, Tone.now());  // Stop note
    console.log("PLAYSYNTH STOP f="+frequency);
  }, duration);
}

// Metronome audio context and state
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gainNode = audioContext.createGain(); // Create a GainNode
gainNode.connect(audioContext.destination); // Connect the GainNode to the destination
let audioBuffer; // This will store the decoded audio data

// Set metronome BPM
function setMetroBPM(value, absolute=false) {
  if (absolute) {
      metroBPM = value;
  } else {
      metroBPM += value;
      metroBPM = Math.round(metroBPM/value,value)*value;
  }

  if (metroBPM > 480) {
    metroBPM = 480;
  }
  if (metroBPM < 10) {
    metroBPM = 10;
  }
  updateMetronome();
}

// Load the metronome tick audio buffer
async function loadAudioBuffer() {
    const response = await fetch(`data:audio/wav;base64,${metronomeTickBase64}`);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
}

let tickNum = 0;

// Schedule a single metronome tick
function scheduleTick(time) {
    const source = audioContext.createBufferSource();
    let flashColor;
    let gainValue = 1;
    console.log("TICK:"+(tickNum%testOptions.beatsPerBar));
    if ( (tickNum % metroBeat) === 0) {
      // first beat is emphasized
      source.playbackRate.value = 1;
      gainValue = 1.5;
      flashColor = "blue";
    } else {
      source.playbackRate.value = 2;
      flashColor = "yellow";
    }
    source.buffer = audioBuffer;
    source.connect(gainNode);
    console.log("Flash:"+flashColor+" rate:"+source.playbackRate.value);
    tickNum++;
    gainNode.gain.value = Math.max(avail(preferences.metroVolume, 0.5)*gainValue, 1);
    source.start(time);
    setTimeout(function () {
      flashMetronome(flashColor);
    }, time + 10 - audioContext.time); // add some ms so the flash happens right after the tick sound starts
}

// Flash the metronome icon
function flashMetronome(flashColor) {
  const icon = document.getElementById("metronomeIcon");
  icon.style.backgroundColor = flashColor;
  setTimeout(function() {
    icon.style.backgroundColor = "transparent";
  }, 80);
}

// Play metronome ticks recursively
function playTick() {
    if (!metronomeRunning) return;

    nextTickTime += tickInterval; // Schedule the next tick
    scheduleTick(nextTickTime); // Schedule this tick

    // Calculate the exact time to call playTick again
    let timeUntilNextTick = nextTickTime - audioContext.currentTime;

    // Schedule the next call to playTick
    setTimeout(playTick, timeUntilNextTick * 1000);
}

// Start the metronome
function startMetronome() {
    const metroIcon = document.getElementById("metronomeIcon");
    if (metronomeRunning) {
        stopMetronome();
        updateMetronome();
        return; // Prevent multiple instances
    }
    console.log("Starting metronome");

    tickNum = 0;
    metroSmartExtra = 0;
    metronomeRunning = true;
    updateMetronome();

    nextTickTime = audioContext.currentTime;

    loadAudioBuffer().then(() => {
        playTick(); // Start ticking
    });
}

// Stop the metronome
function stopMetronome() {
    metronomeRunning = false; // This will stop the scheduling of new ticks
    metroSmartExtra = 0;      // reset smart metro
}

// Update metronome UI and state
function updateMetronome() {
  const metroIcon = document.getElementById("metronomeIcon");

  if (metronomeRunning) {
        metroIcon.style.backgroundColor = "green";
  } else {
        metroIcon.style.backgroundColor = "transparent";
  }
  tickInterval = 60 / (metroBPM+metroSmartExtra); // Calculate the interval for the given BPM

  drawMetronomeIndicators();

  updateSmartMetronome();
}

// Draw metronome controls and indicators
function drawMetronomeIndicators() {
  let bpmreport = String(metroBPM);

  let mfsize = 'mf';
  let adjbpmy = -6;
  let pad = 5;
  let bpmfontsize = 30;
  let iconsize = 40;
  if (metroExpanded) {
    mfsize = 'mfxl';
    adjbpmy = -6;
    pad = 10;
    bpmfontsize = 40;
    iconsize = 60;
  }

  document.getElementById("large_Metronome").style.width = iconsize+"px";
  document.getElementById("large_Metronome").style.height = iconsize+"px";

  if (metroSmart) {
    bpmreport = bpmreport + `<span class=${mfsize} style=color:blue>+${String(metroSmartExtra)}</span>`;
  }

  document.getElementById("metronomeDiv").innerHTML = `
    <div style=line-height:1>
    <div class=${mfsize} style=align-self:center;display:flex;flex-direction:row;width:100%;padding:5px>
        &nbsp;
        <span onclick=setMetroBPM(-10) style=padding:${pad}px>&#9194;</span>
        &nbsp;<span onclick=setMetroBPM(-1) style=padding:${pad}px>&#9664;&nbsp;</span>

        <div class=mfxl onclick="metroExpanded=!metroExpanded;updateMetronome();"
          style=padding:${pad-2}px;font-size:${bpmfontsize}px;transform:translateY(${adjbpmy}px)>
          ${bpmreport}</div>

        <span onclick=setMetroBPM(+1) style=padding:${pad}px;padding-left:{$pad+2}px>&#9654;</span>
        &nbsp;<span onclick=setMetroBPM(+10) style=padding:${pad}px>&#9193;</span>
      </div>
    <label id=metroVolumeMuteSymbol for:metroVolumnSlider class=${mfsize} style=position:relative;top:-3px>
      &nbsp;&#128266;</label>
    <input type=range id=metroVolumeSlider onchange='adjustMetroVolume()' min=0 max=1 step=0.1 value=
      preferences["metroVolume"]+" style=width:55%;>
    <div id=metroBeat style=display:inline;font-size:x-large onclick='cycleMetroBeat();'>
      <i class="fa-solid fa-drum" style=font-size:medium></i>&nbsp;${metroBeat}</div>
    </div>
    `;
}

// Toggle smart metronome mode
function cycleSmartMetronome() {
  metroSmart = !metroSmart;
  updateSmartMetronome();
}

// Cycle through metronome beat patterns
function cycleMetroBeat() {
  metroBeat++;
  if (metroBeat > 12) {
    metroBeat = 1;
  }
  updateMetronome();
}

// Update smart metronome UI
function updateSmartMetronome() {
  const smd = document.getElementById("smartMetronomeDiv");

  const fsize = metroExpanded?"large":"x-small";

  if (metroSmart) {
    const strikenames = ["QFAIL","PASSING","GOOD","EXCELLENT"];
    const value = strikenames[preferences.metroSmartIncStrikes];
    smd.innerHTML = `<div style=display:flex;flex-direction:row>
      <div  style=font-weight:bold;font-size:${fsize}><span style=color:grey><i class="fa-solid fa-arrow-rotate-right"></i></span>
        SMART</div>&nbsp;&nbsp;<div onclick=smartMetronomeMenu style=font-style:italic;font-size:${fsize}>
        +${preferences.metroSmartInc} on ${value}, Max: +${preferences.metroSmartExtraMax}</div>
        </div>`;
  } else {
    smd.innerHTML = `<div style=font-weight:bold;font-size:${fsize}><i class="fa-solid fa-arrow-rotate-right"></i>FIXED</div>`;
  }
}

// Adjust metronome volume
function adjustMetroVolume() {
  const volslider = document.getElementById("metroVolumeSlider");
  const val = volslider.value;
  setPref("metroVolume", val);
  document.getElementById("metroVolumeMenu").value = val;
  localStorage.setItem("metroVolume", val);
  if (val == 0) {
    document.getElementById("metroVolumeMuteSymbol").innerHTML = "&#128263;"; // muted speaker
  } else {
    document.getElementById("metroVolumeMuteSymbol").innerHTML = "&#128266;"; // speaker
  }
}
