const express = require('express');
const router = express.Router();
const { indexLog } = require('../config/elasticsearch');
const logController = require('../controllers/logController');

// POST /api/v1/logs - Receive log entry
router.post('/', async (req, res, next) => {
  try {
    await logController.createLog(req, res);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/logs/search - Search logs (optional endpoint for testing)
router.get('/search', async (req, res, next) => {
  try {
    await logController.searchLogs(req, res);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/logs/trace/:traceId - Get logs by trace ID
router.get('/trace/:traceId', async (req, res, next) => {
  try {
    await logController.getLogsByTrace(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

