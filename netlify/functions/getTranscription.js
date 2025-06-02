const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

exports.handler = async function(event) {
  const jobId = event.queryStringParameters.id;
  if (!jobId) {
    console.log("Missing Job ID provided for getTranscription, terminating...");
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing job ID' }) };
  }

  const result = await redis.get(`transcription:${jobId}`);
  if (!result) {
    console.log(`Still processing the transcription (Job ID ${jobId})...`);
    return { statusCode: 202 }; // Still processing
  }

  console.log(`Transcription (Job ID ${jobId}) processing is completed: `, result);
  console.log("Returning result now...");

  return {
    statusCode: 200,
    body: JSON.stringify(result),
    headers: { 'Content-Type': 'application/json' }
  };
};
