# High-Level Design (HLD)
## Communication Aggregator System

---

## 1. Architecture Overview

The Communication Aggregator System is a 3-microservice architecture designed to receive messages from multiple sources and route them intelligently to the appropriate communication channels (Email, SMS, WhatsApp).

### System Components

1. **Task Router Service** (Port 3000)
   - Entry point for all incoming messages
   - Validates and routes messages
   - Handles duplicate detection and retry logic

2. **Delivery Service** (Port 3001)
   - Consumes messages from queues
   - Simulates message delivery
   - Stores delivery status in PostgreSQL

3. **Logging Service** (Port 4000)
   - Collects logs from all services
   - Stores logs in Elasticsearch
   - Provides observability and traceability

### Supporting Infrastructure

- **RabbitMQ**: Message queue for async communication
- **Redis**: In-memory store for duplicate detection
- **PostgreSQL**: Persistent storage for delivery records
- **Elasticsearch**: Log storage and search
- **Kibana**: Log visualization (Port 5601)

---

## 2. Architecture Diagram

<img width="3264" height="1970" alt="Communication Aggregator HLD (2)" src="https://github.com/user-attachments/assets/64e8e4e7-5009-4cf7-8962-3151a1206a15" />

---

## 3. Data Flow

### Message Flow (Happy Path)

1. **Client Request**
   - Client sends POST request to Task Router Service
   - Payload: `{ channel, recipient, body, subject?, metadata? }`

2. **Task Router Processing**
   - Validates payload (required fields, channel type, format)
   - Generates unique `messageId` and `traceId`
   - Checks for duplicate message body (Redis)
   - Routes message to appropriate RabbitMQ queue based on channel
   - Sends log to Logging Service

3. **Delivery Service Processing**
   - Consumes message from queue
   - Stores message in PostgreSQL with status 'processing'
   - Simulates delivery (Email/SMS/WhatsApp)
   - Updates status to 'delivered' or 'failed'
   - Sends logs to Logging Service

4. **Logging Service**
   - Receives logs from all services
   - Indexes logs in Elasticsearch with traceId
   - Enables full traceability via Kibana

### Retry Flow

1. **Delivery Failure**
   - Delivery Service detects failure
   - Checks retry count (< 3)
   - Calculates exponential backoff (1s, 2s, 4s)
   - Sends message to retry_queue with TTL

2. **Retry Processing**
   - Retry queue consumer checks scheduled time
   - Re-routes message to appropriate delivery queue
   - Process repeats until success or max retries

### Duplicate Detection Flow

1. **Message Received**
   - Task Router generates SHA-256 hash of message body
   - Checks Redis for existing hash key
   - If exists: Reject with 409 Conflict
   - If not: Store hash in Redis with 1-hour TTL

---

## 4. Communication Pattern

### Pattern: Message Queue (RabbitMQ)

**Justification:**
- **Asynchronous Processing**: Decouples Task Router from Delivery Service
- **Reliability**: Messages are persisted and survive service restarts
- **Scalability**: Multiple Delivery Service instances can consume from queues
- **Retry Support**: Built-in retry mechanisms with dead-letter queues
- **Channel Isolation**: Separate queues for each channel enable independent scaling

**Alternative Considered:**
- **HTTP Direct Calls**: Would create tight coupling and synchronous blocking
- **Redis Pub/Sub**: Less reliable, no message persistence
- **Kafka**: Overkill for this use case, more complex setup

### Communication Details

1. **Task Router → Delivery Service**
   - **Method**: RabbitMQ Queues
   - **Queues**: `email_delivery_queue`, `sms_delivery_queue`, `whatsapp_delivery_queue`
   - **Pattern**: Producer-Consumer with persistent messages

2. **Task Router → Logging Service**
   - **Method**: HTTP REST API (synchronous)
   - **Endpoint**: `POST /api/v1/logs`
   - **Reason**: Logs need immediate indexing, low latency acceptable

3. **Delivery Service → Logging Service**
   - **Method**: HTTP REST API (synchronous)
   - **Endpoint**: `POST /api/v1/logs`
   - **Reason**: Same as above

4. **Task Router → Redis**
   - **Method**: Direct connection
   - **Purpose**: Duplicate detection (in-memory, fast lookups)

5. **Delivery Service → PostgreSQL**
   - **Method**: Direct connection (pg library)
   - **Purpose**: Persistent storage of delivery records

6. **Logging Service → Elasticsearch**
   - **Method**: Elasticsearch REST API
   - **Purpose**: Log indexing and search

---

## 5. Key Design Decisions

### 5.1 Duplicate Detection
- **Method**: SHA-256 hash of message body
- **Storage**: Redis with 1-hour TTL
- **Rationale**: Fast in-memory lookups, automatic expiration prevents false positives

### 5.2 Retry Strategy
- **Max Retries**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Storage**: RabbitMQ retry queue with TTL
- **Rationale**: Handles transient failures, prevents overwhelming services

### 5.3 Traceability
- **Trace ID**: UUID v4 generated per request
- **Propagation**: Passed through all services via message payload
- **Storage**: Elasticsearch with traceId field
- **Rationale**: Enables end-to-end request tracking in Kibana

### 5.4 Message Persistence
- **Task Router**: No persistence (stateless)
- **Delivery Service**: PostgreSQL for delivery records
- **Logging Service**: Elasticsearch for all logs
- **Rationale**: Different storage needs for different data types

---

## 6. Scalability Considerations

1. **Horizontal Scaling**
   - Task Router: Stateless, can run multiple instances
   - Delivery Service: Multiple consumers from same queue (load balancing)
   - Logging Service: Stateless, can run multiple instances

2. **Queue Management**
   - RabbitMQ handles message distribution across consumers
   - Prefetch set to 1 for fair distribution

3. **Database**
   - PostgreSQL can be scaled with read replicas
   - Indexes optimized for common queries

---

## 7. Error Handling

1. **Validation Errors**: 400 Bad Request
2. **Duplicate Messages**: 409 Conflict
3. **Service Unavailable**: 503 Service Unavailable
4. **Max Retries Exceeded**: Message marked as 'failed' in database
5. **Logging Failures**: Fallback to console logging

---

## 8. Security Considerations

1. **Input Validation**: All inputs validated before processing
2. **SQL Injection**: Parameterized queries
3. **Message Privacy**: Recipient addresses partially masked in logs
4. **Service Authentication**: Environment variables for credentials (should use secrets in production)

---

## 9. Monitoring & Observability

1. **Health Checks**: `/health` endpoint on all services
2. **Structured Logging**: JSON format with traceId, service, level, message
3. **Elasticsearch**: Centralized log storage
4. **Kibana**: Dashboard for log visualization and troubleshooting
5. **Trace IDs**: End-to-end request tracking

---

## 10. Future Enhancements

1. **Dead Letter Queue**: For permanently failed messages
2. **Rate Limiting**: Per channel or per recipient
3. **Message Priority**: High-priority message queues
4. **Webhooks**: Notify clients on delivery status
5. **Metrics**: Prometheus + Grafana for system metrics
6. **Circuit Breaker**: Prevent cascading failures
7. **API Gateway**: Single entry point with authentication

