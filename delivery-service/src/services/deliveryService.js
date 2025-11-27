const logger = require('../utils/logger');

// Simulate delivery with random success/failure for demonstration
function simulateDelivery(channel, message) {
  // Simulate network delay
  const delay = Math.random() * 1000 + 500; // 500-1500ms
  
  // Simulate 90% success rate for demo purposes
  const success = Math.random() > 0.1;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (success) {
        logger.info(`Message delivered via ${channel}`, {
          messageId: message.messageId,
          recipient: message.recipient.substring(0, 10) + '...'
        });
        resolve({ success: true, deliveryTime: delay });
      } else {
        const error = `Simulated ${channel} delivery failure`;
        logger.error(`Message delivery failed via ${channel}`, {
          messageId: message.messageId,
          error
        });
        resolve({ success: false, error, deliveryTime: delay });
      }
    }, delay);
  });
}

async function deliverEmail(message) {
  logger.info('Processing email delivery', { messageId: message.messageId });
  return simulateDelivery('email', message);
}

async function deliverSMS(message) {
  logger.info('Processing SMS delivery', { messageId: message.messageId });
  return simulateDelivery('sms', message);
}

async function deliverWhatsApp(message) {
  logger.info('Processing WhatsApp delivery', { messageId: message.messageId });
  return simulateDelivery('whatsapp', message);
}

module.exports = {
  deliverEmail,
  deliverSMS,
  deliverWhatsApp
};

