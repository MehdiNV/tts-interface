// sttPageScript.js

// Clear button: clears the transcription area.
document.getElementById('clearButton').addEventListener('click', function () {
  const textBox = document.getElementById('textBox');
  textBox.value = "";
});

// Variables for recording and audio processing.
let isRecording = false;   // Track whether recording is active.
let mediaRecorder;         // MediaRecorder instance.
let audioChunks = [];      // Array to store recorded audio data chunks.
let audioStream;           // Raw microphone stream.
let audioContext;          // Web Audio API AudioContext.
let gainNode;              // GainNode to boost the signal.
let destination;           // MediaStreamDestination for processed stream.

// Reference to the microphone button.
const micButton = document.getElementById('micButton');

// This is the amount of time (in seconds) to trim off the beginning.
const trimSeconds = 1.0;

// The maximum allowed file size is 25MB.
const MAX_BYTES = 25 * 1024 * 1024;  // 25MB

// When the mic button is clicked, start or stop recording.
micButton.addEventListener('click', async function () {
  if (!isRecording) {
    try {
      // Request microphone access.
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create an AudioContext for processing.
      audioContext = new AudioContext();

      // Create a source node from the microphone stream.
      const source = audioContext.createMediaStreamSource(audioStream);

      // Create a GainNode to boost the input signal.
      gainNode = audioContext.createGain();
      gainNode.gain.value = 2.0;  // Boost factor (adjust as needed).

      // Create a destination node to obtain the processed stream.
      destination = audioContext.createMediaStreamDestination();

      // Connect the nodes: microphone -> gain -> destination.
      source.connect(gainNode);
      gainNode.connect(destination);

      // Create a MediaRecorder from the processed stream.
      mediaRecorder = new MediaRecorder(destination.stream);
      audioChunks = [];  // Reset any previous recordings.

      // Collect audio data chunks.
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });

      // When recording stops, process the audio.
      mediaRecorder.addEventListener('stop', async () => {
        // Stop audio tracks.
        audioStream.getTracks().forEach(track => track.stop());

        // Combine audio chunks into a single Blob.
        const fullAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = []; // Clear chunks for future recordings.

        // Decode the Blob into an AudioBuffer.
        const arrayBuffer = await fullAudioBlob.arrayBuffer();
        const fullAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Trim the first 'trimSeconds' seconds.
        let trimmedBuffer;
        if (fullAudioBuffer.duration > trimSeconds) {
          const numChannels = fullAudioBuffer.numberOfChannels;
          const sampleRate = fullAudioBuffer.sampleRate;
          const startSample = Math.floor(trimSeconds * sampleRate);
          const newLength = fullAudioBuffer.length - startSample;
          trimmedBuffer = audioContext.createBuffer(numChannels, newLength, sampleRate);
          for (let channel = 0; channel < numChannels; channel++) {
            const oldData = fullAudioBuffer.getChannelData(channel);
            const newData = trimmedBuffer.getChannelData(channel);
            for (let i = 0; i < newLength; i++) {
              newData[i] = oldData[i + startSample];
            }
          }
        } else {
          trimmedBuffer = fullAudioBuffer;
        }

        // Calculate the maximum sample frames allowed in a WAV file under 25MB.
        // WAV file size ≈ 44 (header) + (samples * (bitDepth/8) * numChannels)
        // We use bitDepth = 16 (2 bytes per sample).
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const numChannels = trimmedBuffer.numberOfChannels;
        const maxSamples = Math.floor((MAX_BYTES - 44) / (bytesPerSample * numChannels));

        if (trimmedBuffer.length > maxSamples) {
          // Audio is too long; split into chunks.
          const chunks = splitAudioBuffer(trimmedBuffer, maxSamples);
          let transcriptions = [];
          for (let i = 0; i < chunks.length; i++) {
            try {
              const text = await sendChunk(chunks[i]);
              transcriptions.push(text);
            } catch (err) {
              console.error("Error transcribing chunk", i, err);
              transcriptions.push(""); // Fallback: append empty text.
            }
          }
          const fullTranscription = transcriptions.join(" ");
          document.getElementById('textBox').value = fullTranscription;
        } else {
          // Audio size is within limits; convert and send directly.
          const wavBlob = audioBufferToWavBlob(trimmedBuffer);
          sendToOpenAI(wavBlob);
        }
      });

      // Start recording.
      mediaRecorder.start();
      isRecording = true;
      micButton.setAttribute('aria-label', 'Stop recording');
      micButton.style.backgroundColor = '#ff0000';  // Red indicates active recording.

    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  } else {
    // Stop recording.
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      isRecording = false;
      micButton.setAttribute('aria-label', 'Start or stop recording');
      micButton.style.backgroundColor = '#f54242';  // Restore original color.
    }
  }
});

/* ================================
   AudioBuffer to WAV conversion functions
   ================================ */

// Converts an AudioBuffer into a WAV Blob.
function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  let interleaved;

  if (numChannels === 2) {
    interleaved = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const wavBuffer = encodeWAV(interleaved, numChannels, sampleRate, bitDepth);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// Interleave two Float32Arrays for stereo audio.
function interleave(inputL, inputR) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0, inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

// Encodes interleaved samples into a WAV format DataView.
function encodeWAV(samples, numChannels, sampleRate, bitDepth) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  floatTo16BitPCM(view, 44, samples);

  return view;
}

// Write a string into the DataView.
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert Float32Array samples to 16-bit PCM.
function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    output.setInt16(offset, s, true);
  }
}

/* ================================
   Splitting and API integration functions
   ================================ */

// Splits an AudioBuffer into chunks with at most maxSamples each.
function splitAudioBuffer(buffer, maxSamples) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const totalSamples = buffer.length;
  let chunks = [];

  for (let start = 0; start < totalSamples; start += maxSamples) {
    const chunkLength = Math.min(maxSamples, totalSamples - start);
    const chunkBuffer = audioContext.createBuffer(numChannels, chunkLength, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const oldData = buffer.getChannelData(channel);
      const newData = chunkBuffer.getChannelData(channel);
      for (let i = 0; i < chunkLength; i++) {
        newData[i] = oldData[i + start];
      }
    }
    chunks.push(chunkBuffer);
  }
  return chunks;
}

// Sends a single chunk (AudioBuffer) to the OpenAI API and returns the transcription text.
async function sendChunk(chunkBuffer) {
  const wavBlob = audioBufferToWavBlob(chunkBuffer);

  // Retrieve API key from environment (ensure it's injected during build).
  const API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_FALLBACK';

  const formData = new FormData();
  formData.append('file', wavBlob, 'chunk.wav');
  formData.append('model', 'whisper-1');
  // You can append additional parameters if needed, e.g., language.

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    body: formData,
  });

  const data = await response.json();
  if (data.text) {
    return data.text;
  } else {
    throw new Error("Transcription error: " + JSON.stringify(data));
  }
}

// Sends a single WAV Blob to OpenAI API (for audio within size limit).
function sendToOpenAI(wavBlob) {
  // Retrieve API key from the environment.
  const API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_FALLBACK';

  const formData = new FormData();
  formData.append('file', wavBlob, 'recording_trimmed.wav');
  formData.append('model', 'whisper-1');

  fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    body: formData,
  })
    .then(response => response.json())
    .then(data => {
      if (data.text) {
        document.getElementById('textBox').value = data.text;
      } else {
        console.error("Transcription error:", data);
      }
    })
    .catch(error => {
      console.error('Error during API call:', error);
    });
}
