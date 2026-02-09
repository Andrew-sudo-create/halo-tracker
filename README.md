# Halo Tracker - API Gateway & Usage Analytics

Track all your API calls, costs, and performance metrics in real-time across multiple AI providers.

## 🎯 Features

- **Real-time Usage Tracking** - Monitor API calls across OpenAI, Anthropic, and other providers
- **Automatic Cost Calculation** - Track spending with accurate token-based pricing
- **Multi-Service Support** - Track multiple services and endpoints from a single dashboard
- **Token Usage Analytics** - Automatic extraction of token counts from API responses
- **Beautiful Dashboard** - View analytics, trends, and breakdowns in real-time

## 🏗️ Architecture

- **Backend** (Node.js + Express): API gateway with request proxying and Supabase logging
- **Frontend** (Next.js + shadcn/ui): Analytics dashboard with real-time metrics
- **Database** (Supabase): Stores usage logs and pricing data with RLS policies

## 🚀 Quick Start

### 1. Environment Setup

Create `.env` files for your services:

```env
# For your application using the gateway
API_GATEWAY=https://your-backend-url.herokuapp.com
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

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env.local

# Add your Supabase credentials to .env.local
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
NODE_ENV=development

npm start
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhyour-backend-urlhboard.

## 📋 API Headers

When routing requests through the gateway, include these headers:

| Header | Description | Required | Example |
|--------|-------------|----------|---------|
| `x-target-url` | The actual API endpoint | ✅ | `https://api.openai.com` |
| `x-service-name` | Your app/service identifier | ✅ | `ChatBot-Pro` |
| `x-user-id` | User making the request | ✅ | `user_123` |
| `x-model` | Model being used | Optional* | `gpt-4`, `claude-3-opus` |
| `x-input-tokens` | Number of input tokens | Optional* | `1500` |
| `x-output-tokens` | Number of output tokens | Optional* | `800` |

*Auto-extracted from OpenAI responses. Provide for other APIs or as fallback.

## 💰 Pricing Configuration

Pricing is stored in Supabase `model_pricing` table. The system supports:
- Multiple pricing tiers (standard, batch, etc.)
- Different categories (text, image, audio)
- Cached input pricing
- Per-million token pricing

Example pricing entry:
```sql
INSERT INTO model_pricing (model, tier, category, input_per_million, output_per_million)
VALUES ('gpt-4', 'standard', 'text', 0.03, 0.06);
```

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
API_GATEWAY=https://your-backend-url.herokuapp.com
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
    # Halo Tracker - API Gateway & Usage Analytics

    Halo Tracker is an API gateway that proxies requests to AI providers and logs usage (requests, latency, tokens, and cost) to Supabase so you can visualize usage in the dashboard.

    ## How to use the Gateway URL (ask Gemini)

    Ask Gemini something like this and follow the steps it returns:

    "I have an API gateway URL and I want to route my OpenAI (or Anthropic) requests through it. Show me how to update my existing code to use the gateway URL, including required headers like x-target-url, x-service-name, and x-user-id. Use fetch examples in JavaScript."

    You’ll then:
    1. Set your gateway URL in your app’s environment variables.
    2. Update API calls to hit the gateway URL instead of the provider directly.
    3. Include the tracking headers so usage is recorded.
        body: JSON.stringify({
