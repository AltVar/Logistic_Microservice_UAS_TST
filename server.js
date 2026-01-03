/**
 * =====================================================
 *  TST LOGISTICS SERVICE - Microservice
 *  Native Node.js (No External Dependencies)
 *  RAM Target: < 40MB for STB Deployment
 * =====================================================
 */

const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const PORT = 3030;
const SERVICE_NAME = 'LOGISTICS-SERVICE';

// =====================================================
// LOAD TARIFFS DATA INTO MEMORY
// =====================================================
let tariffsData = [];

function loadTariffs() {
    try {
        const dataPath = path.join(__dirname, 'data', 'tariffs.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        tariffsData = JSON.parse(rawData);
        console.log(`[INIT] ✅ Loaded ${tariffsData.length} tariff destinations into memory`);
    } catch (error) {
        console.error(`[ERROR] ❌ Failed to load tariffs.json: ${error.message}`);
        tariffsData = [];
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function logRequest(method, path, message, status = 'INFO') {
    const icons = {
        'INFO': 'ℹ️ ',
        'SUCCESS': '✅',
        'WARNING': '⚠️ ',
        'ERROR': '❌'
    };
    console.log(`[${getTimestamp()}] [${status}] ${icons[status]} [${method}] ${path} - ${message}`);
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data, null, 2));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

// =====================================================
// API HANDLERS
// =====================================================

// GET /tariffs - Get all tariffs (for debugging)
function handleGetTariffs(req, res) {
    logRequest('GET', '/tariffs', `Fetching all ${tariffsData.length} tariff destinations...`, 'INFO');
    
    sendJSON(res, 200, {
        success: true,
        message: 'Daftar semua tarif pengiriman',
        total: tariffsData.length,
        data: tariffsData
    });
    
    logRequest('GET', '/tariffs', `Successfully returned ${tariffsData.length} tariffs!`, 'SUCCESS');
}

// POST /calculate - Calculate shipping cost
async function handleCalculate(req, res) {
    try {
        const body = await parseBody(req);
        const { destination, weight_kg } = body;

        logRequest('POST', '/calculate', `Request masuk: destination="${destination}", weight=${weight_kg}kg`, 'INFO');

        // Validation
        if (!destination || weight_kg === undefined) {
            logRequest('POST', '/calculate', 'Missing required fields: destination or weight_kg', 'WARNING');
            return sendJSON(res, 400, {
                success: false,
                error: 'Missing required fields: destination and weight_kg are required'
            });
        }

        if (typeof weight_kg !== 'number' || weight_kg <= 0) {
            logRequest('POST', '/calculate', `Invalid weight: ${weight_kg}`, 'WARNING');
            return sendJSON(res, 400, {
                success: false,
                error: 'weight_kg must be a positive number'
            });
        }

        // Find tariff by destination (case-insensitive)
        const tariff = tariffsData.find(
            t => t.destination.toLowerCase() === destination.toLowerCase()
        );

        if (!tariff) {
            logRequest('POST', '/calculate', `Destination "${destination}" not found!`, 'WARNING');
            return sendJSON(res, 404, {
                success: false,
                error: `Destination "${destination}" not found`,
                available_destinations: tariffsData.map(t => t.destination)
            });
        }

        // Calculate total cost: (cost_per_kg * weight_kg) + base_cost
        const total_cost = (tariff.cost_per_kg * weight_kg) + tariff.base_cost;

        logRequest('POST', '/calculate', `Tarif ke ${tariff.destination} ditemukan! Total: Rp ${total_cost.toLocaleString('id-ID')}`, 'SUCCESS');

        sendJSON(res, 200, {
            success: true,
            destination: tariff.destination,
            weight_kg: weight_kg,
            base_cost: tariff.base_cost,
            cost_per_kg: tariff.cost_per_kg,
            total_cost: total_cost,
            eta: tariff.eta_days,
            calculation: `(${tariff.cost_per_kg} x ${weight_kg}) + ${tariff.base_cost} = ${total_cost}`
        });

    } catch (error) {
        logRequest('POST', '/calculate', `Error: ${error.message}`, 'ERROR');
        sendJSON(res, 400, {
            success: false,
            error: error.message
        });
    }
}

// GET /health - Health check endpoint
function handleHealth(req, res) {
    logRequest('GET', '/health', 'Health check requested', 'INFO');
    sendJSON(res, 200, {
        success: true,
        service: SERVICE_NAME,
        status: 'healthy',
        uptime: process.uptime(),
        memory_usage_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        tariffs_loaded: tariffsData.length
    });
}

// =====================================================
// MAIN SERVER
// =====================================================
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${getTimestamp()}] 📨 Incoming Request: ${method} ${pathname}`);
    console.log(`${'='.repeat(60)}`);

    // Routing
    if (pathname === '/tariffs' && method === 'GET') {
        handleGetTariffs(req, res);
    } else if (pathname === '/calculate' && method === 'POST') {
        await handleCalculate(req, res);
    } else if (pathname === '/health' && method === 'GET') {
        handleHealth(req, res);
    } else if (pathname === '/' && method === 'GET') {
        logRequest('GET', '/', 'Welcome page accessed', 'INFO');
        sendJSON(res, 200, {
            success: true,
            service: SERVICE_NAME,
            version: '1.0.0',
            endpoints: {
                'GET /': 'Welcome & API info',
                'GET /health': 'Health check',
                'GET /tariffs': 'Get all tariffs',
                'POST /calculate': 'Calculate shipping cost (body: {destination, weight_kg})'
            }
        });
    } else {
        logRequest(method, pathname, 'Endpoint not found!', 'WARNING');
        sendJSON(res, 404, {
            success: false,
            error: 'Endpoint not found',
            available_endpoints: ['GET /', 'GET /health', 'GET /tariffs', 'POST /calculate']
        });
    }
});

// =====================================================
// START SERVER
// =====================================================
loadTariffs();

server.listen(PORT, () => {
    console.log('\n' + '═'.repeat(60));
    console.log(`  🚀 ${SERVICE_NAME} is running!`);
    console.log('═'.repeat(60));
    console.log(`  📡 Port        : ${PORT}`);
    console.log(`  📦 Tariffs     : ${tariffsData.length} destinations loaded`);
    console.log(`  💾 Memory      : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  🕐 Started at  : ${getTimestamp()}`);
    console.log('═'.repeat(60));
    console.log('\n📋 Available Endpoints:');
    console.log('   GET  /         → Welcome & API info');
    console.log('   GET  /health   → Health check');
    console.log('   GET  /tariffs  → Get all tariffs');
    console.log('   POST /calculate → Calculate shipping cost');
    console.log('\n⏳ Waiting for requests...\n');
});
