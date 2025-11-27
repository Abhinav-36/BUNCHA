const redis = require('redis');
const logger = require('../utils/logger');

let client = null;

async function connectRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to Redis (attempt ${attempt}/${maxRetries})...`);
      client = redis.createClient({ url });
      
      client.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
      });
      
      await client.connect();
      logger.info('Connected to Redis');
      console.log('✅ Successfully connected to Redis');
      return client;
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error('Redis connection failed after max retries', { error: error.message });
        console.error(`❌ Failed to connect to Redis after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      console.log(`⏳ Redis not ready, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

function getClient() {
  if (!client) {
    throw new Error('Redis client not initialized');
  }
  return client;
}

module.exports = {
  connectRedis,
  getClient
};
