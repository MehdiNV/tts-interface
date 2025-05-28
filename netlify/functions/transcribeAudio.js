const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT = 5; // max requests
const WINDOW_SECONDS = 60; // 1 minute

const availableTranscriptionLanguages = {German: "de", Persian: "fa", English: "en"};

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
    const { audioBase64, languageCode } = JSON.parse(event.body);
    if (!audioBase64 || !languageCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing audio data' })
      };
    }

    // Save the uploaded audio to a temporary file
    const buffer = Buffer.from(audioBase64, 'base64');
    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.webm`);
    fs.writeFileSync(tempPath, buffer);

    // Step 1: Transcribe with enforced language
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      language: availableTranscriptionLanguages[languageCode]
    });

    // Remove the first word from the first segment
    const cleanedSegments = [...accurate.segments];
    if (cleanedSegments.length > 0) {
      cleanedSegments[0].text = removeFirstWord(cleanedSegments[0].text);
    }

    fs.unlinkSync(tempPath);

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: transcription.text
      })
    };

  } catch (err) {
    console.error('🔴 Transcription Error:', err.stack || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Transcription failed' })
    };
  }
};
