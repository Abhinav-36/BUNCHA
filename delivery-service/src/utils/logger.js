const axios = require('axios');

const LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://localhost:4000';

class Logger {
  constructor() {
    this.traceId = null;
  }

  setTraceId(traceId) {
    this.traceId = traceId;
  }

  async sendLog(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'delivery-service',
      traceId: this.traceId || null,
      message,
      ...metadata
    };

    try {
      // Fire and forget - don't block on logging
      axios.post(`${LOGGING_SERVICE_URL}/api/v1/logs`, logEntry, {
        timeout: 1000
      }).catch(err => {
        // Silently fail - logging should not break the main flow
        console.error('Failed to send log to logging service:', err.message);
      });
    } catch (error) {
      // Fallback to console if logging service is unavailable
      console.error('Failed to send log to logging service:', error.message);
      console.log(JSON.stringify(logEntry));
    }
  }

  async info(message, metadata = {}) {
    await this.sendLog('info', message, metadata);
  }

  async error(message, metadata = {}) {
    await this.sendLog('error', message, metadata);
  }

  async warn(message, metadata = {}) {
    await this.sendLog('warn', message, metadata);
  }

  async debug(message, metadata = {}) {
    await this.sendLog('debug', message, metadata);
  }
}

module.exports = new Logger();

