// server/routes/deployRoutes.js
const express = require('express');
const router = express.Router();
const { assessAndProtectContract, RISK_THRESHOLD } = require('../services/riskAssessmentExisting');
const { fetchContractDetails, extractSolidityCode } = require("../services/blockchainService");
const securityAnalysisService = require('../services/securityAnalysisService');

// POST /api/deploy/analyze-and-deploy - Complete automated flow
router.post('/analyze-and-deploy', async (req, res) => {
    try {
        const { contractAddress } = req.body;

        if (!contractAddress) {
            return res.status(400).json({ 
                success: false,
                error: "Contract address is required" 
            });
        }

        console.log(`🚀 Starting complete analysis and deployment flow for: ${contractAddress}`);
        console.log("📥 STEP 1: Fetching contract from blockchain...");
        const contractDetails = await fetchContractDetails(contractAddress);

        if (!contractDetails || !contractDetails.rawSourceCode) {
            return res.status(404).json({
                success: false,
                error: "No verified contract found at this address"
            });
        }

        console.log("✅ Contract details fetched successfully");

        // STEP 2: Extract Solidity code
        console.log("🔧 STEP 2: Extracting Solidity code...");
        const extractedCode = extractSolidityCode(contractDetails.rawSourceCode);

        if (!extractedCode || extractedCode.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "No valid Solidity code found in contract",
                debug: {
                    hasRawSource: !!contractDetails.rawSourceCode,
                    rawSourceLength: contractDetails.rawSourceCode?.length || 0,
                    extractedLength: extractedCode?.length || 0
                }
            });
        }

        console.log(`✅ Extracted ${extractedCode.length} characters of Solidity code`);

        // STEP 3: Send code to SecurityAnalysisService (with Slither)
        console.log("🔍 STEP 3: Running security analysis with Slither...");
        console.log("📤 Code preview:", extractedCode.substring(0, 100) + "...");

        let analysisResult;
        try {
            // Use your SecurityAnalysisService instead of external ML API
            analysisResult = await securityAnalysisService.analyzeContract(extractedCode);

            if (!analysisResult.success) {
                return res.status(500).json({
                    success: false,
                    error: "Security analysis failed",
                    details: analysisResult.error || "Unknown analysis error"
                });
            }

            console.log(`✅ Security analysis complete - Risk Score: ${analysisResult.riskScore}`);
            console.log(`🔍 Found ${analysisResult.vulnerabilities.length} vulnerabilities`);
            console.log(`🛡️ Slither used: ${analysisResult.slitherUsed}`);

        } catch (analysisError) {
            console.error("❌ Security analysis failed:", analysisError.message);
            
            return res.status(500).json({
                success: false,
                error: "Security analysis failed",
                details: analysisError.message,
                suggestion: "Check if Slither is properly installed"
            });
        }

        // STEP 4: Extract risk score and vulnerabilities
        const riskScore = analysisResult.riskScore;
        const interpretation = analysisResult.interpretation;
        const vulnerabilities = analysisResult.vulnerabilities;

        if (riskScore === undefined || riskScore === null) {
            return res.status(500).json({
                success: false,
                error: "Security analysis returned invalid risk score",
                analysisResult: analysisResult
            });
        }

        console.log(`📊 STEP 4: Security Analysis complete - Risk Score: ${riskScore}`);

        // STEP 5: Send to risk assessment and protection service
        console.log("🛡️ STEP 5: Performing risk assessment and potential protection deployment...");
        const assessmentResult = await assessAndProtectContract(
            contractAddress, 
            riskScore, 
            {
                interpretation,
                vulnerabilities,
                slitherUsed: analysisResult.slitherUsed,
                summary: analysisResult.summary
            }
        );

        console.log(`✅ Assessment complete: ${assessmentResult.action}`);

        // STEP 6: Return comprehensive response
        const response = {
            success: true,
            flow: "Contract Address → Fetch → Security Analysis (Slither) → Risk Assessment → Protection",
            contractAddress,
            securityAnalysis: {
                riskScore,
                interpretation,
                vulnerabilityCount: vulnerabilities.length,
                slitherUsed: analysisResult.slitherUsed,
                summary: analysisResult.summary,
                threshold: RISK_THRESHOLD
            },
            vulnerabilities: vulnerabilities.map(vuln => ({
                tool: vuln.tool,
                type: vuln.type,
                severity: vuln.severity,
                description: vuln.description,
                recommendation: vuln.recommendation
            })),
            assessment: assessmentResult,
            timestamp: new Date().toISOString()
        };

        console.log("🎉 Complete flow finished successfully!");
        res.json(response);

    } catch (error) {
        console.error("❌ Complete analysis flow failed:", error);
        res.status(500).json({
            success: false,
            error: "Complete analysis flow failed",
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// POST /api/deploy/check-only - Just check risk score without deploying
router.post('/check-only', async (req, res) => {
    try {
        const { contractAddress } = req.body;

        if (!contractAddress) {
            return res.status(400).json({ 
                success: false,
                error: "Contract address is required" 
            });
        }

        console.log(`🔍 Risk check only for: ${contractAddress}`);

        // Steps 1-2: Fetch and extract code
        const contractDetails = await fetchContractDetails(contractAddress);
        
        if (!contractDetails || !contractDetails.rawSourceCode) {
            return res.status(404).json({
                success: false,
                error: "No verified contract found at this address"
            });
        }

        const extractedCode = extractSolidityCode(contractDetails.rawSourceCode);
        
        if (!extractedCode) {
            return res.status(400).json({
                success: false,
                error: "No valid Solidity code found"
            });
        }

        // Step 3: Get security analysis using SecurityAnalysisService
        const analysisResult = await securityAnalysisService.analyzeContract(extractedCode);
        
        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: "Security analysis failed",
                details: analysisResult.error
            });
        }

        const riskScore = analysisResult.riskScore;
        const interpretation = analysisResult.interpretation;

        // Only assess, don't deploy
        const wouldDeploy = riskScore >= RISK_THRESHOLD;
        const recommendation = wouldDeploy 
            ? "CRITICAL/HIGH RISK - Recommend deploying SecurityProxy"
            : "LOW/MEDIUM RISK - No protection needed";

        res.json({
            success: true,
            contractAddress,
            securityAnalysis: {
                riskScore,
                interpretation,
                vulnerabilityCount: analysisResult.vulnerabilities.length,
                slitherUsed: analysisResult.slitherUsed,
                summary: analysisResult.summary,
                threshold: RISK_THRESHOLD,
                wouldDeploy,
                recommendation
            },
            vulnerabilities: analysisResult.vulnerabilities.map(vuln => ({
                tool: vuln.tool,
                type: vuln.type,
                severity: vuln.severity,
                description: vuln.description,
                recommendation: vuln.recommendation
            })),
            note: "This was a check-only operation. No SecurityProxy was deployed."
        });

    } catch (error) {
        console.error("❌ Risk check failed:", error);
        res.status(500).json({
            success: false,
            error: "Risk check failed",
            details: error.message
        });
    }
});

module.exports = router;