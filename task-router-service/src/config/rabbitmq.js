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
    
    logger.info('Connected to RabbitMQ and queues declared');
    return { connection, channel, queues: QUEUES };
  } catch (error) {
    logger.error('RabbitMQ connection error', { error: error.message });
    throw error;
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

