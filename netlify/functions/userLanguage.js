const fetch = require('node-fetch');

const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const expiryLimit = 2592000; // Expires after 30 days

exports.handler = async function (event) {
  const ip = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';

  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Upstash credentials' })
    };
  }

  const key = `lang:${ip}`;

  if (event.httpMethod === 'GET') {
    const res = await fetch(`${UPSTASH_REST_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });

    const result = await res.json();
    const language = result.result;

    // Refresh expiry only if a preference already exists - reset back to a month
    if (language) {
      await fetch(`${UPSTASH_REST_URL}/set/${key}/${language}?EX=${expiryLimit}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ language: language || null })
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { language } = JSON.parse(event.body);
      if (!['de-DE', 'en-US', 'fa-IR'].includes(language)) {
        return { statusCode: 400, body: 'Invalid language code' };
      }

      await fetch(`${UPSTASH_REST_URL}/set/${key}/${language}?EX=${expiryLimit}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Saved language settings correctly' })
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return { statusCode: 405, body: 'Method is not allowed' };
};
