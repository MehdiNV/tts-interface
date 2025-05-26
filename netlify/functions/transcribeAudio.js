const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handler = async function (event) {
  try {
    const { audioBase64 } = JSON.parse(event.body);
    if (!audioBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing audio data' })
      };
    }

    // Save the uploaded audio to a temporary file
    const buffer = Buffer.from(audioBase64, 'base64');
    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.webm`);
    fs.writeFileSync(tempPath, buffer);

    // Step 1: Detect spoken language from first word
    const detection = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json'
    });

    const firstSegment = detection.segments?.[0]?.text?.trim() || '';
    const firstWordRaw = firstSegment.split(/\s+/)[0] || '';
    const firstWord = firstWordRaw.toLowerCase().replace(/[.,!?;:"'()\-–—]/g, '');

    const languageMap = {
      english: 'en',
      englisi: 'en',
      انگلیسی: 'en',

      german: 'de',
      deutsch: 'de',
      آلمانی: 'de',
      almani: 'de',

      farsi: 'fa',
      farsy: 'fa',
      فارسی: 'fa'
    };

    const matchedKey = fuzzyMatch(firstWord, languageMap);
    const language = matchedKey ? languageMap[matchedKey] : 'en';

    console.log(`🧠 First word "${firstWord}" → matched as "${matchedKey}" → language: ${language}`);

    // Step 2: Transcribe again with enforced language
    const accurate = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      language
    });

    // Remove the first word from the first segment
    const cleanedSegments = [...accurate.segments];
    if (cleanedSegments.length > 0) {
      cleanedSegments[0].text = removeFirstWord(cleanedSegments[0].text);
    }

    const cleanedText = cleanedSegments
      .map(seg => seg.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ');

    fs.unlinkSync(tempPath);

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: cleanedText,
        language
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

// Utility to remove first word from a string
function removeFirstWord(text) {
  return text.trim().split(/\s+/).slice(1).join(' ');
}

// Utility to fuzzy-match language words
function fuzzyMatch(word, options) {
  const normalized = word.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return Object.keys(options).find(key => {
    const base = key.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return (
      normalized === base ||
      normalized.startsWith(base) ||
      base.startsWith(normalized) ||
      levenshtein(normalized, base) <= 2
    );
  });
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}
