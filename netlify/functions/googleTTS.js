const textToSpeech = require('@google-cloud/text-to-speech').v1beta1;

const fs = require('fs');
const os = require('os');
const path = require('path');

// Always decode from GCLOUD_KEY_BASE64
const keyPath = path.join(os.tmpdir(), 'gcloud-service-key.json');
if (!fs.existsSync(keyPath)) {
  if (!process.env.GCLOUD_KEY_BASE64) {
    throw new Error('GCLOUD_KEY_BASE64 is not set');
  }

  const decoded = Buffer.from(process.env.GCLOUD_KEY_BASE64, 'base64').toString('utf8');
  fs.writeFileSync(keyPath, decoded);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

const client = new textToSpeech.TextToSpeechClient();

exports.handler = async function (event) {
  try {
    const {
      text,
      languageCode = 'en-US',
      isSSML = false
    } = JSON.parse(event.body);

    // Voice selection based on language
    const voiceMap = {
      'en-US': 'en-US-Neural2-D',
      'de-DE': 'de-DE-Neural2-H'
    };

    const voiceName = voiceMap[languageCode] || 'en-US-Wavenet-D';

    const request = {
      input: isSSML ? { ssml: text } : { text },
      voice: {
        languageCode,
        name: voiceName
      },
      audioConfig: {
        audioEncoding: 'MP3'
      },
      enableTimePointing: [isSSML ? 'SSML_MARK' : 'WORD']
    };

    console.log('🟡 Sending request to Google TTS with:', request);

    const [response] = await client.synthesizeSpeech(request);

    console.log('✅ Google TTS audioContent length:', response.audioContent?.length);
    console.log('✅ Google TTS timepoints:', response.timepoints);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioContent: Buffer.from(response.audioContent).toString('base64'),
        timepoints: response.timepoints || []
      })
    };

  } catch (err) {
    console.error('🔴 Google TTS Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'TTS failure' })
    };
  }
};
