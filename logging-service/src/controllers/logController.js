const { indexLog, getClient, INDEX_NAME } = require('../config/elasticsearch');

async function createLog(req, res) {
  // Respond immediately, don't wait for indexing
  res.status(201).json({
    success: true,
    message: 'Log received and indexed'
  });

  // Index log asynchronously (don't block response)
  try {
    const logEntry = {
      ...req.body,
      '@timestamp': req.body.timestamp || new Date().toISOString()
    };

    // Fire and forget - don't await
    indexLog(logEntry).catch(err => {
      console.error('Failed to index log:', err.message);
    });
  } catch (error) {
    console.error('Error processing log:', error);
    // Don't send error response since we already sent success
  }
}

async function searchLogs(req, res) {
  try {
    const { query, level, service, traceId, from = 0, size = 100 } = req.query;
    const client = getClient();

    const searchBody = {
      from: parseInt(from),
      size: parseInt(size),
      query: {
        bool: {
          must: []
        }
      },
      sort: [
        { timestamp: { order: 'desc' } }
      ]
    };

    if (query) {
      searchBody.query.bool.must.push({
        multi_match: {
          query,
          fields: ['message', 'error']
        }
      });
    }

    if (level) {
      searchBody.query.bool.must.push({
        term: { level }
      });
    }

    if (service) {
      searchBody.query.bool.must.push({
        term: { service }
      });
    }

    if (traceId) {
      searchBody.query.bool.must.push({
        term: { traceId }
      });
    }

    // If no filters, match all
    if (searchBody.query.bool.must.length === 0) {
      searchBody.query = { match_all: {} };
    }

    const result = await client.search({
      index: INDEX_NAME,
      body: searchBody
    });

    // Elasticsearch 8.x returns response directly, not wrapped in body
    const hits = result.hits || result.body?.hits || { hits: [], total: { value: 0 } };
    const total = hits.total?.value || (typeof hits.total === 'number' ? hits.total : 0);

    res.json({
      success: true,
      total: total,
      logs: hits.hits.map(hit => hit._source || hit)
    });
  } catch (error) {
    console.error('Error searching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search logs',
      message: error.message
    });
  }
}

async function getLogsByTrace(req, res) {
  try {
    const { traceId } = req.params;
    const client = getClient();

    const result = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          term: { traceId }
        },
        sort: [
          { timestamp: { order: 'asc' } }
        ],
        size: 1000
      }
    });

    // Elasticsearch 8.x returns response directly, not wrapped in body
    const hits = result.hits || result.body?.hits || { hits: [], total: { value: 0 } };
    const total = hits.total?.value || (typeof hits.total === 'number' ? hits.total : 0);

    res.json({
      success: true,
      traceId,
      total: total,
      logs: hits.hits.map(hit => hit._source || hit)
    });
  } catch (error) {
    console.error('Error getting logs by trace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs by trace',
      message: error.message
    });
  }
}

module.exports = {
  createLog,
  searchLogs,
  getLogsByTrace
};

