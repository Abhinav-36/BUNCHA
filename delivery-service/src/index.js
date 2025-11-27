require('dotenv').config();
const express = require('express');
const { connectDatabase, initializeDatabase } = require('./config/database');
const { connectRabbitMQ, startConsumers } = require('./config/rabbitmq');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'delivery-service' });
});

// Initialize connections and start server
async function startServer() {
  try {
    await connectDatabase();
    await initializeDatabase();
    await connectRabbitMQ();
    await startConsumers();
    
    app.listen(PORT, () => {
      logger.info(`Delivery Service running on port ${PORT}`);
      console.log(`🚀 Delivery Service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

