const amqp = require('amqplib');
const { indexLog } = require('./elasticsearch');

let connection = null;
let channel = null;

const LOG_QUEUE = 'log_queue';

async function connectRabbitMQ() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Declare log queue
    await channel.assertQueue(LOG_QUEUE, { durable: true });
    
    // Consume logs from queue (optional - for async log processing)
    await channel.consume(LOG_QUEUE, async (msg) => {
      if (msg) {
        try {
          const logEntry = JSON.parse(msg.content.toString());
          await indexLog(logEntry);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing log from queue:', error);
          channel.ack(msg); // Acknowledge to prevent infinite retries
        }
      }
    }, { noAck: false });
    
    console.log('Connected to RabbitMQ for log queue');
    return { connection, channel };
  } catch (error) {
    console.error('RabbitMQ connection error:', error.message);
    // Don't throw - logging service should still work without RabbitMQ
  }
}

module.exports = {
  connectRabbitMQ
};

