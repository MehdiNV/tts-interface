const textToSpeech = require('@google-cloud/text-to-speech').v1beta1;

const fs = require('fs');
const os = require('os');
const path = require('path');

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT = 5; // max requests
const WINDOW_SECONDS = 60; // 1 minute

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
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';
  const key = `rate:${clientIp}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS); // expire in 60s
  }

  if (count > RATE_LIMIT) {
    console.warn(`🚫 Rate limit exceeded for IP: ${clientIp}`);

    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
    };
  }
  // Rate limiting mechanism ---------------------------------------------------

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
