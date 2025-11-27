const { getPool } = require('../config/database');
const { getChannel } = require('../config/rabbitmq');
const { deliverEmail, deliverSMS, deliverWhatsApp } = require('../services/deliveryService');
const logger = require('../utils/logger');
const { scheduleRetry, MAX_RETRIES } = require('../utils/retryHandler');

const CHANNEL_ROUTING = {
  email: 'email_delivery_queue',
  sms: 'sms_delivery_queue',
  whatsapp: 'whatsapp_delivery_queue'
};

async function handleMessage(msg, channelType) {
  const message = JSON.parse(msg.content.toString());
  logger.setTraceId(message.traceId);
  
  const startTime = Date.now();
  
  try {
    logger.info('Processing message', {
      messageId: message.messageId,
      channel: message.channel,
      retryCount: message.retryCount || 0
    });

    // Store message in database with pending status
    await storeMessage(message, 'processing');

    // Deliver message based on channel
    let result;
    switch (message.channel) {
      case 'email':
        result = await deliverEmail(message);
        break;
      case 'sms':
        result = await deliverSMS(message);
        break;
      case 'whatsapp':
        result = await deliverWhatsApp(message);
        break;
      default:
        throw new Error(`Unknown channel: ${message.channel}`);
    }

    const processingTime = Date.now() - startTime;

    if (result.success) {
      // Update message status to delivered
      await updateMessageStatus(message.messageId, 'delivered', null);
      
      logger.info('Message delivered successfully', {
        messageId: message.messageId,
        channel: message.channel,
        processingTimeMs: processingTime
      });
      
      // Acknowledge message
      getChannel().ack(msg);
    } else {
      // Handle retry
      const retryCount = message.retryCount || 0;
      const retryScheduled = await scheduleRetry(message, retryCount, new Error(result.error));
      
      if (retryScheduled) {
        await updateMessageStatus(message.messageId, 'retrying', result.error, retryCount + 1);
        logger.warn('Message scheduled for retry', {
          messageId: message.messageId,
          retryCount: retryCount + 1
        });
      } else {
        await updateMessageStatus(message.messageId, 'failed', result.error, retryCount);
        logger.error('Message failed after max retries', {
          messageId: message.messageId,
          retryCount
        });
      }
      
      // Acknowledge message (even if failed, to prevent infinite loop)
      getChannel().ack(msg);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error processing message', {
      messageId: message.messageId,
      error: error.message,
      processingTimeMs: processingTime
    });

    // Try to retry
    const retryCount = message.retryCount || 0;
    const retryScheduled = await scheduleRetry(message, retryCount, error);
    
    if (retryScheduled) {
      await updateMessageStatus(message.messageId, 'retrying', error.message, retryCount + 1);
    } else {
      await updateMessageStatus(message.messageId, 'failed', error.message, retryCount);
    }
    
    getChannel().ack(msg);
  }
}

async function handleRetryMessage(msg) {
  const message = JSON.parse(msg.content.toString());
  logger.setTraceId(message.traceId);
  
  // Check if scheduled time has passed
  if (message.scheduledAt) {
    const scheduledTime = new Date(message.scheduledAt).getTime();
    const now = Date.now();
    
    if (now < scheduledTime) {
      // Not time yet, requeue with delay
      const delay = scheduledTime - now;
      setTimeout(() => {
        getChannel().sendToQueue(
          CHANNEL_ROUTING[message.channel],
          Buffer.from(JSON.stringify(message)),
          { persistent: true }
        );
        getChannel().ack(msg);
      }, delay);
      return;
    }
  }
  
  // Process retry
  const queueName = CHANNEL_ROUTING[message.channel];
  if (queueName) {
    await getChannel().sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }
  
  getChannel().ack(msg);
}

async function storeMessage(message, status) {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO messages (
        message_id, trace_id, channel, recipient, body, subject, 
        metadata, status, retry_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (message_id) DO UPDATE SET
        status = EXCLUDED.status,
        retry_count = EXCLUDED.retry_count
    `;
    
    await pool.query(query, [
      message.messageId,
      message.traceId,
      message.channel,
      message.recipient,
      message.body,
      message.subject,
      JSON.stringify(message.metadata || {}),
      status,
      message.retryCount || 0,
      new Date(message.timestamp || Date.now())
    ]);
  } catch (error) {
    logger.error('Error storing message', {
      messageId: message.messageId,
      error: error.message
    });
    throw error;
  }
}

async function updateMessageStatus(messageId, status, errorMessage = null, retryCount = null) {
  try {
    const pool = getPool();
    const updates = ['status = $1'];
    const params = [status];
    let paramIndex = 2;
    
    if (errorMessage !== null) {
      updates.push(`error_message = $${paramIndex}`);
      params.push(errorMessage);
      paramIndex++;
    }
    
    if (retryCount !== null) {
      updates.push(`retry_count = $${paramIndex}`);
      params.push(retryCount);
      paramIndex++;
    }
    
    if (status === 'delivered') {
      updates.push('delivered_at = CURRENT_TIMESTAMP');
    }
    
    params.push(messageId);
    const query = `UPDATE messages SET ${updates.join(', ')} WHERE message_id = $${paramIndex}`;
    
    await pool.query(query, params);
  } catch (error) {
    logger.error('Error updating message status', {
      messageId,
      error: error.message
    });
  }
}

module.exports = {
  handleMessage,
  handleRetryMessage
};

