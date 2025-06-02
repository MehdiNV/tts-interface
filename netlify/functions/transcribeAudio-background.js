const { Redis } = require('@upstash/redis');

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const checkRateLimit = require('./utils/rateLimit');

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const availableTranscriptionLanguages = {
  German: "de",
  Persian: "fa",
  English: "en",
  'de-DE': 'de',
  'en-US': 'en',
  'fa-IR': 'fa',
};

async function processTranscriptionJob(jobId, audioBase64, languageCode) {
  const buffer = Buffer.from(audioBase64, 'base64');
  const tempPath = path.join(os.tmpdir(), `${jobId}.webm`);

  try {
    // Save the uploaded audio to a temporary file
    fs.writeFileSync(tempPath, buffer);

    // Step 1: Transcribe with enforced language
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'json',
      language: availableTranscriptionLanguages[languageCode]
    });

    const result = { text: transcription.text };
    await redis.setex(`transcription:${jobId}`, 300, JSON.stringify(result));
    console.log(`✅ Transcription stored for job ${jobId}`);
  } catch (err) {
    console.error(`🔴 Whisper job ${jobId} failed:`, err.message || err);
    await redis.setex(`transcription:${jobId}`, 300, JSON.stringify({ error: 'Transcription failed' }));
  } finally {
    fs.unlink(tempPath, () => {});
  }
}

exports.handler = async function (event) {
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';

  if (await checkRateLimit(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) };
  }
  // Rate limiting mechanism ---------------------------------------------------

  try {
    const { transcriptionJobId, audioBase64, languageCode } = JSON.parse(event.body);
    if (!audioBase64 || !languageCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing audio data' })
      };
    }

    // Assign a job ID to this specific transcription request
    processTranscriptionJob(transcriptionJobId, audioBase64, languageCode);

    return {
      statusCode: 202,
      body: JSON.stringify({ message: 'Transcription job accepted.' })
    };
  } catch (err) {
    console.error('🔴 Transcription Error:', err.stack || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Transcription failed' })
    };
  }
};
