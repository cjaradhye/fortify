require("dotenv").config({ path: '../../../.env' });

const { ethers } = require("ethers");
const fs = require('fs');

const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function deployToSepolia(targetContractAddress = "0xC226600554c4603133fD90d694Eb449d9e203B8c") {
    try {
        const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        const network = await provider.getNetwork();
        console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
        console.log(`👤 Deployer: ${wallet.address}`);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
        
        if (balance === 0n) {
            console.log("❌ Insufficient balance! Get Sepolia ETH from:");
            console.log("   https://sepoliafaucet.com/");
            console.log("   https://faucets.chain.link/sepolia");
            return;
        }
        const contractPath = '../artifacts/contracts/SecurityProxy.sol/SecurityProxy.json';
        if (!fs.existsSync(contractPath)) {
            console.log("❌ Contract artifact not found!");
            console.log("💡 Compile first: npx hardhat compile");
            return;
        }

        const contractArtifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
        console.log("✅ Contract artifact loaded");

        const SecurityProxy = new ethers.ContractFactory(
            contractArtifact.abi,
            contractArtifact.bytecode,
            wallet  
        );

        console.log(`🎯 Target contract: ${targetContractAddress}`);
        console.log("🛡️ Deploying SecurityProxy to Sepolia...");

    
        const securityProxy = await SecurityProxy.deploy(targetContractAddress, {
            gasLimit: 3000000, 
        });

        console.log("⏳ Waiting for deployment confirmation...");
        await securityProxy.waitForDeployment();

        const proxyAddress = await securityProxy.getAddress();
        console.log(`✅ SecurityProxy deployed to Sepolia: ${proxyAddress}`);

        const deploymentTx = securityProxy.deploymentTransaction();
        console.log(`📋 Deployment tx: ${deploymentTx.hash}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${deploymentTx.hash}`);
        try {
            const admin = await securityProxy.admin();
            const target = await securityProxy.targetContract();
            const frozen = await securityProxy.frozen();

            console.log(`🔍 Proxy admin: ${admin}`);
            console.log(`🔍 Target: ${target}`);
            console.log(`🔍 Frozen: ${frozen}`);
            const registryEntry = {
                originalContract: targetContractAddress,
                proxyContract: proxyAddress,
                network: "sepolia",
                chainId: Number(network.chainId),
                deploymentTx: deploymentTx.hash,
                timestamp: new Date().toISOString(),
                status: "DEPLOYED_TO_SEPOLIA"
            };

            let registry = [];
            if (fs.existsSync('./sepolia_registry.json')) {
                registry = JSON.parse(fs.readFileSync('./sepolia_registry.json', 'utf8'));
            }

            registry.push(registryEntry);
            fs.writeFileSync('./sepolia_registry.json', JSON.stringify(registry, null, 2));
            console.log("✅ Sepolia registry updated");

        } catch (verifyError) {
            console.log("⚠️ Could not verify contract functions:", verifyError.message);
        }

        return proxyAddress;

    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("💡 Need more Sepolia ETH");
        }
        if (error.message.includes("nonce")) {
            console.log("💡 Nonce issue - wait and retry");
        }
        
        return null;
    }
}

deployToSepolia()
    .then((address) => {
        if (address) {
            console.log(`\n🎉 SUCCESS! SecurityProxy deployed to Sepolia: ${address}`);
        } else {
            console.log("\n❌ Deployment failed");
        }
    })
    .catch(console.error);