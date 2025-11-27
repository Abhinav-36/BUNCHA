const { Client } = require('@elastic/elasticsearch');

let client = null;
const INDEX_NAME = 'message-logs';

async function connectElasticsearch() {
  const url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to Elasticsearch (attempt ${attempt}/${maxRetries})...`);
      client = new Client({ node: url });
      
      // Test connection
      const health = await client.cluster.health();
      console.log('✅ Successfully connected to Elasticsearch:', health.status);
      
      return client;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed to connect to Elasticsearch after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      console.log(`⏳ Elasticsearch not ready, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function initializeIndex() {
  try {
    // Check if index exists
    const exists = await client.indices.exists({ index: INDEX_NAME });
    
    if (!exists) {
      // Create index with mapping
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              level: { type: 'keyword' },
              service: { type: 'keyword' },
              traceId: { type: 'keyword' },
              message: { type: 'text' },
              messageId: { type: 'keyword' },
              channel: { type: 'keyword' },
              recipient: { type: 'keyword' },
              status: { type: 'keyword' },
              error: { type: 'text' },
              processingTimeMs: { type: 'integer' },
              retryCount: { type: 'integer' },
              queue: { type: 'keyword' },
              bodyHash: { type: 'keyword' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0
          }
        }
      });
      console.log(`Elasticsearch index '${INDEX_NAME}' created`);
    } else {
      console.log(`Elasticsearch index '${INDEX_NAME}' already exists`);
    }
  } catch (error) {
    console.error('Error initializing Elasticsearch index:', error.message);
    throw error;
  }
}

async function indexLog(logEntry) {
  try {
    await client.index({
      index: INDEX_NAME,
      body: logEntry
    });
  } catch (error) {
    console.error('Error indexing log:', error.message);
    throw error;
  }
}

function getClient() {
  if (!client) {
    throw new Error('Elasticsearch client not initialized');
  }
  return client;
}

module.exports = {
  connectElasticsearch,
  initializeIndex,
  indexLog,
  getClient,
  INDEX_NAME
};

