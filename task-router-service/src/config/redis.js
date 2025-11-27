const redis = require('redis');
const logger = require('../utils/logger');

let client = null;

async function connectRedis() {
  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = redis.createClient({ url });
    
    client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });
    
    await client.connect();
    logger.info('Connected to Redis');
    return client;
  } catch (error) {
    logger.error('Redis connection error', { error: error.message });
    throw error;
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
