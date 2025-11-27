const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

async function connectDatabase() {
  const connectionString = process.env.DATABASE_URL || 
    'postgresql://postgres:postgres123@localhost:5432/message_delivery';
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to PostgreSQL (attempt ${attempt}/${maxRetries})...`);
      
      pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      logger.info('Connected to PostgreSQL database');
      console.log('✅ Successfully connected to PostgreSQL');
      return pool;
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error('Database connection failed after max retries', { error: error.message });
        console.error(`❌ Failed to connect to PostgreSQL after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      console.log(`⏳ PostgreSQL not ready, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function initializeDatabase() {
  try {
    // Create table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) UNIQUE NOT NULL,
        trace_id VARCHAR(255),
        channel VARCHAR(50) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        subject VARCHAR(500),
        metadata JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_at TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_message_id ON messages(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_trace_id ON messages(trace_id)',
      'CREATE INDEX IF NOT EXISTS idx_channel ON messages(channel)',
      'CREATE INDEX IF NOT EXISTS idx_status ON messages(status)',
      'CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at)'
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }

    logger.info('Database tables initialized');
  } catch (error) {
    logger.error('Database initialization error', { error: error.message });
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

module.exports = {
  connectDatabase,
  initializeDatabase,
  getPool
};

