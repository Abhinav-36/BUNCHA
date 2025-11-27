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

function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

function getQueues() {
  return QUEUES;
}

module.exports = {
  connectRabbitMQ,
  getChannel,
  getQueues
};

