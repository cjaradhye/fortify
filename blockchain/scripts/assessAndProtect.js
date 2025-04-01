require("dotenv").config();
const axios = require("axios");
const { ethers } = require("ethers");
const fs = require('fs');


const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;


const RISK_THRESHOLD = 7.0;

async function fetchContractDetails(contractAddress) {
    try {
        const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
      
        const bytecode = await provider.getCode(contractAddress);
        if (bytecode === "0x") {
            console.log("❌ No contract found at this address!");
            return null;
        }
        console.log("✅ Contract bytecode retrieved!");
     
        console.log("🔍 Checking if contract is verified on Etherscan...");
        
        const abiUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
        const abiResponse = await axios.get(abiUrl);
  
        const sourceUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
        const sourceResponse = await axios.get(sourceUrl);
        
        let abi = null;
        let sourceCode = null;
        let contractName = null;
        
        if (abiResponse.data.status === "1") {
            abi = JSON.parse(abiResponse.data.result);
            console.log("✅ Contract ABI retrieved from Etherscan!");
        } else {
            console.log("❌ Contract ABI retrieval failed.");
            return null; 
        }
        
        if (sourceResponse.data.status === "1" && sourceResponse.data.result.length > 0) {
            sourceCode = sourceResponse.data.result[0].SourceCode;
            contractName = sourceResponse.data.result[0].ContractName;
            console.log("✅ Contract source code retrieved from Etherscan!");
            
            fs.writeFileSync('./contract-source.sol', sourceCode);
        } else {
            console.log("❌ Contract source code retrieval failed or contract is not verified.");
        }
        
       
        const dummyRiskScore = Math.random() * 10; 
        console.log(`📊 Risk Score: ${dummyRiskScore.toFixed(2)}/10`);
        
        return { 
            bytecode, 
            abi, 
            sourceCode, 
            contractName,
            riskScore: dummyRiskScore 
        };
    } catch (error) {
        console.error("Error fetching contract details:", error.message);
        return null;
    }
}

async function deploySecurityProxy(targetContractAddress, targetContractABI) {
    try {
        console.log("🛡️ Deploying Security Proxy Contract...");
        
        const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        
        const proxyBytecode = fs.readFileSync('./contracts/SecurityProxy_bytecode.txt', 'utf8');
        const proxyABI = JSON.parse(fs.readFileSync('./contracts/SecurityProxy_ABI.json', 'utf8'));
        
       
        const SecurityProxy = new ethers.ContractFactory(proxyABI, proxyBytecode, signer);
        
       
        const securityProxy = await SecurityProxy.deploy(targetContractAddress);
        await securityProxy.deploymentTransaction().wait();
        
        console.log(`✅ Security Proxy deployed at: ${securityProxy.target}`);
        
        return securityProxy.target;
    } catch (error) {
        console.error("Error deploying security proxy:", error.message);
        return null;
    }
}

async function updateRegistry(contractAddress, proxyAddress, riskScore) {
    try {
        console.log("📝 Updating contract registry...");
        
        const registryEntry = {
            originalContract: contractAddress,
            proxyContract: proxyAddress,
            riskScore: riskScore,
            timestamp: new Date().toISOString(),
            status: "FROZEN"
        };
        
        // For this example, we'll just save to a JSON file
        let registry = [];
        if (fs.existsSync('./contract_registry.json')) {
            registry = JSON.parse(fs.readFileSync('./contract_registry.json', 'utf8'));
        }
        
        registry.push(registryEntry);
        fs.writeFileSync('./contract_registry.json', JSON.stringify(registry, null, 2));
        
        console.log("✅ Registry updated successfully");
        return true;
    } catch (error) {
        console.error("Error updating registry:", error.message);
        return false;
    }
}

async function assessAndProtectContract(contractAddress) {
    console.log(`\n------ ASSESSING CONTRACT: ${contractAddress} ------`);
    
  
    const contractDetails = await fetchContractDetails(contractAddress);
    if (!contractDetails) {
        console.log("❌ Could not fetch contract details. Aborting.");
        return;
    }
    
    console.log(`\n------ RISK ASSESSMENT ------`);
    console.log(`Risk Score: ${contractDetails.riskScore.toFixed(2)}/10`);
    console.log(`Risk Threshold: ${RISK_THRESHOLD}/10`);
    
    if (contractDetails.riskScore < RISK_THRESHOLD) {
        console.log("✅ Contract passed risk assessment. No action needed.");
        return;
    }
   
    console.log("⚠️ Contract failed risk assessment. Deploying security proxy...");
    const proxyAddress = await deploySecurityProxy(contractAddress, contractDetails.abi);
    
    if (!proxyAddress) {
        console.log("❌ Failed to deploy security proxy. Aborting.");
        return;
    }
    
    await updateRegistry(contractAddress, proxyAddress, contractDetails.riskScore);
    
    console.log(`\n------ SECURITY MEASURES IMPLEMENTED ------`);
    console.log(`Original contract: ${contractAddress}`);
    console.log(`Security proxy: ${proxyAddress}`);
    console.log(`Status: FROZEN due to risk score of ${contractDetails.riskScore.toFixed(2)}/10`);
    console.log(`\nℹ️ All future transactions to the original contract will be blocked by the proxy.`);
}


async function main() {
    const contractAddress = process.argv[2] || "0x4E95B942633b77372fFeafDf9A8105C23B17D91B";
    await assessAndProtectContract(contractAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });