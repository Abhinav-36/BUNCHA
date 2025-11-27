require('dotenv').config();
const express = require('express');
const messageRouter = require('./routes/message');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'task-router-service' });
});

// Routes
app.use('/api/v1/messages', messageRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// Initialize connections and start server
async function startServer() {
  try {
    await connectRabbitMQ();
    await connectRedis();
    
    app.listen(PORT, () => {
      logger.info(`Task Router Service running on port ${PORT}`);
      console.log(`🚀 Task Router Service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

