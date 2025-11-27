const { getChannel } = require('../config/rabbitmq');
const logger = require('./logger');

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

function calculateBackoff(retryCount) {
  // Exponential backoff: 1s, 2s, 4s
  return INITIAL_BACKOFF * Math.pow(2, retryCount);
}

async function scheduleRetry(message, retryCount, error) {
  if (retryCount >= MAX_RETRIES) {
    logger.error('Max retries exceeded', {
      messageId: message.messageId,
      channel: message.channel,
      retryCount,
      error: error?.message
    });
    return false;
  }

  const backoffMs = calculateBackoff(retryCount);
  const retryMessage = {
    ...message,
    retryCount: retryCount + 1,
    scheduledAt: new Date(Date.now() + backoffMs).toISOString(),
    lastError: error?.message
  };

  try {
    const channel = getChannel();
    const RETRY_QUEUE = 'retry_queue';
    
    // Send to retry queue with expiration
    await channel.sendToQueue(
      RETRY_QUEUE,
      Buffer.from(JSON.stringify(retryMessage)),
      {
        persistent: true,
        expiration: backoffMs.toString()
      }
    );

    logger.warn('Message scheduled for retry', {
      messageId: message.messageId,
      retryCount: retryCount + 1,
      backoffMs,
      channel: message.channel
    });

    return true;
  } catch (error) {
    logger.error('Failed to schedule retry', {
      error: error.message,
      messageId: message.messageId
    });
    return false;
  }
}

module.exports = {
  scheduleRetry,
  MAX_RETRIES,
  calculateBackoff
};

