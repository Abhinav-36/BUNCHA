const crypto = require('crypto');
const { getClient } = require('../config/redis');
const logger = require('./logger');

const DUPLICATE_TTL = 3600; // 1 hour in seconds

async function checkDuplicate(body) {
  try {
    const redis = getClient();
    const bodyHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const key = `duplicate:${bodyHash}`;
    
    const exists = await redis.exists(key);
    
    if (exists) {
      logger.warn('Duplicate message detected', { bodyHash });
      return true;
    }
    
    // Set with TTL to prevent duplicates for 1 hour
    await redis.setEx(key, DUPLICATE_TTL, '1');
    return false;
  } catch (error) {
    logger.error('Error checking duplicate', { error: error.message });
    // In case of Redis error, allow message to proceed (fail open)
    return false;
  }
}

module.exports = {
  checkDuplicate
};

