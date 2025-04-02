require("dotenv").config();
const axios = require("axios");
const { ethers } = require("ethers");
const fs = require('fs');
const path = require('path');

const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

async function fetchContractDetails(contractAddress) {
    try {
        const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);

        const bytecode = await provider.getCode(contractAddress);
        if (bytecode === "0x") {
            throw new Error("No contract found at this address");
        }
        
        const abiUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
        const sourceUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
        
        const [abiResponse, sourceResponse] = await Promise.all([
            axios.get(abiUrl),
            axios.get(sourceUrl)
        ]);
        
        let abi = null;
        let sourceCode = null;
        let contractName = null;
        
        if (abiResponse.data.status === "1") {
            abi = JSON.parse(abiResponse.data.result);
        }
        
        if (sourceResponse.data.status === "1" && sourceResponse.data.result.length > 0) {
            sourceCode = sourceResponse.data.result[0].SourceCode;
            contractName = sourceResponse.data.result[0].ContractName;
            
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
        }
        
        const dummyRiskScore = Math.random() * 10; 
        
        return { 
            bytecode, 
            abi, 
            sourceCode, 
            contractName,
            riskScore: dummyRiskScore 
        };
    } catch (error) {
        console.error("Error fetching contract details:", error.message);
        throw error;
    }
}

module.exports = {
    fetchContractDetails
};