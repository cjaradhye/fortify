//user address input to source code -> contract-source.sol

require("dotenv").config();
const axios = require("axios");
const { ethers } = require("ethers");


const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

async function fetchContractDetails(contractAddress) {
    try {
        const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);

        const bytecode = await provider.getCode(contractAddress);
        if (bytecode === "0x") {
            console.log("❌ No contract found at this address!");
            return;
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
        }
        
        if (sourceResponse.data.status === "1" && sourceResponse.data.result.length > 0) {
            sourceCode = sourceResponse.data.result[0].SourceCode;
            contractName = sourceResponse.data.result[0].ContractName;
            console.log("✅ Contract source code retrieved from Etherscan!");
        
            if (sourceCode.startsWith('{')) {
                try {
                    const sourceJson = JSON.parse(sourceCode);
                    if (sourceJson.sources) {
                       
                        const sources = {};
                        for (const [path, content] of Object.entries(sourceJson.sources)) {
                            sources[path] = content.content;
                        }
                        sourceCode = sources;
                    }
                } catch (e) {
                    console.log("Source code is in a special format, using as-is");
                }
            }
        } else {
            console.log("❌ Contract source code retrieval failed or contract is not verified.");
        }
        
        
        const dummyRiskScore = Math.random() * 10; 
        console.log(`Risk Score (dummy): ${dummyRiskScore.toFixed(2)}/10`);
        
        return { 
            bytecode, 
            abi, 
            sourceCode, 
            contractName,
            riskScore: dummyRiskScore 
        };
    } catch (error) {
        console.error("Error fetching contract details:", error.message);
    }
}


async function main() {
    const userContractAddress = "0x4E95B942633b77372fFeafDf9A8105C23B17D91B"; 
    const contractDetails = await fetchContractDetails(userContractAddress);
    
    if (contractDetails) {
      
        console.log("\n--- CONTRACT DETAILS ---");
        console.log(`Address: ${userContractAddress}`);
        console.log(`Contract Name: ${contractDetails.contractName || 'Unknown'}`);
        console.log(`Has ABI: ${contractDetails.abi ? 'Yes' : 'No'}`);
        console.log(`Has Source Code: ${contractDetails.sourceCode ? 'Yes' : 'No'}`);
        console.log(`Risk Score: ${contractDetails.riskScore.toFixed(2)}/10`);
        
    
        if (contractDetails.sourceCode) {
            const fs = require('fs');
          
            if (typeof contractDetails.sourceCode === 'string') {
                fs.writeFileSync('./contract-source.sol', contractDetails.sourceCode);
                console.log("✅ Source code saved to contract-source.sol");
            } else {
               
                if (!fs.existsSync('./contract-sources')) {
                    fs.mkdirSync('./contract-sources');
                }
                
                for (const [path, content] of Object.entries(contractDetails.sourceCode)) {
                  
                    const filePath = `./contract-sources/${path}`;
                    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    
                    fs.writeFileSync(filePath, content);
                }
                console.log("✅ Multiple source files saved to ./contract-sources directory");
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });