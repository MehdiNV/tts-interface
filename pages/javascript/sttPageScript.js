// sttPageScript.js

// Clear button: clears the transcription area.
document.getElementById('clearButton').addEventListener('click', function () {
  const textBox = document.getElementById('textBox');
  textBox.value = "";
});

// Variables for recording and audio processing.
let isRecording = false;   // Track whether recording is active.
let mediaRecorder;         // The MediaRecorder instance.
let audioChunks = [];      // Array to store recorded audio data chunks.
let audioStream;           // The raw microphone stream.
let audioContext;          // Web Audio API AudioContext.
let gainNode;              // GainNode to boost the signal.
let destination;           // MediaStreamDestination for processed stream.

// Reference to the microphone button.
const micButton = document.getElementById('micButton');

// Set the trim duration (in seconds) to remove the fuzzy initial part.
const trimSeconds = 1.0;

// Event handler for the mic button.
micButton.addEventListener('click', async function () {
  if (!isRecording) {
    try {
      // Request access to the microphone.
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create an AudioContext for audio processing.
      audioContext = new AudioContext();

      // Create a source node from the microphone stream.
      const source = audioContext.createMediaStreamSource(audioStream);

      // Create a GainNode to boost the input signal.
      gainNode = audioContext.createGain();
      gainNode.gain.value = 2.0; // Adjust this value as needed.

      // Create a destination node to capture the processed audio.
      destination = audioContext.createMediaStreamDestination();

      // Connect the processing chain: source -> gain -> destination.
      source.connect(gainNode);
      gainNode.connect(destination);

      // Create a MediaRecorder from the processed stream.
      mediaRecorder = new MediaRecorder(destination.stream);
      audioChunks = []; // Reset any previous recordings.

      // Collect audio data chunks.
      mediaRecorder.addEventListener('dataavailable', event => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });

      // When recording stops, process the recorded audio.
      mediaRecorder.addEventListener('stop', async () => {
        // Stop all audio tracks to release the microphone.
        audioStream.getTracks().forEach(track => track.stop());

        // Combine all recorded chunks into a single Blob.
        const fullAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = []; // Clear chunks for future recordings.

        // Decode the full audio Blob into an AudioBuffer.
        const arrayBuffer = await fullAudioBlob.arrayBuffer();
        const fullAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Trim the first "trimSeconds" seconds from the AudioBuffer.
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

        // Convert the trimmed AudioBuffer into a WAV Blob.
        const wavBlob = audioBufferToWavBlob(trimmedBuffer);

        // Send the WAV file to the OpenAI Speech-to-Text API.
        sendToOpenAI(wavBlob);
      });

      // Start recording.
      mediaRecorder.start();
      isRecording = true;
      micButton.setAttribute('aria-label', 'Stop recording');
      micButton.style.backgroundColor = '#ff0000'; // Red indicates recording is active.

    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  } else {
    // Stop recording if already active.
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      isRecording = false;
      micButton.setAttribute('aria-label', 'Start or stop recording');
      micButton.style.backgroundColor = '#f54242'; // Restore original color.
    }
  }
});

/* ===========================
   AudioBuffer to WAV conversion functions
   =========================== */

// Converts an AudioBuffer into a WAV Blob.
function audioBufferToWavBlob(buffer) {
  let numChannels = buffer.numberOfChannels;
  let sampleRate = buffer.sampleRate;
  let bitDepth = 16;
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

// Encodes interleaved samples into a WAV format ArrayBuffer.
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

// Helper to write strings into DataView.
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

/* ===========================
   OpenAI API Integration
   =========================== */

// Sends the WAV blob to the OpenAI Speech-to-Text API for transcription.
function sendToOpenAI(wavBlob) {
  // Create a FormData object.
  const formData = new FormData();
  formData.append('file', wavBlob, 'recording_trimmed.wav');
  formData.append('model', 'whisper-1'); // Specify the model; adjust parameters as needed.
  // Optionally, you can add parameters like language here:
  formData.append('language', 'fa');

  // Make the API request.
  fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer API_KEY'
    },
    body: formData,
  })
    .then(response => response.json())
    .then(data => {
      // Check if the API returned a transcription.
      if (data.text) {
        // Insert the transcribed text into the textarea.
        document.getElementById('textBox').value = data.text;
      } else {
        console.error("Transcription error:", data);
      }
    })
    .catch(error => {
      console.error('Error during API call:', error);
    });
}
