# Communication Aggregator System

A 3-microservice system that receives messages from multiple sources and routes them intelligently to the appropriate communication channels (Email, SMS, WhatsApp).

## 🏗️ Architecture

The system consists of three independent microservices:

1. **Task Router Service** (Port 3000) - Entry point, validates, routes messages, handles duplicates and retries
2. **Delivery Service** (Port 3001) - Consumes messages, simulates delivery, stores in database
3. **Logging Service** (Port 4000) - Collects logs from all services, stores in Elasticsearch

### Supporting Infrastructure

- **RabbitMQ** (Port 5672, Management UI: 15672) - Message queue
- **Redis** (Port 6379) - Duplicate detection
- **PostgreSQL** (Port 5432) - Message storage
- **Elasticsearch** (Port 9200) - Log storage
- **Kibana** (Port 5601) - Log visualization

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Option 1: Docker Compose (Recommended)

1. **Clone/Navigate to the project directory**

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop all services:**
   ```bash
   docker-compose down
   ```

### Option 2: Local Development

1. **Install dependencies:**
   ```bash
   npm run setup
   ```

2. **Start infrastructure services:**
   ```bash
   docker-compose up -d rabbitmq redis postgres elasticsearch kibana
   ```

3. **Start services individually:**
   ```bash
   # Terminal 1 - Task Router Service
   cd task-router-service
   npm start

   # Terminal 2 - Delivery Service
   cd delivery-service
   npm start

   # Terminal 3 - Logging Service
   cd logging-service
   npm start
   ```

## 📡 API Endpoints

### Task Router Service

**Base URL:** `http://localhost:3000`

#### Send Message
```http
POST /api/v1/messages
Content-Type: application/json

{
  "channel": "email",
  "recipient": "user@example.com",
  "body": "Hello, this is a test message",
  "subject": "Test Subject",
  "metadata": {
    "priority": "high"
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Message accepted and queued for delivery",
  "messageId": "uuid-here",
  "traceId": "uuid-here",
  "channel": "email",
  "queuedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `409 Conflict` - Duplicate message detected
- `500 Internal Server Error` - Server error

#### Health Check
```http
GET /health
```

### Delivery Service

**Base URL:** `http://localhost:3001`

#### Health Check
```http
GET /health
```

### Logging Service

**Base URL:** `http://localhost:4000`

#### Create Log (Internal)
```http
POST /api/v1/logs
Content-Type: application/json

{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "service": "task-router-service",
  "traceId": "uuid-here",
  "message": "Message routed successfully"
}
```

#### Search Logs
```http
GET /api/v1/logs/search?query=error&level=error&service=delivery-service
```

#### Get Logs by Trace ID
```http
GET /api/v1/logs/trace/{traceId}
```

#### Health Check
```http
GET /health
```

## 📝 Example Payloads

### Email Message
```json
{
  "channel": "email",
  "recipient": "john.doe@example.com",
  "body": "Welcome to our service!",
  "subject": "Welcome Email",
  "metadata": {
    "template": "welcome",
    "userId": "12345"
  }
}
```

### SMS Message
```json
{
  "channel": "sms",
  "recipient": "+1234567890",
  "body": "Your verification code is 123456",
  "metadata": {
    "type": "verification"
  }
}
```

### WhatsApp Message
```json
{
  "channel": "whatsapp",
  "recipient": "+1234567890",
  "body": "Your order #12345 has been shipped!",
  "metadata": {
    "orderId": "12345"
  }
}
```

## 🔍 Observability

### Kibana Dashboard

1. **Access Kibana:**
   - URL: `http://localhost:5601`
   - Wait 1-2 minutes after starting Elasticsearch for index creation

2. **Create Index Pattern:**
   - Go to Management → Stack Management → Index Patterns
   - Create pattern: `message-logs`
   - Time field: `timestamp`

3. **View Logs:**
   - Go to Discover
   - Filter by `traceId` to see complete request journey
   - Filter by `service`, `level`, `channel` for specific views

### Database Queries

Connect to PostgreSQL:
```bash
docker exec -it buncha-postgres psql -U postgres -d message_delivery
```

**View all messages:**
```sql
SELECT message_id, channel, recipient, status, retry_count, created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;
```

**View failed messages:**
```sql
SELECT message_id, channel, error_message, retry_count 
FROM messages 
WHERE status = 'failed';
```

**View messages by trace ID:**
```sql
SELECT * FROM messages WHERE trace_id = 'your-trace-id';
```

## 🧪 Testing

### Using cURL

```bash
# Send email message
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "recipient": "test@example.com",
    "body": "Test message",
    "subject": "Test"
  }'

# Check health
curl http://localhost:3000/health
```

### Using Postman

Import the Postman collection from `postman/Buncha_Communication_Aggregator.postman_collection.json`

See [postman/README.md](./postman/README.md) for detailed instructions.

## 🔄 Retry Logic

- **Max Retries:** 3
- **Backoff Strategy:** Exponential (1s, 2s, 4s)
- **Retry Queue:** Messages are queued with TTL for delayed retry

## 🚫 Duplicate Detection

- **Method:** SHA-256 hash of message body
- **Storage:** Redis (1-hour TTL)
- **Response:** 409 Conflict if duplicate detected

## 📊 Message Status

Messages can have the following statuses:
- `pending` - Initial state
- `processing` - Being processed by Delivery Service
- `delivered` - Successfully delivered
- `retrying` - Scheduled for retry
- `failed` - Failed after max retries

## 🛠️ Development

### Project Structure

```
.
├── task-router-service/
│   ├── src/
│   │   ├── config/       # RabbitMQ, Redis configs
│   │   ├── controllers/  # Message controller
│   │   ├── middleware/   # Validation middleware
│   │   ├── routes/       # API routes
│   │   └── utils/        # Logger, duplicate detector, retry handler
│   ├── package.json
│   └── Dockerfile
├── delivery-service/
│   ├── src/
│   │   ├── config/       # Database, RabbitMQ configs
│   │   ├── handlers/     # Message handlers
│   │   ├── services/     # Delivery simulation
│   │   └── utils/        # Logger, retry handler
│   ├── package.json
│   └── Dockerfile
├── logging-service/
│   ├── src/
│   │   ├── config/       # Elasticsearch, RabbitMQ configs
│   │   ├── controllers/  # Log controller
│   │   └── routes/       # API routes
│   ├── package.json
│   └── Dockerfile
├── postman/              # Postman collection
├── docker-compose.yml
├── HLD.md                # High-Level Design document
└── README.md
```

### Environment Variables

Each service uses environment variables (set in docker-compose.yml):

- `RABBITMQ_URL` - RabbitMQ connection string
- `REDIS_URL` - Redis connection string
- `DATABASE_URL` - PostgreSQL connection string
- `ELASTICSEARCH_URL` - Elasticsearch connection string
- `LOGGING_SERVICE_URL` - Logging service endpoint

## 🐛 Troubleshooting

### Services not starting

1. **Check Docker logs:**
   ```bash
   docker-compose logs [service-name]
   ```

2. **Check service health:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3001/health
   curl http://localhost:4000/health
   ```

3. **Check infrastructure:**
   - RabbitMQ Management: `http://localhost:15672` (admin/admin123)
   - Elasticsearch: `http://localhost:9200/_cluster/health`
   - PostgreSQL: `docker exec -it buncha-postgres psql -U postgres -c "SELECT 1"`

### Messages not being delivered

1. Check Delivery Service logs
2. Check RabbitMQ queues in management UI
3. Check PostgreSQL for message status
4. Verify trace ID in Elasticsearch/Kibana

### Logs not appearing in Kibana

1. Wait 1-2 minutes for Elasticsearch to index
2. Verify index pattern is created
3. Check Elasticsearch health: `curl http://localhost:9200/_cluster/health`

For more troubleshooting tips, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 📚 Additional Resources

- [High-Level Design Document](./HLD.md) - Detailed architecture and design decisions
- [Postman Collection](./postman/) - API testing collection with examples
- [Quick Start Guide](./QUICK_START.md) - Quick reference for common tasks

## 🔐 Default Credentials

- **RabbitMQ Management:** admin/admin123
- **PostgreSQL:** postgres/postgres123
- **Redis:** No password (development only)

⚠️ **Note:** Change these credentials in production!

## 📄 License

ISC

## 🎯 Features

- ✅ REST API for message routing
- ✅ Duplicate message detection
- ✅ Retry mechanism with exponential backoff
- ✅ End-to-end traceability with trace IDs
- ✅ Centralized logging with Elasticsearch
- ✅ Log visualization with Kibana
- ✅ Message status tracking in PostgreSQL
- ✅ Health check endpoints
- ✅ Docker Compose setup for easy deployment

## 🚀 Next Steps

1. Start the system: `docker-compose up -d`
2. Test the API: Use Postman collection or cURL
3. View logs: Access Kibana at `http://localhost:5601`
4. Monitor queues: Access RabbitMQ Management at `http://localhost:15672`

