
const path = require('path');
const fs = require('fs');
const axios = require("axios");
const { ethers } = require("ethers");
if (!process.env.DOCKER_ENV) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

if (!process.env.INFURA_RPC_URL) {
    throw new Error('INFURA_RPC_URL is required but not found in environment variables');
}

if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY is required but not found in environment variables');
}

const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

console.log(`🔗 blockchainService: Using Infura RPC: ${INFURA_RPC_URL.substring(0, 50)}...`);

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            const network = await this.provider.getNetwork();
            console.log(`✅ Blockchain Service Connected: ${network.name} (Chain ID: ${network.chainId})`);
            this.initialized = true;
        } catch (error) {
            console.error('❌ Failed to initialize blockchain service:', error.message);
            throw new Error(`Blockchain connection failed: ${error.message}`);
        }
    }

    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Blockchain service not initialized');
        }
    }

    // MAIN FUNCTION: Fetch contract details (replaces fetchContract.js functionality)
    async fetchContractDetails(contractAddress) {
        try {
            console.log(`🔍 Fetching contract details for: ${contractAddress}`);
            
            // Validate address format
            if (!ethers.isAddress(contractAddress)) {
                throw new Error('Invalid Ethereum address format');
            }

            // Check if contract exists
            const bytecode = await this.provider.getCode(contractAddress);
            if (bytecode === "0x") {
                throw new Error("No contract found at this address");
            }
            console.log("✅ Contract bytecode retrieved!");
            
            console.log("🔍 Fetching contract source from Etherscan...");
            
            // Fetch from Etherscan (Sepolia)
            const sourceUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
            
            let sourceResponse;
            try {
                sourceResponse = await axios.get(sourceUrl, { timeout: 15000 });
            } catch (axiosError) {
                console.error('❌ Etherscan API request failed:', axiosError.message);
                throw new Error(`Etherscan API request failed: ${axiosError.message}`);
            }
            
            let rawSourceCode = null;
            let contractName = null;
            let abi = null;
            
            if (sourceResponse.data.status === "1" && sourceResponse.data.result.length > 0) {
                const result = sourceResponse.data.result[0];
                rawSourceCode = result.SourceCode;
                contractName = result.ContractName;
                
                // Try to parse ABI if available
                if (result.ABI && result.ABI !== "Contract source code not verified") {
                    try {
                        abi = JSON.parse(result.ABI);
                    } catch (e) {
                        console.log("⚠️ Could not parse contract ABI");
                    }
                }
                
                if (rawSourceCode && rawSourceCode.trim() !== "") {
                    console.log("✅ Contract source code retrieved from Etherscan!");
                    console.log(`📝 Source code length: ${rawSourceCode.length} characters`);
                    console.log(`📋 Contract name: ${contractName}`);
                } else {
                    throw new Error("Contract is not verified on Etherscan or source code is empty");
                }
            } else {
                console.log("❌ Contract source code retrieval failed");
                throw new Error("Contract source code not found on Etherscan - contract may not be verified");
            }
            
            return { 
                rawSourceCode, 
                contractName,
                abi,
                address: contractAddress,
                bytecode,
                network: 'sepolia'
            };
            
        } catch (error) {
            console.error("❌ Error fetching contract details:", error.message);
            throw error;
        }
    }

    // UTILITY: Extract Solidity code from different formats
    extractSolidityCode(sourceCode) {
        if (!sourceCode) {
            console.log("❌ No source code provided to extract");
            return null;
        }
        
        try {
            console.log("🔧 Extracting Solidity code...");
            console.log(`📝 Input length: ${sourceCode.length} characters`);
            
            // Format 1: Double-wrapped JSON {{...}}
            if (sourceCode.startsWith('{{') && sourceCode.endsWith('}}')) {
                console.log("🔧 Detected double-wrapped JSON format");
                const jsonContent = sourceCode.substring(1, sourceCode.length - 1);
                const parsedJson = JSON.parse(jsonContent);
                if (parsedJson.sources) {
                    const firstSourceFile = Object.values(parsedJson.sources)[0];
                    if (firstSourceFile && firstSourceFile.content) {
                        console.log("✅ Extracted from double-wrapped JSON");
                        return firstSourceFile.content;
                    }
                }
            } 
            // Format 2: Single-wrapped JSON {...}
            else if (sourceCode.startsWith('{') && sourceCode.endsWith('}')) {
                console.log("🔧 Detected single-wrapped JSON format");
                try {
                    const parsedJson = JSON.parse(sourceCode);
                    if (parsedJson.sources) {
                        const firstSourceFile = Object.values(parsedJson.sources)[0];
                        if (firstSourceFile && firstSourceFile.content) {
                            console.log("✅ Extracted from single-wrapped JSON");
                            return firstSourceFile.content;
                        }
                    }
                } catch (parseError) {
                    console.log("🔧 Not valid JSON, treating as direct code");
                }
            }
            
            // Format 3: Direct Solidity code
            console.log("🔧 Treating as direct Solidity code");
            if (sourceCode.includes('pragma solidity') || sourceCode.includes('contract ')) {
                console.log("✅ Direct Solidity code detected");
                return sourceCode;
            }
            
            console.log("❌ No recognizable Solidity code format found");
            return sourceCode; // Return as-is and let the caller handle it
            
        } catch (error) {
            console.error("❌ Error extracting Solidity code:", error.message);
            return sourceCode; // Fallback to original
        }
    }

    // UTILITY: Save Solidity code to file
    async saveSolidityCode(details) {
        console.log("💾 Saving Solidity code to file...");
        
        if (!details || !details.rawSourceCode) {
            console.log("❌ No details or rawSourceCode found");
            throw new Error("No source code to save");
        }
        
        const outputDir = path.join(__dirname, '../blockchain/contracts/fetched');
        const filename = 'FetchedContract.sol';
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            console.log("📁 Creating output directory...");
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const solidityCode = this.extractSolidityCode(details.rawSourceCode);
        
        if (solidityCode && solidityCode.trim() !== "") {
            const sourceFile = path.join(outputDir, filename);
            
            try {
                fs.writeFileSync(sourceFile, solidityCode, 'utf8');
                console.log(`✅ Solidity code saved to: ${sourceFile}`);
                console.log(`📝 Saved ${solidityCode.length} characters`);
                return sourceFile;
            } catch (writeError) {
                console.error("❌ Error writing file:", writeError.message);
                throw writeError;
            }
        } else {
            console.log("❌ No valid Solidity code to save");
            throw new Error("No valid Solidity code extracted");
        }
    }

    // UTILITY: Get contract balance
    async getContractBalance(contractAddress) {
        try {
            const balance = await this.provider.getBalance(contractAddress);
            return {
                wei: balance.toString(),
                ether: ethers.formatEther(balance)
            };
        } catch (error) {
            console.error("Error getting contract balance:", error);
            throw error;
        }
    }

    // UTILITY: Get transaction count
    async getTransactionCount(address) {
        try {
            const txCount = await this.provider.getTransactionCount(address);
            return txCount;
        } catch (error) {
            console.error("Error getting transaction count:", error);
            throw error;
        }
    }

    // UTILITY: Get network information
    async getNetworkInfo() {
        try {
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            
            return {
                name: network.name,
                chainId: Number(network.chainId),
                blockNumber: blockNumber
            };
        } catch (error) {
            console.error("Error getting network info:", error);
            throw error;
        }
    }

    // UTILITY: Validate contract address
    isValidAddress(address) {
        return ethers.isAddress(address);
    }

    // UTILITY: Check if address is a contract
    async isContract(address) {
        try {
            const code = await this.provider.getCode(address);
            return code !== "0x";
        } catch (error) {
            return false;
        }
    }

    // COMPREHENSIVE: Fetch contract with full analysis
    async fetchContractWithAnalysis(contractAddress) {
        try {
            const details = await this.fetchContractDetails(contractAddress);
            const extractedCode = this.extractSolidityCode(details.rawSourceCode);
            const balance = await this.getContractBalance(contractAddress);
            
            return {
                ...details,
                extractedCode,
                balance,
                hasSourceCode: !!extractedCode,
                codeLength: extractedCode ? extractedCode.length : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw error;
        }
    }
}

// Create singleton instance
const blockchainService = new BlockchainService();

// Export both the instance methods and backward-compatible function exports
module.exports = {
    // Backward compatibility exports (for existing code)
    fetchContractDetails: (address) => blockchainService.fetchContractDetails(address),
    extractSolidityCode: (sourceCode) => blockchainService.extractSolidityCode(sourceCode),
    saveSolidityCode: (details) => blockchainService.saveSolidityCode(details),
    
    // Additional utilities
    getContractBalance: (address) => blockchainService.getContractBalance(address),
    getTransactionCount: (address) => blockchainService.getTransactionCount(address),
    getNetworkInfo: () => blockchainService.getNetworkInfo(),
    isValidAddress: (address) => blockchainService.isValidAddress(address),
    isContract: (address) => blockchainService.isContract(address),
    
    // New comprehensive method
    fetchContractWithAnalysis: (address) => blockchainService.fetchContractWithAnalysis(address),
    
    // Direct service access
    blockchainService
};