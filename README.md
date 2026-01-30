# API Gateway & Usage Tracker

Track all your API calls, costs, and performance metrics in real-time.

## 🚀 Quick Start

### 1. Add Environment Variables

Add these to your `.env` file:

```env
# API Gateway Configuration
API_GATEWAY=https://halo-tracker-2c0dda3c06ff.herokuapp.com
API_TARGET=https://api.openai.com
SERVICE_NAME=YourAppName
USER_ID=your_user_id
```

### 2. Update Your API Calls

Instead of calling APIs directly, route them through the gateway:

**Before (Direct Call):**
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello!' }]
    })
});
```

**After (Tracked via Gateway):**
```javascript
const response = await fetch(`${process.env.API_GATEWAY}/v1/chat/completions`, {
    method: 'POST',
    headers: {
        // Tracking Headers
        'x-target-url': process.env.API_TARGET,
        'x-service-name': process.env.SERVICE_NAME,
        'x-user-id': process.env.USER_ID,
        'x-model': 'gpt-5.2',
        'x-input-tokens': '1500',
        'x-output-tokens': '800',
        
        // Original API Headers
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello!' }]
    })
});
```

## 📋 Required Headers

| Header | Description | Example |
|--------|-------------|---------|
| `x-target-url` | The actual API you're calling | `https://api.openai.com` |
| `x-service-name` | Your app/service identifier | `ChatBot-Pro` |
| `x-user-id` | User making the request | `user_123` |
| `x-model` | Model being used (for cost calc) | `gpt-5.2`, `claude-4.5` |
| `x-input-tokens` | Number of input tokens | `1500` |
| `x-output-tokens` | Number of output tokens | `800` |

## 💰 Supported Models & Pricing

| Model | Input Cost | Output Cost |
|-------|------------|-------------|
| `gpt-5.2` | $1.75 / 1M tokens | $14.00 / 1M tokens |
| `claude-4.5` | $5.00 / 1M tokens | $25.00 / 1M tokens |

## 📊 Examples

### Example 1: OpenAI Chat Completion

```javascript
// .env
API_GATEWAY=https://halo-tracker-2c0dda3c06ff.herokuapp.com
API_TARGET=https://api.openai.com
SERVICE_NAME=ChatBot-App
USER_ID=user_456

// app.js
async function getChatResponse(userMessage) {
    const response = await fetch(`${process.env.API_GATEWAY}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'x-target-url': process.env.API_TARGET,
            'x-service-name': process.env.SERVICE_NAME,
            'x-user-id': process.env.USER_ID,
            'x-model': 'gpt-5.2',
            'x-input-tokens': '2000',
            'x-output-tokens': '500',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: userMessage }
            ]
        })
    });
    
    return await response.json();
}
```

### Example 2: Anthropic Claude API

```javascript
// .env
API_GATEWAY=https://halo-tracker-2c0dda3c06ff.herokuapp.com
API_TARGET=https://api.anthropic.com
SERVICE_NAME=Claude-Assistant
USER_ID=user_789

// app.js
async function callClaude(prompt) {
    const response = await fetch(`${process.env.API_GATEWAY}/v1/messages`, {
        method: 'POST',
        headers: {
            'x-target-url': process.env.API_TARGET,
            'x-service-name': process.env.SERVICE_NAME,
            'x-user-id': process.env.USER_ID,
            'x-model': 'claude-4.5',
            'x-input-tokens': '3000',
            'x-output-tokens': '1000',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    
    return await response.json();
}
```

### Example 3: Dynamic Token Counting

```javascript
import { encode } from 'gpt-tokenizer';

async function smartAPICall(messages, userId) {
    // Calculate input tokens
    const messageText = messages.map(m => m.content).join(' ');
    const inputTokens = encode(messageText).length;
    
    const response = await fetch(`${process.env.API_GATEWAY}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'x-target-url': process.env.API_TARGET,
            'x-service-name': process.env.SERVICE_NAME,
            'x-user-id': userId,
            'x-model': 'gpt-5.2',
            'x-input-tokens': String(inputTokens),
            'x-output-tokens': '0', // Will be updated from response
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: messages
        })
    });
    
    const data = await response.json();
    console.log(`Actual tokens used: ${data.usage.total_tokens}`);
    
    return data;
}
```

### Example 4: Multiple Services in One App

```javascript
// .env
API_GATEWAY=https://halo-tracker-2c0dda3c06ff.herokuapp.com
SERVICE_NAME=Multi-Service-App

// services/openai.js
export async function callOpenAI(prompt, userId) {
    return fetch(`${process.env.API_GATEWAY}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'x-target-url': 'https://api.openai.com',
            'x-service-name': `${process.env.SERVICE_NAME}-OpenAI`,
            'x-user-id': userId,
            'x-model': 'gpt-5.2',
            'x-input-tokens': '1000',
            'x-output-tokens': '500',
            'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: prompt }] })
    }).then(r => r.json());
}

// services/anthropic.js
export async function callClaude(prompt, userId) {
    return fetch(`${process.env.API_GATEWAY}/v1/messages`, {
        method: 'POST',
        headers: {
            'x-target-url': 'https://api.anthropic.com',
            'x-service-name': `${process.env.SERVICE_NAME}-Claude`,
            'x-user-id': userId,
            'x-model': 'claude-4.5',
            'x-input-tokens': '1200',
            'x-output-tokens': '600',
            'x-api-key': process.env.ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: 'claude-3-opus', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
    }).then(r => r.json());
}
```

### Example 5: Express.js Middleware

```javascript
// middleware/apiTracker.js
export function createTrackedFetch(serviceName) {
    return async function(endpoint, options = {}, metadata = {}) {
        const headers = {
            ...options.headers,
            'x-target-url': metadata.targetUrl || process.env.API_TARGET,
            'x-service-name': serviceName,
            'x-user-id': metadata.userId || 'system',
            'x-model': metadata.model || 'gpt-5.2',
            'x-input-tokens': String(metadata.inputTokens || 0),
            'x-output-tokens': String(metadata.outputTokens || 0)
        };
        
        return fetch(`${process.env.API_GATEWAY}${endpoint}`, {
            ...options,
            headers
        });
    };
}

// routes/chat.js
import { createTrackedFetch } from '../middleware/apiTracker.js';
const trackedFetch = createTrackedFetch('Express-ChatAPI');

app.post('/chat', async (req, res) => {
    const response = await trackedFetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: req.body.messages
        })
    }, {
        userId: req.user.id,
        model: 'gpt-5.2',
        inputTokens: 1500,
        outputTokens: 800
    });
    
    const data = await response.json();
    res.json(data);
});
```

## 📈 View Analytics

Access your dashboard to see:
- **Real-time costs** per service
- **Request volume** and trends
- **Performance metrics** (latency, success rate)
- **Service breakdown** by endpoint

Dashboard URL: **https://halo-tracker-nu.vercel.app**

## 🔧 Additional Endpoints

### Check Gateway Health
```bash
GET https://halo-tracker-2c0dda3c06ff.herokuapp.com/api/health
```

### Get Usage Data
```bash
GET https://halo-tracker-2c0dda3c06ff.herokuapp.com/api/usage
```

### Get Service Breakdown
```bash
GET https://halo-tracker-2c0dda3c06ff.herokuapp.com/api/services
```

## 🆘 Support

Questions? Contact the platform team or check the dashboard for real-time monitoring.
