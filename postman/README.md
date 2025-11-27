# Postman Collection for Communication Aggregator System

This folder contains the Postman collection for testing all API endpoints in the Communication Aggregator System.

## Import Instructions

1. **Open Postman**
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `Buncha_Communication_Aggregator.postman_collection.json`
5. Click **Import**

## Collection Structure

The collection is organized into three main folders:

### 1. Task Router Service
- **Send Email Message** - Send an email message
- **Send SMS Message** - Send an SMS message
- **Send WhatsApp Message** - Send a WhatsApp message
- **Health Check** - Check service health
- **Test Duplicate Detection** - Test duplicate message detection
- **Invalid Channel** - Test validation (should return 400)
- **Missing Required Fields** - Test validation (should return 400)

### 2. Delivery Service
- **Health Check** - Check service health

### 3. Logging Service
- **Health Check** - Check service health
- **Search Logs** - Search logs with filters
- **Get Logs by Trace ID** - Get all logs for a trace ID
- **Search Logs by Service** - Filter logs by service name
- **Search All Logs** - Get all logs

## Environment Variables

The collection uses the following variables (set automatically):

- `base_url` - Task Router Service URL (default: `http://localhost:3000`)
- `delivery_service_url` - Delivery Service URL (default: `http://localhost:3001`)
- `logging_service_url` - Logging Service URL (default: `http://localhost:4000`)

## Usage Examples

### 1. Send a Message

1. Open **Task Router Service** → **Send Email Message**
2. Click **Send**
3. Copy the `traceId` from the response
4. Use this `traceId` in **Logging Service** → **Get Logs by Trace ID**

### 2. Test Duplicate Detection

1. Send **Test Duplicate Detection** request
2. Should return `202 Accepted` with `messageId` and `traceId`
3. Send the same request again immediately
4. Should return `409 Conflict` (duplicate detected)

### 3. View Complete Request Journey

1. Send any message (Email/SMS/WhatsApp)
2. Copy the `traceId` from response
3. Open **Logging Service** → **Get Logs by Trace ID**
4. Replace `:traceId` in URL with the copied trace ID
5. Click **Send**
6. View all logs for that request across all services

### 4. Search Error Logs

1. Open **Logging Service** → **Search Logs**
2. The query parameter `level=error` is already set
3. Click **Send**
4. View all error logs across all services

## Expected Responses

### Success Response (202 Accepted)
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

### Duplicate Response (409 Conflict)
```json
{
  "success": false,
  "error": "Duplicate message detected",
  "messageId": "uuid-here"
}
```

### Validation Error (400 Bad Request)
```json
{
  "success": false,
  "error": "Missing required field: recipient"
}
```

### Search Logs Response
```json
{
  "success": true,
  "total": 10,
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00.000Z",
      "level": "info",
      "service": "task-router-service",
      "traceId": "uuid-here",
      "message": "Message routed successfully"
    }
  ]
}
```

## Tips

1. **Save traceId**: After sending a message, save the `traceId` to track the complete journey
2. **Use Search Filters**: Combine multiple query parameters for precise log searches
3. **Check Health**: Use health check endpoints to verify services are running
4. **Test Validation**: Use the validation test requests to ensure error handling works

## Troubleshooting

- **Connection Refused**: Ensure all services are running (`docker-compose ps`)
- **404 Not Found**: Check the URL and ensure the service is accessible
- **500 Internal Server Error**: Check service logs (`docker-compose logs [service-name]`)
- **Empty Search Results**: Wait a few seconds for logs to be indexed in Elasticsearch

