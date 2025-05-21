// netlify/functions/detectLang.js
const rateLimitStore = {};
const RATE_LIMIT = 10; // max requests
const WINDOW_MS = 60 * 1000; // 1 minute

exports.handler = async function(event) {
  const clientIp = event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  if (!rateLimitStore[clientIp]) {
    rateLimitStore[clientIp] = [];
  }

  // Clear out old timestamps
  rateLimitStore[clientIp] = rateLimitStore[clientIp].filter(ts => now - ts < WINDOW_MS);

  if (rateLimitStore[clientIp].length >= RATE_LIMIT) {
    console.warn(`🚫 Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
    };
  }

  // Add current request timestamp
  rateLimitStore[clientIp].push(now);

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
