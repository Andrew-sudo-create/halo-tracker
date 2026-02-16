import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from 'console';
import zlib from 'zlib';

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

const PRICING_TABLE = 'model_pricing';
const PRICING_CACHE_TTL_MS = 5 * 60 * 1000;
let pricingCache = new Map();
let pricingCacheLoadedAt = 0;
let pricingCacheLoading = null;

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

// 1. Cost Calculator Logic (Supabase pricing table)
const ensurePricingCache = async () => {
    const cacheAge = Date.now() - pricingCacheLoadedAt;
    if (pricingCache.size && cacheAge < PRICING_CACHE_TTL_MS) return;
    if (pricingCacheLoading) return pricingCacheLoading;

    pricingCacheLoading = (async () => {
        const { data, error } = await supabase
            .from(PRICING_TABLE)
            .select('model,tier,category,input_per_million,output_per_million,cached_input_per_million');

        if (error) {
            console.error('❌ PRICING LOAD ERROR:', error.message);
            return;
        }

        const nextCache = new Map();
        data.forEach((row) => {
            const modelKey = String(row.model || '').toLowerCase();
            const tierKey = String(row.tier || 'standard').toLowerCase();
            const categoryKey = String(row.category || 'text').toLowerCase();
            const key = `${tierKey}:${categoryKey}:${modelKey}`;
            nextCache.set(key, {
                input: Number(row.input_per_million || 0) / 1_000_000,
                output: Number(row.output_per_million || 0) / 1_000_000,
                cachedInput: Number(row.cached_input_per_million || 0) / 1_000_000,
            });
        });

        pricingCache = nextCache;
        pricingCacheLoadedAt = Date.now();
    })();

    await pricingCacheLoading;
    pricingCacheLoading = null;
};

const getPricingRate = (model, tier = 'standard', category = 'text') => {
    if (!model) return null;
    const normalizedModel = String(model).toLowerCase();
    const normalizedTier = String(tier).toLowerCase();
    const normalizedCategory = String(category).toLowerCase();
    const key = `${normalizedTier}:${normalizedCategory}:${normalizedModel}`;
    if (pricingCache.has(key)) return pricingCache.get(key);

    const withoutLatest = normalizedModel.replace(/-latest$/i, '');
    const withoutDate = normalizedModel.replace(/-\d{4}-\d{2}-\d{2}$/i, '');
    const candidates = [withoutLatest, withoutDate];
    for (const candidate of candidates) {
        const candidateKey = `${normalizedTier}:${normalizedCategory}:${candidate}`;
        if (pricingCache.has(candidateKey)) return pricingCache.get(candidateKey);
    }
    return null;
};

const calculateCost = (model, input, output, tier = 'standard', category = 'text') => {
    const rate = getPricingRate(model, tier, category);
    if (!rate) return 0;
    const inputTokens = Number(input || 0);
    const outputTokens = Number(output || 0);
    return (inputTokens * rate.input) + (outputTokens * rate.output);
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
                let rawBody = '';
                const buffer = Buffer.concat(body);
                const contentEncoding = (proxyRes.headers['content-encoding'] || '').toLowerCase();

                const tryDecode = (buf) => buf.toString('utf8');
                const tryGunzip = () => zlib.gunzipSync(buffer).toString('utf8');
                const tryInflate = () => zlib.inflateSync(buffer).toString('utf8');
                const tryBrotli = () => zlib.brotliDecompressSync(buffer).toString('utf8');

                try {
                    if (contentEncoding === 'gzip') rawBody = tryGunzip();
                    else if (contentEncoding === 'deflate') rawBody = tryInflate();
                    else if (contentEncoding === 'br') rawBody = tryBrotli();
                    else rawBody = tryDecode(buffer);
                } catch (err) {
                    rawBody = tryDecode(buffer);
                }

                // If still not JSON, try additional decompression attempts (header may be missing)
                const looksLikeJson = rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[');
                if (!looksLikeJson) {
                    const isGzipped = buffer[0] === 0x1f && buffer[1] === 0x8b;
                    if (isGzipped) {
                        try {
                            rawBody = tryGunzip();
                            console.log(`✅ Decompressed gzip response (magic bytes)`);
                        } catch {}
                    }
                    if (!rawBody || !rawBody.trim().startsWith('{')) {
                        try { rawBody = tryBrotli(); console.log(`✅ Decompressed brotli response`); } catch {}
                    }
                    if (!rawBody || !rawBody.trim().startsWith('{')) {
                        try { rawBody = tryInflate(); console.log(`✅ Decompressed deflate response`); } catch {}
                    }
                }

                // Log decompressed response (truncate if very long)
                const displayBody = rawBody.length > 500 ? rawBody.substring(0, 500) + '...' : rawBody;
                console.log(`📦 Decompressed Response: ${displayBody}`);
                
                console.log(`📥 Response: ${proxyRes.statusCode} | Content-Type: ${proxyRes.headers['content-type']} | Content-Encoding: ${contentEncoding || 'none'}`);

                if (proxyRes.headers['content-type']?.includes('application/json')) {
                    try {
                        await ensurePricingCache();
                        const responseData = JSON.parse(rawBody);
                        const model = req.headers['x-model'] || responseData.model || 'unknown';
                        const pricingTier = req.headers['x-pricing-tier'] || 'standard';
                        
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
                        
                        const estimatedCost = calculateCost(model, inputTokens, outputTokens, pricingTier, 'text');

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
        await ensurePricingCache();
        const limit = Math.min(Number(req.query.limit || 500), 500);
        const offset = Math.max(Number(req.query.offset || 0), 0);

        // Fetch ALL records to aggregate properly, then paginate
        const { data, error } = await supabase
            .from('api_usage_logs')
            .select('*')
            .order('created_at', { ascending: false });
        
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
                    estimated_cost: 0,
                    total_input_tokens: 0,
                    total_output_tokens: 0
                };
            }
            
            serviceBreakdown[key].total_hits += 1;
            if (log.status_code >= 200 && log.status_code < 300) {
                serviceBreakdown[key].success_count += 1;
            } else {
                serviceBreakdown[key].error_count += 1;
            }
            serviceBreakdown[key].total_latency += log.latency_ms || 0;
            const inputTokensValue = log.input_tokens ?? log.token_input ?? 0;
            const outputTokensValue = log.output_tokens ?? log.token_output ?? 0;
            const storedCost = Number(log.estimated_cost || 0);
            const computedCost = calculateCost(log.model || 'default', Number(inputTokensValue || 0), Number(outputTokensValue || 0), 'standard', 'text');
            serviceBreakdown[key].estimated_cost += storedCost > 0 ? storedCost : computedCost;
            serviceBreakdown[key].total_input_tokens += Number(inputTokensValue || 0);
            serviceBreakdown[key].total_output_tokens += Number(outputTokensValue || 0);
            
            // Keep the most recent timestamp
            if (new Date(log.created_at) > new Date(serviceBreakdown[key].last_used)) {
                serviceBreakdown[key].last_used = log.created_at;
            }
        });
        
        // Calculate averages and format results
        const allResults = Object.values(serviceBreakdown).map(service => ({
            ...service,
            avg_latency: service.total_hits > 0 
                ? Math.round(service.total_latency / service.total_hits) 
                : 0,
            success_rate: service.total_hits > 0
                ? ((service.success_count / service.total_hits) * 100).toFixed(1)
                : 0,
            estimated_cost: parseFloat(service.estimated_cost.toFixed(4)),
            total_tokens: (service.total_input_tokens || 0) + (service.total_output_tokens || 0)
        })).sort((a, b) => b.total_hits - a.total_hits);
        
        // Apply pagination to aggregated results
        const paginatedResult = allResults.slice(offset, offset + limit);
        
        res.json(paginatedResult);
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