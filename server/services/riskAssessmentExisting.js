// server/services/riskAssessmentService.js
const { ethers } = require("ethers");
const fs = require('fs');
const path = require('path');

if (!process.env.DOCKER_ENV) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}
const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RISK_THRESHOLD =  50;

async function assessAndProtectContract(contractAddress, riskScore, mlAnalysis) {
    try {
        console.log(`🔍 Assessing contract ${contractAddress}`);
        console.log(`📊 Risk Score: ${riskScore}`);
        console.log(`⚖️ Threshold: ${RISK_THRESHOLD}`);
        
      
        if (riskScore >= RISK_THRESHOLD) {
            console.log(`🚨 HIGH RISK DETECTED! Score ${riskScore} >= ${RISK_THRESHOLD}`);
            console.log(`🛡️ Deploying SecurityProxy for protection...`);
            
            const proxyAddress = await deploySecurityProxy(contractAddress);
            
            if (proxyAddress) {
                await logDeployment(contractAddress, proxyAddress, riskScore, mlAnalysis);
                return {
                    action: 'PROTECTED',
                    riskScore,
                    threshold: RISK_THRESHOLD,
                    proxyAddress,
                    message: `Contract automatically protected due to high risk score (${riskScore})`
                };
            } else {
                throw new Error('Failed to deploy SecurityProxy');
            }
        } else {
            console.log(`✅ LOW RISK: Score ${riskScore} < ${RISK_THRESHOLD}`);
            console.log(`📝 No protection needed`);
            
            return {
                action: 'NO_ACTION',
                riskScore,
                threshold: RISK_THRESHOLD,
                message: `Contract is safe - risk score (${riskScore}) below threshold`
            };
        }
        
    } catch (error) {
        console.error("❌ Error in risk assessment:", error);
        throw error;
    }
}

async function deploySecurityProxy(targetContractAddress) {
    try {
        const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        const contractPath = path.join(__dirname, '../blockchain/artifacts/contracts/securityProxy.sol/SecurityProxy.json');
        
        if (!fs.existsSync(contractPath)) {
            console.log("❌ SecurityProxy artifact not found!");
            console.log("💡 Run: cd blockchain && npx hardhat compile");
            return null;
        }

        const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        
        const SecurityProxy = new ethers.ContractFactory(
            contractArtifact.abi,
            contractArtifact.bytecode,
            wallet
        );

        console.log(`🚀 Deploying SecurityProxy for ${targetContractAddress}...`);
        
        const securityProxy = await SecurityProxy.deploy(targetContractAddress, {
            gasLimit: 3000000,
        });

        await securityProxy.waitForDeployment();
        const proxyAddress = await securityProxy.getAddress();
        
        console.log(`✅ SecurityProxy deployed at: ${proxyAddress}`);
        
        return proxyAddress;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        return null;
    }
}

async function logDeployment(originalContract, proxyContract, riskScore, mlAnalysis) {
    const registryFile = path.join(__dirname, '../blockchain/scripts/auto_deployment_registry.json');
    
    let registry = [];
    if (fs.existsSync(registryFile)) {
        registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    }
    
    const entry = {
        originalContract,
        proxyContract,
        riskScore,
        threshold: RISK_THRESHOLD,
        mlAnalysis: mlAnalysis ? {
            securityScore: mlAnalysis.securityScore,
            vulnerabilities: mlAnalysis.vulnerabilities?.length || 0
        } : null,
        network: "sepolia",
        timestamp: new Date().toISOString(),
        status: "AUTO_DEPLOYED"
};
    
    registry.push(entry);
    fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
    console.log(`📝 Deployment logged to registry`);
}

module.exports = {
    assessAndProtectContract,
    deploySecurityProxy,
    RISK_THRESHOLD
};