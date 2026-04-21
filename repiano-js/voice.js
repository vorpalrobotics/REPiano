"use strict";

// Voice module - handles speech synthesis with queuing system

// Speech queue and state
const speechQueue = [];
let isSpeaking = false;

// Enqueue speech with optional classification for cancellation
async function enqueueSpeech(words, classification = null, options = {}) {
  speechQueue.push({ words, classification, ...options });
  if (!isSpeaking) {
    await speakNextInQueue();
  }
}

// Process the next item in the speech queue
async function speakNextInQueue() {
  if (speechQueue.length === 0) {
    isSpeaking = false;
    return;
  }

  isSpeaking = true;

  // Clear the internal SpeechSynthesis queue
  window.speechSynthesis.cancel();

  const item = speechQueue.shift();
  const sayWords = new SpeechSynthesisUtterance(item.words);
  sayWords.rate = item.rate || preferences.speakingRate;
  sayWords.volume = item.volume || avail(preferences.speakingVolume, 1.0);

  sayWords.onend = sayWords.onerror = function() {
    isSpeaking = false;
    speakNextInQueue();
  };

  window.speechSynthesis.speak(sayWords);
}

// Cancel speech items with a specific classification
function cancelSpecificClassification(classification) {
  const index = speechQueue.findIndex(item => item.classification === classification);
  if (index !== -1) {
    speechQueue.splice(index, 1);
  }
}

// Main speech function with queuing
async function say(words, force = false, classification = null) {
  if (!preferences.enableVoice && !force) {
    return;
  }
  if (classification) {
    cancelSpecificClassification(classification);
  }

  await enqueueSpeech(words, classification, {
    rate: preferences.speakingRate,
    volume: avail(preferences.speakingVolume, 1.0)
  });
}

// Immediate speech without queuing (interrupts current speech)
function say_noqueue(words, force = false) {
  if (!preferences.enableVoice && !force) {
    return;
  }
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  const sayWords = new SpeechSynthesisUtterance(words);
  sayWords.rate = preferences.speakingRate;
  sayWords.volume = avail(preferences.speakingVolume, 1.0);

  // Update the isSpeaking flag and event handlers
  isSpeaking = true;
  sayWords.onend = sayWords.onerror = function() {
    isSpeaking = false;
  };

  window.speechSynthesis.speak(sayWords);
}

// Reset the voice API and clear the queue
function resetVoiceAPI() {
  window.speechSynthesis.cancel();
  speechQueue.length = 0; // Clear the queue
  isSpeaking = false;
  // Additional cleanup if necessary
  console.log('SpeechSynth RESET');
}

/**
 * Initializes and starts a white noise generator.
 * Used for certain bluetooth speakers that sleep - this keeps them awake.
 *
 * @param {number} [volume=0.5] - The amplitude of the white noise (0.01 to 1.0).
 * @returns {object} An object containing methods to stop the noise and adjust the volume.
 */
function startWhiteNoise(volume = 0.5) {
    // Validate the volume parameter
    if (typeof volume !== 'number' || volume < 0.01 || volume > 1.0) {
        throw new Error('Volume must be a number between 0.01 and 1.0');
    }

    // Create a new AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    // Create a buffer for white noise
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds buffer
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill the buffer with random values to generate white noise
    for (let i = 0; i < bufferSize; i++) {
        // Random values between -1 and 1, scaled by the volume
        data[i] = (Math.random() * 2 - 1) * volume;
    }

    // Create a buffer source for white noise
    const whiteNoiseSource = audioCtx.createBufferSource();
    whiteNoiseSource.buffer = buffer;
    whiteNoiseSource.loop = true; // Loop the noise indefinitely

    // Create a GainNode to control the volume of the white noise
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume; // Set initial volume

    // Connect the white noise source to the GainNode, then to the destination
    whiteNoiseSource.connect(gainNode).connect(audioCtx.destination);

    // Start playing the white noise
    whiteNoiseSource.start();

    // Return control methods to allow stopping and volume adjustments
    return {
        /**
         * Stops the white noise playback and closes the AudioContext.
         */
        stop: function() {
            whiteNoiseSource.stop();
            audioCtx.close();
        },

        /**
         * Adjusts the volume of the white noise in real time.
         *
         * @param {number} newVolume - The new volume level (0.01 to 1.0).
         */
        setVolume: function(newVolume) {
            if (typeof newVolume !== 'number' || newVolume < 0.01 || newVolume > 1.0) {
                throw new Error('Volume must be a number between 0.01 and 1.0');
            }
            gainNode.gain.setValueAtTime(newVolume, audioCtx.currentTime);
        }
    };
}
