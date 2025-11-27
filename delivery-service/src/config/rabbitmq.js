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
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
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
    return { connection, channel, queues: QUEUES };
  } catch (error) {
    logger.error('RabbitMQ connection error', { error: error.message });
    throw error;
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

