const express = require('express');
const router = express.Router();
const securityAnalysisService = require('../services/securityAnalysisService');
const compilationService = require('../services/compilationService');
const deploymentService = require('../services/deploymentService');

// HARDCODED THRESHOLDS - Strict security policy
const DEPLOYMENT_RISK_THRESHOLD = 50;  // Hardcoded as requested
const CRITICAL_VULNERABILITY_THRESHOLD = 1;
const HIGH_VULNERABILITY_THRESHOLD = 5;

console.log(`🔧 Deployment Configuration (HARDCODED):`);
console.log(`   Risk Threshold: ${DEPLOYMENT_RISK_THRESHOLD} (hardcoded)`);
console.log(`   Critical Vuln Threshold: ${CRITICAL_VULNERABILITY_THRESHOLD}`);
console.log(`   High Vuln Threshold: ${HIGH_VULNERABILITY_THRESHOLD}`);

// In-memory deployment lock to prevent duplicate deployments
const deploymentLocks = new Map();

router.post('/analyze-and-deploy', async (req, res) => {
    const requestId = Date.now() + Math.random();
    console.log(`\n🔵 ═══════════════════════════════════════════════════════`);
    console.log(`🔵 New deployment request [${requestId}]`);
    console.log(`🔵 ═══════════════════════════════════════════════════════`);
    
    try {
        const { code, contractName = 'MyContract', constructorArgs = [] } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'No Solidity code provided'
            });
        }

        // Create a deployment lock key based on code hash
        const codeHash = require('crypto').createHash('md5').update(code).digest('hex');
        
        if (deploymentLocks.has(codeHash)) {
            console.log(`⚠️ [${requestId}] Duplicate deployment attempt detected for ${codeHash}`);
            return res.status(429).json({
                success: false,
                error: 'Deployment already in progress for this contract',
                message: 'Please wait for the current deployment to complete'
            });
        }
        
        deploymentLocks.set(codeHash, requestId);
        
        // Auto-cleanup after 2 minutes
        setTimeout(() => deploymentLocks.delete(codeHash), 120000);

        console.log(`🔍 [${requestId}] Step 1: Enhanced Security Analysis`);
        const analysisResult = await securityAnalysisService.analyzeContract(code);
        
        if (!analysisResult.success) {
            deploymentLocks.delete(codeHash);
            return res.status(500).json({
                success: false,
                error: analysisResult.error,
                step: 'security_analysis'
            });
        }

        const criticalVulns = analysisResult.summary.critical || 0;
        const highVulns = analysisResult.summary.high || 0;
        const riskScore = analysisResult.riskScore;

        console.log(`\n📊 [${requestId}] ═══ SECURITY ANALYSIS RESULTS ═══`);
        console.log(`   Risk Score: ${riskScore}/${DEPLOYMENT_RISK_THRESHOLD}`);
        console.log(`   Critical Vulnerabilities: ${criticalVulns}/${CRITICAL_VULNERABILITY_THRESHOLD}`);
        console.log(`   High Vulnerabilities: ${highVulns}/${HIGH_VULNERABILITY_THRESHOLD}`);
        console.log(`   Total Vulnerabilities: ${analysisResult.vulnerabilities.length}`);
        console.log(`   Slither Used: ${analysisResult.slitherUsed}`);
        
        // ═══════════════════════════════════════════════════════════
        // CRITICAL: STRICT BLOCKING LOGIC
        // ═══════════════════════════════════════════════════════════
        let blockReasons = [];
        let shouldBlock = false;
        
        // Rule 1: Critical vulnerabilities - ALWAYS BLOCK
        if (criticalVulns >= CRITICAL_VULNERABILITY_THRESHOLD) {
            blockReasons.push(`${criticalVulns} CRITICAL vulnerability(s) detected`);
            shouldBlock = true;
        }
        
        // Rule 2: Risk score check - STRICT (HARDCODED at 50)
        if (riskScore >= DEPLOYMENT_RISK_THRESHOLD) {
            blockReasons.push(`Risk score ${riskScore} >= ${DEPLOYMENT_RISK_THRESHOLD}`);
            shouldBlock = true;
        }
        
        // Rule 3: Too many high severity issues
        if (highVulns >= HIGH_VULNERABILITY_THRESHOLD) {
            blockReasons.push(`${highVulns} high-severity vulnerabilities >= ${HIGH_VULNERABILITY_THRESHOLD}`);
            shouldBlock = true;
        }
        
        // Rule 4: Slither unavailable + moderate risk
        if (!analysisResult.slitherUsed && riskScore > 30) {
            blockReasons.push(`Slither unavailable AND risk score ${riskScore} > 30`);
            shouldBlock = true;
        }

        console.log(`\n🚨 [${requestId}] ═══ SECURITY GATE CHECK ═══`);
        console.log(`   Should Block: ${shouldBlock}`);
        console.log(`   Block Reasons: ${blockReasons.length > 0 ? blockReasons.join(' | ') : '✅ NONE - SAFE TO DEPLOY'}`);
        console.log(`   ═══════════════════════════════════════════════════`);

        // ═══════════════════════════════════════════════════════════
        // IF BLOCKED, STOP HERE - DO NOT PROCEED TO DEPLOYMENT
        // ═══════════════════════════════════════════════════════════
        if (shouldBlock) {
            console.log(`\n❌❌❌ [${requestId}] DEPLOYMENT BLOCKED ❌❌❌`);
            console.log(`   Reasons:`);
            blockReasons.forEach(reason => console.log(`     - ${reason}`));
            console.log(`   Contract will NOT be deployed.`);
            console.log(`   Use /force-deploy to bypass (not recommended)`);
            console.log(`❌ ═══════════════════════════════════════════════════\n`);
            
            deploymentLocks.delete(codeHash);
            
            // RETURN 403 FORBIDDEN - DEPLOYMENT BLOCKED
            return res.status(403).json({
                success: false,
                blocked: true,  // CRITICAL FLAG
                deployed: false,  // EXPLICITLY NOT DEPLOYED
                error: 'DEPLOYMENT BLOCKED: Contract has security risks',
                riskScore: analysisResult.riskScore,
                interpretation: analysisResult.interpretation,
                vulnerabilities: analysisResult.vulnerabilities,
                summary: analysisResult.summary,
                step: 'security_check',
                blockReasons: blockReasons,
                slitherUsed: analysisResult.slitherUsed,
                thresholds: {
                    riskScoreThreshold: DEPLOYMENT_RISK_THRESHOLD,
                    criticalVulnThreshold: CRITICAL_VULNERABILITY_THRESHOLD,
                    highVulnThreshold: HIGH_VULNERABILITY_THRESHOLD
                },
                message: `🚫 DEPLOYMENT BLOCKED: ${blockReasons.join(' | ')}`,
                recommendation: 'Fix the security issues above or use POST /api/deploy/force-deploy with confirmOverride: true'
            });
        }
        
        // ═══════════════════════════════════════════════════════════
        // SECURITY CHECK PASSED - PROCEED WITH DEPLOYMENT
        // ═══════════════════════════════════════════════════════════
        console.log(`\n✅✅✅ [${requestId}] SECURITY CHECK PASSED ✅✅✅`);
        if (riskScore > 25) {
            console.log(`⚠️  Proceeding with medium-risk contract (score: ${riskScore})`);
        } else {
            console.log(`✅ Low risk contract (score: ${riskScore}) - safe to deploy`);
        }
        console.log(`✅ ═══════════════════════════════════════════════════\n`);

        console.log(`🔧 [${requestId}] Step 2: Compilation`);
        const compilationResult = await compilationService.compileContract(code, `${contractName}.sol`);
        
        if (!compilationResult.success) {
            deploymentLocks.delete(codeHash);
            return res.status(400).json({
                success: false,
                error: compilationResult.error,
                errors: compilationResult.errors,
                step: 'compilation'
            });
        }

        console.log(`✅ [${requestId}] Compilation successful: ${compilationResult.contractName}`);

        console.log(`🚀 [${requestId}] Step 3: Deployment`);
        const deploymentResult = await deploymentService.deployContract({
            abi: compilationResult.abi,
            bytecode: compilationResult.bytecode,
            contractName: compilationResult.contractName,
            constructorArgs
        });

        deploymentLocks.delete(codeHash);

        if (!deploymentResult.success) {
            return res.status(500).json({
                success: false,
                error: deploymentResult.error,
                step: 'deployment'
            });
        }

        console.log(`\n🎉🎉🎉 [${requestId}] DEPLOYMENT SUCCESS 🎉🎉🎉`);
        console.log(`   Contract Address: ${deploymentResult.contractAddress}`);
        console.log(`   Transaction Hash: ${deploymentResult.transactionHash}`);
        console.log(`   Explorer URL: ${deploymentResult.explorerUrl}`);
        console.log(`🎉 ═══════════════════════════════════════════════════\n`);

        res.json({
            success: true,
            blocked: false,
            deployed: true,  // EXPLICITLY DEPLOYED
            message: '✅ Contract successfully analyzed, compiled, and deployed!',
            security: {
                riskScore: analysisResult.riskScore,
                interpretation: analysisResult.interpretation,
                vulnerabilitiesCount: analysisResult.vulnerabilities.length,
                summary: analysisResult.summary,
                slitherUsed: analysisResult.slitherUsed,
                passed: true,
                thresholds: {
                    riskScoreThreshold: DEPLOYMENT_RISK_THRESHOLD,
                    criticalVulnThreshold: CRITICAL_VULNERABILITY_THRESHOLD,
                    highVulnThreshold: HIGH_VULNERABILITY_THRESHOLD
                },
                warnings: riskScore > 25 ? ['Contract has some security concerns but is within acceptable limits'] : []
            },
            compilation: {
                contractName: compilationResult.contractName,
                warningsCount: compilationResult.warnings?.length || 0
            },
            deployment: {
                contractAddress: deploymentResult.contractAddress,
                transactionHash: deploymentResult.transactionHash,
                explorerUrl: deploymentResult.explorerUrl,
                gasUsed: deploymentResult.gasUsed,
                deploymentCost: deploymentResult.deploymentCost,
                networkName: deploymentResult.networkName
            },
            requestId
        });

    } catch (error) {
        console.error(`\n❌❌❌ [${requestId}] DEPLOYMENT FLOW ERROR ❌❌❌`);
        console.error(error);
        console.error(`❌ ═══════════════════════════════════════════════════\n`);
        
        // Clean up lock on error
        if (req.body.code) {
            const codeHash = require('crypto').createHash('md5').update(req.body.code).digest('hex');
            deploymentLocks.delete(codeHash);
        }
        
        res.status(500).json({
            success: false,
            error: error.message,
            step: 'unexpected_error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.post('/check-only', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'No Solidity code provided'
            });
        }

        console.log('🔍 Running security check only (no deployment)');
        const analysisResult = await securityAnalysisService.analyzeContract(code);

        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: analysisResult.error
            });
        }

        const criticalVulns = analysisResult.summary.critical || 0;
        const highVulns = analysisResult.summary.high || 0;
        const riskScore = analysisResult.riskScore;
        
        let deploymentStatus = 'ALLOWED';
        let deploymentMessage = '✅ Contract passed security check - safe to deploy';
        let wouldBlock = false;
        let blockReasons = [];
        
        // Same blocking logic as analyze-and-deploy (HARDCODED THRESHOLD = 50)
        if (criticalVulns >= CRITICAL_VULNERABILITY_THRESHOLD) {
            deploymentStatus = 'BLOCKED';
            deploymentMessage = `🚫 ${criticalVulns} CRITICAL vulnerabilities detected`;
            wouldBlock = true;
            blockReasons.push(`${criticalVulns} critical vulnerabilities`);
        } else if (riskScore >= DEPLOYMENT_RISK_THRESHOLD) {
            deploymentStatus = 'BLOCKED';
            deploymentMessage = `🚫 Risk score ${riskScore} >= ${DEPLOYMENT_RISK_THRESHOLD}`;
            wouldBlock = true;
            blockReasons.push(`Risk score exceeds threshold`);
        } else if (highVulns >= HIGH_VULNERABILITY_THRESHOLD) {
            deploymentStatus = 'BLOCKED';
            deploymentMessage = `🚫 ${highVulns} high-severity issues >= ${HIGH_VULNERABILITY_THRESHOLD}`;
            wouldBlock = true;
            blockReasons.push(`Too many high-severity vulnerabilities`);
        } else if (!analysisResult.slitherUsed && riskScore > 30) {
            deploymentStatus = 'WARNING';
            deploymentMessage = '⚠️ Slither unavailable + moderate risk - manual review recommended';
        } else if (riskScore > 25) {
            deploymentStatus = 'WARNING';
            deploymentMessage = '⚠️ Minor security concerns - review recommended';
        }

        console.log(`Check result: ${deploymentStatus} - ${deploymentMessage}`);

        res.json({
            success: true,
            riskScore: analysisResult.riskScore,
            interpretation: analysisResult.interpretation,
            deploymentStatus,
            deploymentAllowed: deploymentStatus === 'ALLOWED',
            wouldBlock,
            blockReasons: wouldBlock ? blockReasons : [],
            thresholds: {
                riskScoreThreshold: DEPLOYMENT_RISK_THRESHOLD,
                criticalVulnThreshold: CRITICAL_VULNERABILITY_THRESHOLD,
                highVulnThreshold: HIGH_VULNERABILITY_THRESHOLD
            },
            vulnerabilities: analysisResult.vulnerabilities,
            summary: analysisResult.summary,
            slitherUsed: analysisResult.slitherUsed,
            message: deploymentMessage,
            recommendations: analysisResult.vulnerabilities.length > 0 
                ? analysisResult.vulnerabilities.map(v => v.recommendation)
                : ['Contract appears secure - no specific recommendations']
        });

    } catch (error) {
        console.error('Security check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/force-deploy', async (req, res) => {
    try {
        const { code, contractName = 'MyContract', constructorArgs = [], confirmOverride = false } = req.body;

        if (!confirmOverride) {
            return res.status(400).json({
                success: false,
                error: 'Force deployment requires confirmOverride: true',
                message: '⚠️ This bypasses ALL security checks and should only be used for testing'
            });
        }

        console.log('\n⚠️⚠️⚠️ ═══════════════════════════════════════════════════');
        console.log('⚠️⚠️⚠️  FORCE DEPLOYMENT - BYPASSING ALL SECURITY CHECKS');
        console.log('⚠️⚠️⚠️ ═══════════════════════════════════════════════════\n');

        // Still run analysis for logging
        const analysisResult = await securityAnalysisService.analyzeContract(code);
        
        if (analysisResult.success) {
            console.log(`⚠️ Bypassing security check with risk score: ${analysisResult.riskScore}`);
            console.log(`⚠️ Critical vulnerabilities: ${analysisResult.summary.critical}`);
            console.log(`⚠️ Total vulnerabilities: ${analysisResult.vulnerabilities.length}`);
        }
        
        console.log('🔧 Force Compilation');
        const compilationResult = await compilationService.compileContract(code, `${contractName}.sol`);
        
        if (!compilationResult.success) {
            return res.status(400).json({
                success: false,
                error: compilationResult.error,
                errors: compilationResult.errors,
                step: 'compilation'
            });
        }

        console.log('🚀 Force Deployment (SECURITY BYPASSED)');
        const deploymentResult = await deploymentService.deployContract({
            abi: compilationResult.abi,
            bytecode: compilationResult.bytecode,
            contractName: compilationResult.contractName,
            constructorArgs
        });

        if (!deploymentResult.success) {
            return res.status(500).json({
                success: false,
                error: deploymentResult.error,
                step: 'deployment'
            });
        }

        console.log('\n⚠️ ═══════════════════════════════════════════════════');
        console.log('⚠️  FORCE DEPLOYMENT COMPLETED');
        console.log(`⚠️  Contract: ${deploymentResult.contractAddress}`);
        console.log('⚠️  ALL SECURITY CHECKS WERE BYPASSED');
        console.log('⚠️ ═══════════════════════════════════════════════════\n');

        res.json({
            success: true,
            forcedDeployment: true,
            blocked: false,
            deployed: true,
            message: '⚠️ CONTRACT FORCE DEPLOYED - ALL SECURITY CHECKS BYPASSED',
            warning: 'This deployment bypassed all security checks and should only be used for testing',
            security: analysisResult.success ? {
                riskScore: analysisResult.riskScore,
                interpretation: analysisResult.interpretation,
                vulnerabilities: analysisResult.vulnerabilities,
                summary: analysisResult.summary,
                bypassedSecurity: true,
                note: 'Security analysis was performed but IGNORED'
            } : { 
                error: 'Security analysis failed', 
                bypassedSecurity: true,
                note: 'Deployed without any security analysis'
            },
            deployment: deploymentResult
        });

    } catch (error) {
        console.error('Force deployment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get deployment status endpoint
router.get('/deployment-status/:requestId', (req, res) => {
    const { requestId } = req.params;
    const isLocked = Array.from(deploymentLocks.values()).includes(parseFloat(requestId));
    
    res.json({
        requestId,
        status: isLocked ? 'in_progress' : 'completed_or_not_found',
        activeDeployments: deploymentLocks.size
    });
});

module.exports = router;