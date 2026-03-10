# Webhook Integrations

Insight Management supports receiving data from external tools via webhooks. Each integration creates insights automatically and triggers AI processing (Layer 1).

## Environment Variables

Add these to your `.env.local`:

```bash
INTERCOM_WEBHOOK_SECRET=your-intercom-webhook-secret
ZENDESK_WEBHOOK_SECRET=your-zendesk-webhook-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

---

## Intercom

**Endpoint:** `POST /api/webhooks/intercom`

### Setup in Intercom

1. Go to **Settings > Integrations > Webhooks**
2. Set the webhook URL to `https://your-domain.com/api/webhooks/intercom`
3. Copy the **Hub Secret** and set it as `INTERCOM_WEBHOOK_SECRET`
4. Subscribe to these topics:
   - `conversation.user.created`
   - `conversation.user.replied`

### Authentication

Intercom signs requests with HMAC-SHA256 using the hub secret. The signature is sent in the `X-Hub-Signature` header as `sha256=<hex>`.

### Payload Format

```json
{
  "type": "notification_event",
  "topic": "conversation.user.created",
  "data": {
    "item": {
      "id": "123456",
      "source": {
        "body": "<p>Customer message here</p>",
        "author": {
          "name": "Jane Doe",
          "email": "jane@example.com"
        }
      }
    }
  }
}
```

### Test with curl

```bash
SECRET="your-intercom-webhook-secret"
BODY='{"type":"notification_event","topic":"conversation.user.created","data":{"item":{"id":"test-123","source":{"body":"I need help with billing","author":{"name":"Test User","email":"test@example.com"}}}}}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')

curl -X POST http://localhost:3000/api/webhooks/intercom \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature: sha256=$SIGNATURE" \
  -d "$BODY"
```

---

## Zendesk

**Endpoint:** `POST /api/webhooks/zendesk`

### Setup in Zendesk

1. Go to **Admin Center > Apps and Integrations > Webhooks**
2. Create a new webhook with URL `https://your-domain.com/api/webhooks/zendesk`
3. Set authentication to **Bearer Token** and use your `ZENDESK_WEBHOOK_SECRET` value
4. Create a **Trigger** that fires on ticket creation/update and sends to the webhook

### Authentication

Zendesk sends the shared secret via the `Authorization: Bearer <secret>` header. Alternatively, you can configure it to send via a custom `X-Zendesk-Webhook-Secret` header.

### Payload Format

Configure your Zendesk trigger to send JSON like:

```json
{
  "event_type": "ticket.created",
  "ticket": {
    "id": 12345,
    "subject": "Cannot access dashboard",
    "description": "When I try to log in I get a 500 error...",
    "requester": {
      "name": "John Smith",
      "email": "john@example.com"
    },
    "tags": ["bug", "login"],
    "priority": "high"
  }
}
```

### Test with curl

```bash
SECRET="your-zendesk-webhook-secret"

curl -X POST http://localhost:3000/api/webhooks/zendesk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  -d '{
    "event_type": "ticket.created",
    "ticket": {
      "id": 99999,
      "subject": "Test ticket from curl",
      "description": "This is a test ticket sent via curl.",
      "requester": { "name": "Test User", "email": "test@example.com" },
      "tags": ["test"],
      "priority": "normal"
    }
  }'
```

---

## Slack

**Endpoint:** `POST /api/webhooks/slack`

### Setup in Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **Event Subscriptions**, enable events
3. Set the Request URL to `https://your-domain.com/api/webhooks/slack`
   - Slack will send a `url_verification` challenge that the endpoint handles automatically
4. Subscribe to bot events:
   - `message.channels` (public channels)
   - `message.groups` (private channels, if needed)
5. Copy the **Signing Secret** from **Basic Information** and set it as `SLACK_SIGNING_SECRET`
6. Install the app to your workspace and invite the bot to relevant channels

### Authentication

Slack signs requests using HMAC-SHA256 with the signing secret. The signature is computed over `v0:{timestamp}:{body}` and sent in the `X-Slack-Signature` header. Requests older than 5 minutes are rejected.

### Filtering

The webhook only processes:
- Top-level human messages (not thread replies)
- Non-bot messages
- Messages with text content

### Payload Format

```json
{
  "type": "event_callback",
  "team_id": "T1234",
  "event": {
    "type": "message",
    "text": "We should add dark mode support",
    "user": "U1234",
    "channel": "C5678",
    "ts": "1234567890.123456"
  }
}
```

### Test with curl

```bash
SECRET="your-slack-signing-secret"
TIMESTAMP=$(date +%s)
BODY='{"type":"event_callback","team_id":"T_TEST","event":{"type":"message","text":"We need better onboarding flow","user":"U_TEST","channel":"C_FEEDBACK","ts":"'$TIMESTAMP'.000000"}}'
SIG_BASESTRING="v0:${TIMESTAMP}:${BODY}"
SIGNATURE="v0=$(echo -n "$SIG_BASESTRING" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')"

curl -X POST http://localhost:3000/api/webhooks/slack \
  -H "Content-Type: application/json" \
  -H "X-Slack-Request-Timestamp: $TIMESTAMP" \
  -H "X-Slack-Signature: $SIGNATURE" \
  -d "$BODY"
```

### URL Verification

When you first set up the Slack Event Subscription, Slack sends a verification request:

```bash
curl -X POST http://localhost:3000/api/webhooks/slack \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test-challenge-token"}'
```

Expected response: `{"challenge":"test-challenge-token"}`
