const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const messageController = require('../controllers/messageController');
const { validateMessage } = require('../middleware/validation');
const logger = require('../utils/logger');

// Middleware to generate trace ID for each request
router.use((req, res, next) => {
  const traceId = uuidv4();
  logger.setTraceId(traceId);
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
});

router.post('/', validateMessage, async (req, res, next) => {
  try {
    await messageController.sendMessage(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

