// netlify/functions/detectLang.js
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const RATE_LIMIT = 5; // max requests
const WINDOW_SECONDS = 60; // 1 minute

exports.handler = async function(event) {
  // Rate limiting mechanism ---------------------------------------------------
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';
  const key = `rate:${clientIp}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS); // Set initial expiry, for 60s
  }

  if (count > RATE_LIMIT) {
    console.warn(`🚫 Rate limit exceeded for IP: ${clientIp}`);

    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
    };
  }
  // Rate limiting mechanism ---------------------------------------------------

  const { text } = JSON.parse(event.body);
  const response = await fetch('https://ws.detectlanguage.com/0.2/detect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DETECT_LANGUAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: text })
  });

  const result = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
