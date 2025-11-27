require('dotenv').config();
const express = require('express');
const logRoutes = require('./routes/logs');
const { connectElasticsearch, initializeIndex } = require('./config/elasticsearch');
const { connectRabbitMQ } = require('./config/rabbitmq');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'logging-service' });
});

// Routes
app.use('/api/v1/logs', logRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// Initialize connections and start server
async function startServer() {
  try {
    await connectElasticsearch();
    await initializeIndex();
    await connectRabbitMQ();
    
    app.listen(PORT, () => {
      console.log(`🚀 Logging Service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

