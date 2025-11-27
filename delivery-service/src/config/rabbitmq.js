const amqp = require('amqplib');
const logger = require('../utils/logger');

let connection = null;
let channel = null;

const QUEUES = {
  EMAIL: 'email_delivery_queue',
  SMS: 'sms_delivery_queue',
  WHATSAPP: 'whatsapp_delivery_queue',
  RETRY: 'retry_queue'
};

async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries})...`);
      connection = await amqp.connect(url);
      channel = await connection.createChannel();
      
      // Declare queues
      await channel.assertQueue(QUEUES.EMAIL, { durable: true });
      await channel.assertQueue(QUEUES.SMS, { durable: true });
      await channel.assertQueue(QUEUES.WHATSAPP, { durable: true });
      await channel.assertQueue(QUEUES.RETRY, { durable: true });
      
      // Set prefetch to process one message at a time
      await channel.prefetch(1);
      
      logger.info('Connected to RabbitMQ and queues declared');
      console.log('✅ Successfully connected to RabbitMQ');
      return { connection, channel, queues: QUEUES };
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error('RabbitMQ connection failed after max retries', { error: error.message });
        console.error(`❌ Failed to connect to RabbitMQ after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      console.log(`⏳ RabbitMQ not ready, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function startConsumers() {
  try {
    // Require messageHandler here to avoid circular dependency
    const messageHandler = require('../handlers/messageHandler');
    
    // Consume from email queue
    await channel.consume(QUEUES.EMAIL, async (msg) => {
      if (msg) {
        await messageHandler.handleMessage(msg, 'email');
      }
    }, { noAck: false });

    // Consume from SMS queue
    await channel.consume(QUEUES.SMS, async (msg) => {
      if (msg) {
        await messageHandler.handleMessage(msg, 'sms');
      }
    }, { noAck: false });

    // Consume from WhatsApp queue
    await channel.consume(QUEUES.WHATSAPP, async (msg) => {
      if (msg) {
        await messageHandler.handleMessage(msg, 'whatsapp');
      }
    }, { noAck: false });

    // Consume from retry queue
    await channel.consume(QUEUES.RETRY, async (msg) => {
      if (msg) {
        await messageHandler.handleRetryMessage(msg);
      }
    }, { noAck: false });

    logger.info('Started consuming messages from all queues');
  } catch (error) {
    logger.error('Error starting consumers', { error: error.message });
    throw error;
  }
}

function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

module.exports = {
  connectRabbitMQ,
  startConsumers,
  getChannel
};

