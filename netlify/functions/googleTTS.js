// netlify/functions/googleTTS.js
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../gcloud-service-key.json');

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

// Load credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../gcloud-service-key.json');

const client = new textToSpeech.TextToSpeechClient();

exports.handler = async function (event) {
  try {
    const { text, languageCode = 'en-US', voiceName = 'en-US-Wavenet-D' } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text input.' })
      };
    }

    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
      enableTimePointing: ['WORD'],
    };

    const [response] = await client.synthesizeSpeech(request);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audioContent: response.audioContent, // base64 MP3
        timepoints: response.timepoints      // Array of words + timestamps
      }),
    };
  } catch (err) {
    console.error('Google TTS error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
