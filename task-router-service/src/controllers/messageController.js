const { v4: uuidv4 } = require('uuid');
const { getChannel, getQueues } = require('../config/rabbitmq');
const { checkDuplicate } = require('../utils/duplicateDetector');
const logger = require('../utils/logger');

const CHANNEL_ROUTING = {
  email: 'email_delivery_queue',
  sms: 'sms_delivery_queue',
  whatsapp: 'whatsapp_delivery_queue'
};

async function sendMessage(req, res) {
  const startTime = Date.now();
  const { channel, recipient, body, subject, metadata } = req.body;
  const messageId = uuidv4();
  const traceId = req.traceId;

  logger.info('Received message request', {
    messageId,
    channel: channel.toLowerCase(),
    recipient: recipient.substring(0, 10) + '...'
  });

  try {
    // Check for duplicate message by body
    const isDuplicate = await checkDuplicate(body);
    if (isDuplicate) {
      logger.warn('Duplicate message rejected', { messageId, bodyHash: '...' });
      return res.status(409).json({
        success: false,
        error: 'Duplicate message detected',
        messageId
      });
    }

    // Prepare message payload
    const messagePayload = {
      messageId,
      traceId,
      channel: channel.toLowerCase(),
      recipient,  
      body,
      subject: subject || null,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    // Route to appropriate queue
    const queueName = CHANNEL_ROUTING[channel.toLowerCase()];
    if (!queueName) {
      throw new Error(`No routing defined for channel: ${channel}`);
    }

    const channel_instance = getChannel();
    await channel_instance.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(messagePayload)),
      { persistent: true }
    );

    const processingTime = Date.now() - startTime;
    logger.info('Message routed successfully', {
      messageId,
      queue: queueName,
      processingTimeMs: processingTime
    });

    res.status(202).json({
      success: true,
      message: 'Message accepted and queued for delivery',
      messageId,
      traceId,
      channel: channel.toLowerCase(),
      queuedAt: new Date().toISOString()
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to route message', {
      messageId,
      error: error.message,
      processingTimeMs: processingTime
    });

    res.status(500).json({
      success: false,
      error: 'Failed to route message',
      messageId,
      traceId
    });
  }
}

module.exports = {
  sendMessage
};

