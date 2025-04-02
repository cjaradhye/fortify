
const express = require('express');
const router = express.Router();
const { fetchContractDetails } = require('../services/blockchainService');
const { analyzeWithML } = require('../services/mlService');

// POST endpoint to process contract address
router.post('/contract', async (req, res) => {
    try {
        const { contractAddress } = req.body;
        
        if (!contractAddress || !ethers.utils.isAddress(contractAddress)) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Invalid Ethereum address provided'
            });
        }

        // Create a WebSocket or SSE connection for real-time updates
        // For this example, we'll simulate progress updates
        const sendProgress = (message, progress) => {
            if (req.websocket) {
                // WebSocket implementation
                req.websocket.send(JSON.stringify({ message, progress }));
            } else {
                // For HTTP, we could use Server-Sent Events (SSE)
                // This is a simplified version
                res.write(`data: ${JSON.stringify({ message, progress })}\n\n`);
            }
        };

        // Step 1: Fetch contract details
        sendProgress('Fetching contract details from blockchain...', 20);
        const contractDetails = await fetchContractDetails(contractAddress);
        
        if (!contractDetails) {
            return res.status(404).json({
                status: 'error',
                message: 'Contract not found or not verified'
            });
        }

        // Step 2: Process source code
        sendProgress('Processing contract source code...', 50);
        let sourceCode;
        if (typeof contractDetails.sourceCode === 'object') {
            sourceCode = JSON.stringify(contractDetails.sourceCode);
        } else {
            sourceCode = contractDetails.sourceCode;
        }

        // Step 3: Send to ML model
        sendProgress('Analyzing contract with ML model...', 70);
        const mlAnalysis = await analyzeWithML(sourceCode);

        // Step 4: Prepare final response
        sendProgress('Compiling results...', 90);
        const result = {
            status: 'success',
            contractAddress,
            contractName: contractDetails.contractName || 'Unknown',
            hasSourceCode: !!contractDetails.sourceCode,
            riskScore: contractDetails.riskScore,
            mlAnalysis
        };

        sendProgress('Analysis complete!', 100);
        res.json(result);

    } catch (error) {
        console.error('Error in contract analysis:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to analyze contract',
            error: error.message
        });
    }
});

module.exports = router;