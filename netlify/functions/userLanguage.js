const fetch = require('node-fetch');

const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const expiryLimit = 2592000; // 30 days in seconds

exports.handler = async function (event) {
  const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const ipKey = `langPrefs:${ip}`;

  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Upstash credentials' })
    };
  }

  // GET request → fetch both preferences
  if (event.httpMethod === 'GET') {
    const res = await fetch(`${UPSTASH_REST_URL}/get/${ipKey}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });

    const result = await res.json();
    let languagePreferences = {};

    if (result.result) {
      try {
        languagePreferences = JSON.parse(result.result);
        console.log("GET: Set language preferences to match what's already stored")
      } catch (err) {
        console.warn(`⚠️ Invalid JSON in existing prefs, starting fresh:`, err);
      }

      const valuePayload = JSON.stringify(languagePreferences);

      // Refresh expiration
      await fetch(`${UPSTASH_REST_URL}/set/${ipKey}/${valuePayload}?EX=${expiryLimit}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        uiLanguage: languagePreferences.uiLang || null,
        transcriptionLanguage: languagePreferences.txLang || null
      })
    };
  }

  // POST request → update one or both preferences
  if (event.httpMethod === 'POST') {
    try {
      const { uiLanguage, transcriptionLanguage } = JSON.parse(event.body || '{}');
      let languagePreferences = {};

      // Get existing prefs if they're available
      const res = await fetch(`${UPSTASH_REST_URL}/get/${ipKey}`, {
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
      });
      const result = await res.json();

      if (result.result) {
        try {
          languagePreferences = JSON.parse(result.result);
          console.log("POST: Set language preferences to match what's already stored")
        } catch (err) {
          console.warn(`⚠️ Invalid JSON in existing prefs, starting fresh:`, err);
        }
      }

      // Validate and update preferences
      if (uiLanguage && ['de-DE', 'en-US', 'fa-IR'].includes(uiLanguage)) {
        languagePreferences.uiLang = uiLanguage; // Update or initliase UI language preference
      }

      if (transcriptionLanguage && ['de-DE', 'en-US', 'fa-IR'].includes(transcriptionLanguage)) {
        languagePreferences.txLang = transcriptionLanguage; // Update or initliase transcription language preference
      }

      const valuePayload = JSON.stringify(languagePreferences);

      // Store updated prefs
      await fetch(`${UPSTASH_REST_URL}/set/${ipKey}/${valuePayload}?EX=${expiryLimit}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Preferences saved successfully' })
      };

    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};
