import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment-specific config
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeEnv = process.env.NODE_ENV || 'development';
// For local development, use .env.local; for production (Heroku), use .env.production
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.local';
const envPath = path.join(__dirname, envFile);
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Enable CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false,
        credentials: true,
    })
);
// ONLY parse JSON for internal /api routes. 
// This leaves the body stream intact for the proxy to forward to OpenAI.
app.use('/api', express.json());

// 1. Cost Calculator Logic (Example for GPT-5.2)
const calculateCost = (model, input, output) => {
    const prices = {
        'gpt-5.2': { in: 1.75 / 1000000, out: 14.00 / 1000000 },
        'claude-4.5': { in: 5.00 / 1000000, out: 25.00 / 1000000 },
        'default': { in: 0, out: 0 }
    };
    const rate = prices[model] || prices['default'];
    return (input * rate.in) + (output * rate.out);
};

// 2. The Tracking Interceptor
const apiProxy = createProxyMiddleware({
    router: (req) => {
        return req.headers['x-target-url'] || process.env.PROXY_TARGET;
    },
    changeOrigin: true,
    // We will remove pathRewrite for a second to see what's happening
    on: {
        proxyReq: (proxyReq, req) => {
            req.startTime = Date.now();
            const target = req.headers['x-target-url'] || process.env.PROXY_TARGET;
            // DEBUG: See the exact URL being sent to the target
            console.log(`📡 Proxying: ${req.method} ${req.url} -> ${target}${proxyReq.path}`);
        },
        proxyRes: async (proxyRes, req, res) => {
            let body = [];
            proxyRes.on('data', (chunk) => body.push(chunk));
            proxyRes.on('end', async () => {
                const rawBody = Buffer.concat(body).toString();
                
                console.log(`📥 Response: ${proxyRes.statusCode} | Content-Type: ${proxyRes.headers['content-type']}`);

                if (proxyRes.headers['content-type']?.includes('application/json')) {
                    try {
                        const responseData = JSON.parse(rawBody);
                        const model = req.headers['x-model'] || responseData.model || 'unknown';
                        
                        // Get REAL token counts from OpenAI response
                        let inputTokens = 0;
                        let outputTokens = 0;
                        
                        if (responseData.usage) {
                            inputTokens = responseData.usage.prompt_tokens || 0;
                            outputTokens = responseData.usage.completion_tokens || 0;
                            console.log(`✅ Real tokens from OpenAI: ${inputTokens} input, ${outputTokens} output`);
                        } else {
                            // Fallback to headers if usage not in response
                            inputTokens = Number(req.headers['x-input-tokens'] || 0);
                            outputTokens = Number(req.headers['x-output-tokens'] || 0);
                            console.log(`⚠️  Using fallback tokens: ${inputTokens} input, ${outputTokens} output`);
                        }
                        
                        const estimatedCost = calculateCost(model, inputTokens, outputTokens);

                        const { error } = await supabase.from('api_usage_logs').insert({
                            user_id: req.headers['x-user-id'] || 'test_user',
                            service_name: req.headers['x-service-name'] || 'Unknown Service',
                            endpoint: req.originalUrl || req.url,
                            status_code: proxyRes.statusCode,
                            latency_ms: Date.now() - req.startTime,
                            model,
                            input_tokens: inputTokens,
                            output_tokens: outputTokens,
                            estimated_cost: estimatedCost
                        });
                        if (!error) console.log("✅ SUCCESS: Row added to Supabase");
                        else console.error("❌ SUPABASE ERROR:", error.message);
                    } catch (e) {
                        console.error("❌ PARSE ERROR:", e.message);
                    }
                } else {
                    console.log("⚠️ Skipping Log: Not a JSON response.");
                }
            });
        }
    }
});

// API endpoint for usage data
app.get('/api/usage', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('api_usage_logs')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Transform raw logs into daily aggregated data
        const dailyData = {};
        let accumulativeTotal = 0;
        
        data.forEach(log => {
            const date = new Date(log.created_at).toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = {
                    day: date,
                    daily_hits: 0,
                    daily_cost: 0,
                    accumulative_total: 0
                };
            }
            dailyData[date].daily_hits += 1;
            // Estimate cost based on latency and endpoint
            dailyData[date].daily_cost += Number(log.estimated_cost || 0);
        });
        
        // Calculate accumulative totals and convert to array
        const result = Object.values(dailyData)
            .sort((a, b) => new Date(a.day) - new Date(b.day))
            .map(day => {
                accumulativeTotal += day.daily_hits;
                return {
                    ...day,
                    accumulative_total: accumulativeTotal,
                    daily_cost: parseFloat(day.daily_cost.toFixed(3))
                };
            });
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for service breakdown
app.get('/api/services', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 100), 500);
        const offset = Math.max(Number(req.query.offset || 0), 0);

        const { data, error } = await supabase
            .from('api_usage_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        
        // Group by service and endpoint
        const serviceBreakdown = {};
        
        data.forEach(log => {
            const serviceName = log.service_name || 'Unknown Service';
            const endpoint = log.endpoint || '/';
            const userId = log.user_id || 'Unknown';
            const key = `${serviceName}::${endpoint}::${userId}`;
            
            if (!serviceBreakdown[key]) {
                serviceBreakdown[key] = {
                    service_name: serviceName,
                    endpoint: endpoint,
                    user_id: userId,
                    total_hits: 0,
                    success_count: 0,
                    error_count: 0,
                    avg_latency: 0,
                    total_latency: 0,
                    last_used: log.created_at,
                    estimated_cost: 0
                };
            }
            
            serviceBreakdown[key].total_hits += 1;
            if (log.status_code >= 200 && log.status_code < 300) {
                serviceBreakdown[key].success_count += 1;
            } else {
                serviceBreakdown[key].error_count += 1;
            }
            serviceBreakdown[key].total_latency += log.latency_ms || 0;
            serviceBreakdown[key].estimated_cost += Number(log.estimated_cost || 0);
            
            // Keep the most recent timestamp
            if (new Date(log.created_at) > new Date(serviceBreakdown[key].last_used)) {
                serviceBreakdown[key].last_used = log.created_at;
            }
        });
        
        // Calculate averages and format results
        const result = Object.values(serviceBreakdown).map(service => ({
            ...service,
            avg_latency: service.total_hits > 0 
                ? Math.round(service.total_latency / service.total_hits) 
                : 0,
            success_rate: service.total_hits > 0
                ? ((service.success_count / service.total_hits) * 100).toFixed(1)
                : 0,
            estimated_cost: parseFloat(service.estimated_cost.toFixed(4))
        })).sort((a, b) => b.total_hits - a.total_hits);
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Switch the route to handle EVERYTHING for testing (proxy)
app.use('/', apiProxy);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Gateway Live on Port ${PORT}`));