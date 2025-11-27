const logger = require('../utils/logger');

const VALID_CHANNELS = ['email', 'sms', 'whatsapp'];

function validateMessage(req, res, next) {
  const { channel, recipient, body, subject } = req.body;

  // Validate required fields
  if (!channel) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: channel'
    });
  }

  if (!recipient) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: recipient'
    });
  }

  if (!body) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: body'
    });
  }

  // Validate channel
  if (!VALID_CHANNELS.includes(channel.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}`
    });
  }

  // Validate recipient format (basic validation)
  if (channel.toLowerCase() === 'email' && !recipient.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format for recipient'
    });
  }

  logger.info('Message validation passed', {
    channel: channel.toLowerCase(),
    recipient: recipient
  });

  next();
}

module.exports = {
  validateMessage
};

