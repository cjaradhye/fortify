require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const { fetchContractDetails, saveSolidityCode, extractSolidityCode } = require("./services/blockchainService");
const securityAnalysisService = require("./services/securityAnalysisService");
const deployRoutes = require('./routes/uploadAndDeploy');      // New contracts
const existingContractRoutes = require('./routes/existing');   // Existing contracts

const app = express();
const server = http.createServer(app);

// Environment configuration for production
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Production-ready CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://localhost:5173',
            process.env.FRONTEND_URL,
            'fortify-16.vercel.app',
            /\.vercel\.app$/
        ].filter(Boolean);

        if (isDevelopment && origin.includes('localhost')) {
            return callback(null, true);
        }

        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return allowed === origin;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`❌ CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
};

// Socket.IO setup with enhanced configuration for production
const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    path: '/socket.io/',
    serveClient: false,
});

// Enhanced middleware for production
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors(corsOptions));

// Enhanced logging for production
if (isProduction) {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check for Render
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        deployment: 'render',
        services: {
            deployment: 'Available',
            blockchain: process.env.INFURA_RPC_URL ? 'Connected' : 'Not configured',
            websocket: 'Active',
            securityAnalysis: 'Available'
        },
        features: {
            newContracts: "Analyze, compile and deploy new smart contracts",
            existingContracts: "Assess risk and deploy security proxies for existing contracts",
            realTimeUpdates: "WebSocket support for live progress tracking"
        }
    });
});

// Add a simple ping endpoint for monitoring
app.get('/ping', (req, res) => {
    res.json({ pong: true, timestamp: Date.now() });
});

// Routes
app.use('/api/deploy', deployRoutes);           // New contract endpoints
app.use('/api/risk', existingContractRoutes);   // Existing contract endpoints

// Legacy endpoint for backward compatibility (from app.js)
app.post('/fetch-contract', async (req, res) => {
    try {
        const { contractAddress } = req.body;
        
        if (!contractAddress) {
            return res.status(400).json({ error: "Contract address is required" });
        }

        console.log(`Fetching contract: ${contractAddress}`);
        
        // Emit progress to connected clients
        io.emit('fetchProgress', { 
            message: 'Fetching contract from blockchain...', 
            progress: 20,
            contractAddress 
        });

        const details = await fetchContractDetails(contractAddress);

        if (details && details.rawSourceCode) {
            const extractedCode = extractSolidityCode(details.rawSourceCode);

            if (!extractedCode) {
                return res.status(400).json({ error: "No Solidity contract code found" });
            }

            await saveSolidityCode({ ...details, extractedCode });

            io.emit('fetchProgress', { 
                message: 'Running security analysis...', 
                progress: 60,
                contractAddress 
            });

            const analysisResult = await securityAnalysisService.analyzeContract(extractedCode);

            io.emit('fetchProgress', { 
                message: 'Analysis complete!', 
                progress: 100,
                contractAddress 
            });

            if (analysisResult.success) {
                res.json({
                    message: "Contract fetched successfully!",
                    sourceCode: extractedCode,
                    risk_score: analysisResult.riskScore,
                    interpretation: analysisResult.interpretation,
                    vulnerabilities: analysisResult.vulnerabilities,
                    summary: analysisResult.summary,
                    slitherUsed: analysisResult.slitherUsed,
                    note: "For automated protection, use POST /api/risk/analyze-and-deploy"
                });
            } else {
                res.status(500).json({ 
                    error: "Security analysis failed",
                    details: analysisResult.error 
                });
            }

        } else {
            res.status(404).json({ error: "No verified contract found at this address" });
        }
    } catch (error) {
        console.error('Error in fetch-contract:', error);
        io.emit('fetchProgress', { 
            message: 'Error occurred during fetch', 
            progress: 0,
            error: error.message 
        });
        res.status(500).json({ 
            error: error.message || "Failed to fetch contract details" 
        });
    }
});

// Socket.IO connection handler for real-time analysis
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Real-time contract analysis for new contracts
    socket.on('analyzeContractRealtime', async (data) => {
        try {
            const { code, step } = data;
            
            if (step === 'analysis') {
                socket.emit('progress', { message: 'Starting enhanced security analysis...', progress: 10 });
                
                const analysisResult = await securityAnalysisService.analyzeContract(code);
                
                socket.emit('progress', { message: 'Running vulnerability detection...', progress: 40 });
                
                if (analysisResult.slitherUsed) {
                    socket.emit('progress', { message: 'Slither analysis completed', progress: 60 });
                }
                
                socket.emit('progress', { message: 'Security analysis complete', progress: 80 });
                
                socket.emit('analysisResult', {
                    success: analysisResult.success,
                    riskScore: analysisResult.riskScore,
                    interpretation: analysisResult.interpretation,
                    vulnerabilities: analysisResult.vulnerabilities,
                    summary: analysisResult.summary,
                    slitherUsed: analysisResult.slitherUsed
                });
            }
            
        } catch (error) {
            socket.emit('error', { message: error.message, step });
        }
    });

    // Real-time existing contract analysis
    socket.on('analyzeExistingContract', async (data) => {
        try {
            const { contractAddress } = data;
            
            socket.emit('progress', { message: 'Fetching contract from blockchain...', progress: 15 });
            
            const details = await fetchContractDetails(contractAddress);
            
            if (!details?.rawSourceCode) {
                socket.emit('error', { message: 'Contract not found or not verified' });
                return;
            }
            
            socket.emit('progress', { message: 'Extracting source code...', progress: 35 });
            
            const extractedCode = extractSolidityCode(details.rawSourceCode);
            
            if (!extractedCode) {
                socket.emit('error', { message: 'No valid Solidity code found' });
                return;
            }
            
            socket.emit('progress', { message: 'Running security analysis...', progress: 55 });
            
            const analysisResult = await securityAnalysisService.analyzeContract(extractedCode);
            
            socket.emit('progress', { message: 'Analysis complete!', progress: 100 });
            
            socket.emit('existingContractResult', {
                contractAddress,
                sourceCode: extractedCode,
                analysis: analysisResult
            });
            
        } catch (error) {
            socket.emit('error', { message: error.message, step: 'existing_analysis' });
        }
    });

    // Handle deployment progress
    socket.on('deployContract', async (data) => {
        try {
            const { abi, bytecode, contractName, constructorArgs } = data;
            
            socket.emit('progress', { message: 'Initiating deployment...', progress: 70 });
            socket.emit('progress', { message: 'Broadcasting transaction...', progress: 85 });
            socket.emit('progress', { message: 'Waiting for confirmation...', progress: 95 });
            const deploymentService = require('./services/deploymentService');
            const result = await deploymentService.deployContract({
                abi,
                bytecode,
                contractName,
                constructorArgs
            });
            
            socket.emit('progress', { message: 'Deployment complete!', progress: 100 });
            socket.emit('deploymentResult', result);
            
        } catch (error) {
            socket.emit('error', { message: error.message, step: 'deployment' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Root endpoint with comprehensive documentation
app.get('/', (req, res) => {
    res.json({
        name: 'Smart Contract Security & Deployment Platform',
        version: '2.0.0',
        description: 'Complete platform with real-time updates for smart contract security analysis and deployment',
        deployment: {
            frontend: 'Vercel',
            backend: 'Render',
            environment: process.env.NODE_ENV || 'development'
        },
        features: {
            newContracts: {
                description: 'Upload, analyze, and deploy new smart contracts',
                realTime: 'Live progress updates via WebSocket',
                security: 'Enhanced security analysis with Slither integration',
                deployment: 'Automated compilation and deployment to testnet'
            },
            existingContracts: {
                description: 'Analyze existing deployed contracts and add protection',
                realTime: 'Live analysis progress via WebSocket', 
                riskAssessment: 'Comprehensive vulnerability detection',
                autoProtection: 'Automatic SecurityProxy deployment for high-risk contracts'
            }
        },
        endpoints: {
            newContracts: {
                'POST /api/deploy/analyze-and-deploy': 'Complete deployment pipeline',
                'POST /api/deploy/check-only': 'Security analysis only',
                'POST /api/deploy/force-deploy': 'Emergency override deployment'
            },
            existingContracts: {
                'POST /api/risk/analyze-and-deploy': 'Complete protection pipeline',
                'POST /api/risk/check-only': 'Risk assessment only'
            },
            utility: {
                'POST /fetch-contract': 'Legacy contract analysis',
                'GET /api/health': 'System health check',
                'GET /ping': 'Simple ping endpoint',
                'GET /': 'This documentation'
            }
        },
        websocket: {
            url: isProduction ? 'wss://your-render-app.onrender.com/socket.io' : `ws://localhost:${process.env.PORT || 3000}/socket.io`,
            events: {
                client_to_server: [
                    'analyzeContractRealtime',
                    'analyzeExistingContract', 
                    'deployContract'
                ],
                server_to_client: [
                    'progress',
                    'analysisResult',
                    'existingContractResult',
                    'deploymentResult',
                    'error'
                ]
            }
        },
        usage: {
            newContract: 'Send Solidity code → Get real-time analysis → Deploy if secure',
            existingContract: 'Send address → Fetch & analyze → Auto-protect if risky'
        }
    });
});

// Error handling middleware - enhanced for production
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    // Don't leak error details in production
    const error = {
        success: false,
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    };

    // Add stack trace only in development
    if (isDevelopment && err.stack) {
        error.stack = err.stack;
    }

    res.status(500).json(error);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        suggestion: 'Check GET / for API documentation',
        availableEndpoints: {
            newContracts: ['POST /api/deploy/*'],
            existingContracts: ['POST /api/risk/*'],
            utility: ['GET /api/health', 'GET /ping', 'GET /']
        }
    });
});

// Graceful shutdown for production
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 ${signal} signal received: closing HTTP server`);
    server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Close database connections, cleanup, etc.
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.log('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Handle various termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, you might want to shut down gracefully
    if (isProduction) {
        gracefulShutdown('unhandledRejection');
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

// Server Start
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Smart Contract Security & Deployment Platform v2.0');
    console.log('═'.repeat(70));
    console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
    console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🏠 Frontend: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
    console.log(`📚 API Docs: http://0.0.0.0:${PORT}/`);
    console.log(`💚 Health: http://0.0.0.0:${PORT}/health`);
    console.log('═'.repeat(70));
    
    console.log('\n🆕 NEW CONTRACTS:');
    console.log(`   🎯 POST /api/deploy/analyze-and-deploy  - Full pipeline`);
    console.log(`   🔍 POST /api/deploy/check-only          - Analysis only`);
    console.log(`   ⚠️  POST /api/deploy/force-deploy       - Override deployment`);
    
    console.log('\n🔍 EXISTING CONTRACTS:');
    console.log(`   🛡️ POST /api/risk/analyze-and-deploy    - Auto-protect pipeline`);
    console.log(`   📊 POST /api/risk/check-only            - Risk assessment only`);
    
    console.log('\n📡 REAL-TIME FEATURES:');
    const wsProtocol = isProduction ? 'wss' : 'ws';
    const wsHost = isProduction ? process.env.RENDER_EXTERNAL_URL || `https://your-render-app.onrender.com` : `localhost:${PORT}`;
    console.log(`   🔌 WebSocket: ${wsProtocol}://${wsHost}/socket.io`);
    console.log(`   📈 Live progress updates for all operations`);
    console.log(`   🔄 Real-time security analysis feedback`);
    
    // Environment validation
    console.log('\n⚙️  CONFIGURATION STATUS:');
    const configs = [
        ['NODE_ENV', process.env.NODE_ENV],
        ['PORT', PORT],
        ['FRONTEND_URL', process.env.FRONTEND_URL],
        ['INFURA_RPC_URL', process.env.INFURA_RPC_URL],
        ['PRIVATE_KEY', process.env.PRIVATE_KEY], 
        ['ETHERSCAN_API_KEY', process.env.ETHERSCAN_API_KEY],
        ['RISK_THRESHOLD', process.env.RISK_THRESHOLD || '7.0']
    ];
    
    configs.forEach(([key, value]) => {
        const hasValue = value && value.toString().length > 0;
        console.log(`   ${hasValue ? '✅' : '❌'} ${key}: ${hasValue ? 'Configured' : 'Missing'}`);
    });
    
    if (!process.env.INFURA_RPC_URL || !process.env.PRIVATE_KEY) {
        console.log('\n⚠️  WARNING: Missing required environment variables!');
        console.log('   Required for Render deployment:');
        console.log('   INFURA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
        console.log('   PRIVATE_KEY=your_private_key_here');
        console.log('   ETHERSCAN_API_KEY=your_etherscan_api_key');
        console.log('   FRONTEND_URL=https://your-app.vercel.app');
    }
    
    console.log(`\n🎉 Platform ready on ${isProduction ? 'Render' : 'localhost'}! Real-time smart contract security at your service! 🔐`);
});