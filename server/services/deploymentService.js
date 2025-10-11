const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
// Load .env ONLY if not in Docker
if (!process.env.DOCKER_ENV) {
    require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}
let envFound = false;
for (const envPath of envPaths) {
    console.log(`   Checking: ${envPath}`);
    if (fs.existsSync(envPath)) {
        console.log(`✅ Found .env file at: ${envPath}`);
        require('dotenv').config({ path: envPath });
        envFound = true;
        break;
    } else {
        console.log(`   ❌ Not found`);
    }
}

class DeploymentService {
    constructor() {
        this.initialized = false;
        this.provider = null;
        this.wallet = null;
        this.networkName = 'Sepolia';
        
        // Don't throw error in constructor - just try to initialize
        this.initialize();
    }
    
    initialize() {
        console.log('🔧 Initializing Deployment Service...');
        
        if (!process.env.INFURA_RPC_URL || !process.env.PRIVATE_KEY) {
            console.error('⚠️ Missing required environment variables');
            console.log('📝 Expected variables:');
            console.log('   - INFURA_RPC_URL');
            console.log('   - PRIVATE_KEY');
            console.log('');
            console.log('📄 Your .env file should contain:');
            console.log('INFURA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
            console.log('PRIVATE_KEY=your_64_character_hex_private_key');
            return false;
        }

        try {
            // Validate and clean private key
            let privateKey = process.env.PRIVATE_KEY.trim();
            
            // Remove 0x prefix if present
            if (privateKey.startsWith('0x')) {
                privateKey = privateKey.slice(2);
            }
            
            // Validate private key
            if (privateKey.length !== 64) {
                throw new Error(`Invalid private key length: ${privateKey.length}. Expected 64 hex characters.`);
            }
            
            if (!/^[0-9a-fA-F]+$/.test(privateKey)) {
                throw new Error('Private key must contain only hexadecimal characters');
            }
            
            // Add 0x prefix back
            privateKey = '0x' + privateKey;
            
            this.provider = new ethers.JsonRpcProvider(process.env.INFURA_RPC_URL);
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.initialized = true;
            
            console.log('✅ Deployment service initialized successfully');
            console.log(`   Network: ${this.networkName}`);
            console.log(`   Wallet: ${this.wallet.address}`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize deployment service:', error.message);
            this.initialized = false;
            return false;
        }
    }
    
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Deployment service not initialized. Check environment variables and try again.');
        }
    }

    async deployContract({ abi, bytecode, contractName, constructorArgs = [] }) {
        this.ensureInitialized();
        
        try {
            console.log(`🚀 Deploying ${contractName}...`);

            // Validate inputs
            if (!abi || !bytecode) {
                throw new Error('Missing ABI or bytecode');
            }

            // Add 0x prefix if missing
            if (!bytecode.startsWith('0x')) {
                bytecode = '0x' + bytecode;
            }

            // Create contract factory
            const contractFactory = new ethers.ContractFactory(abi, bytecode, this.wallet);
            
            // Deploy contract
            const contract = await contractFactory.deploy(...constructorArgs);
            
            console.log(`⏳ Waiting for deployment confirmation...`);
            await contract.waitForDeployment();
            
            const contractAddress = await contract.getAddress();
            const txHash = contract.deploymentTransaction().hash;
            
            // Get deployment receipt for gas info
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            console.log(`✅ Contract deployed at: ${contractAddress}`);

            return {
                success: true,
                contractAddress,
                transactionHash: txHash,
                networkName: this.networkName,
                explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
                gasUsed: receipt.gasUsed.toString(),
                deploymentCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
            };

        } catch (error) {
            console.error('Deployment failed:', error);
            
            // Handle common errors with helpful messages
            let errorMessage = error.message;
            if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for deployment. Please check your wallet balance.';
            } else if (error.message.includes('nonce')) {
                errorMessage = 'Transaction nonce error. Please try again.';
            } else if (error.message.includes('gas')) {
                errorMessage = 'Gas estimation failed. The contract might have errors.';
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    async getTransactionStatus(txHash) {
        this.ensureInitialized();
        
        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            if (receipt) {
                return {
                    status: receipt.status === 1 ? 'confirmed' : 'failed',
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString()
                };
            } else {
                return { status: 'pending' };
            }
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    // Check wallet balance
    async getWalletBalance() {
        this.ensureInitialized();
        
        try {
            const balance = await this.provider.getBalance(this.wallet.address);
            return {
                balance: ethers.formatEther(balance),
                address: this.wallet.address
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }
}

module.exports = new DeploymentService();