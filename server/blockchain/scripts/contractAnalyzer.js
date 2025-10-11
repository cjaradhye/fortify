require("dotenv").config({ path: '../../../.env' });
const securityAnalysisService = require('../../services/securityAnalysisService');
const compilationService = require('../../services/compilationService');
const deploymentService = require('../../services/deploymentService');

class ContractAnalyzer {
    constructor() {
        this.riskThreshold = 70; // Deployment blocked if risk score >= 70
    }

    // Main function to analyze, compile and deploy contract
    async processContract(solidityCode, options = {}) {
        const {
            contractName = 'MyContract',
            constructorArgs = [],
            onlyAnalyze = false,
            skipAnalysis = false
        } = options;

        console.log('\n🔍 Starting Smart Contract Processing...\n');
        
        const result = {
            success: false,
            steps: {
                analysis: { completed: false },
                compilation: { completed: false },
                deployment: { completed: false }
            }
        };

        try {
            // Step 1: Security Analysis (unless skipped)
            if (!skipAnalysis) {
                console.log('📋 Step 1: Security Analysis');
                console.log('═'.repeat(40));
                
                const analysisResult = await securityAnalysisService.analyzeContract(solidityCode);
                
                if (!analysisResult.success) {
                    result.error = `Security analysis failed: ${analysisResult.error}`;
                    return result;
                }

                result.steps.analysis = {
                    completed: true,
                    riskScore: analysisResult.riskScore,
                    interpretation: analysisResult.interpretation,
                    vulnerabilities: analysisResult.vulnerabilities,
                    summary: analysisResult.summary
                };

                console.log(`Risk Score: ${analysisResult.riskScore}/100`);
                console.log(`Status: ${analysisResult.interpretation}`);
                console.log(`Vulnerabilities Found: ${analysisResult.vulnerabilities.length}\n`);

                // Check if deployment should be blocked
                if (analysisResult.riskScore >= this.riskThreshold) {
                    result.blocked = true;
                    result.error = `DEPLOYMENT BLOCKED - Risk score ${analysisResult.riskScore} exceeds threshold ${this.riskThreshold}`;
                    result.message = 'Contract failed security check. Fix vulnerabilities before deployment.';
                    return result;
                }

                console.log('✅ Security check passed - proceeding to compilation\n');
            }

            // If only analyzing, stop here
            if (onlyAnalyze) {
                result.success = true;
                result.message = 'Analysis completed successfully';
                return result;
            }

            // Step 2: Compilation
            console.log('🔧 Step 2: Compilation');
            console.log('═'.repeat(40));
            
            const compilationResult = await compilationService.compileContract(solidityCode, `${contractName}.sol`);
            
            if (!compilationResult.success) {
                result.error = `Compilation failed: ${compilationResult.error}`;
                result.compilationErrors = compilationResult.errors;
                return result;
            }

            result.steps.compilation = {
                completed: true,
                contractName: compilationResult.contractName,
                abi: compilationResult.abi,
                bytecode: compilationResult.bytecode,
                warnings: compilationResult.warnings
            };

            console.log(`✅ Compilation successful: ${compilationResult.contractName}`);
            console.log(`Warnings: ${compilationResult.warnings?.length || 0}\n`);

            // Step 3: Deployment
            console.log('🚀 Step 3: Deployment');
            console.log('═'.repeat(40));
            
            const deploymentResult = await deploymentService.deployContract({
                abi: compilationResult.abi,
                bytecode: compilationResult.bytecode,
                contractName: compilationResult.contractName,
                constructorArgs
            });

            if (!deploymentResult.success) {
                result.error = `Deployment failed: ${deploymentResult.error}`;
                return result;
            }

            result.steps.deployment = {
                completed: true,
                contractAddress: deploymentResult.contractAddress,
                transactionHash: deploymentResult.transactionHash,
                networkName: deploymentResult.networkName,
                explorerUrl: deploymentResult.explorerUrl,
                gasUsed: deploymentResult.gasUsed
            };

            console.log(`✅ Deployment successful!`);
            console.log(`Contract Address: ${deploymentResult.contractAddress}`);
            console.log(`Explorer: ${deploymentResult.explorerUrl}\n`);

            result.success = true;
            result.message = 'Contract successfully processed and deployed!';
            return result;

        } catch (error) {
            console.error('❌ Processing failed:', error.message);
            result.error = error.message;
            return result;
        }
    }

    // Quick security check only
    async quickSecurityCheck(solidityCode) {
        console.log('🔍 Quick Security Check\n');
        
        try {
            const result = await securityAnalysisService.analyzeContract(solidityCode);
            
            if (!result.success) {
                console.log('❌ Analysis failed:', result.error);
                return false;
            }

            console.log(`Risk Score: ${result.riskScore}/100`);
            console.log(`Vulnerabilities: ${result.vulnerabilities.length}`);
            console.log(`Status: ${result.interpretation}\n`);

            const safe = result.riskScore < this.riskThreshold;
            console.log(safe ? '✅ SAFE TO DEPLOY' : '❌ NOT SAFE TO DEPLOY');
            
            return {
                safe,
                riskScore: result.riskScore,
                vulnerabilities: result.vulnerabilities
            };

        } catch (error) {
            console.error('Security check failed:', error.message);
            return false;
        }
    }

    // Check wallet status before deployment
    async checkWalletStatus() {
        console.log('💰 Checking Wallet Status...\n');
        
        try {
            const balance = await deploymentService.getWalletBalance();
            
            if (balance.error) {
                console.log('❌ Wallet check failed:', balance.error);
                return false;
            }

            console.log(`Wallet Address: ${balance.address}`);
            console.log(`Balance: ${balance.balance} ETH`);
            
            const hasBalance = parseFloat(balance.balance) > 0.001; // At least 0.001 ETH
            console.log(hasBalance ? '✅ Sufficient balance' : '❌ Insufficient balance');
            
            return hasBalance;

        } catch (error) {
            console.error('Wallet status check failed:', error.message);
            return false;
        }
    }
}

// Export for use in other scripts
module.exports = ContractAnalyzer;

// If run directly, provide a simple test
if (require.main === module) {
    const testContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleStorage {
    uint256 private value;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function setValue(uint256 _value) public {
        require(msg.sender == owner, "Only owner can set value");
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}
`;

    async function test() {
        const analyzer = new ContractAnalyzer();
        
        // Check wallet first
        await analyzer.checkWalletStatus();
        
        // Run full process
        const result = await analyzer.processContract(testContract, {
            contractName: 'SimpleStorage',
            constructorArgs: []
        });
        
        console.log('\n📊 Final Result:');
        console.log('═'.repeat(50));
        console.log(JSON.stringify(result, null, 2));
    }

    test().catch(console.error);
}