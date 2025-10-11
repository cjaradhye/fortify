const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Target Contract...");
  
  await hre.run('compile');
  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
 const SimpleContract = await ethers.getContractFactory(
  "contracts/payable.sol:SimpleStorage2"
);
  const simpleContract = await SimpleContract.deploy();
  
  await simpleContract.waitForDeployment();
  const targetAddress = await simpleContract.getAddress();
  
  console.log(`✅ Target contract deployed at: ${targetAddress}`);
  console.log(`💡 Add this to your .env file: TARGET_CONTRACT=${targetAddress}`);
  
  return targetAddress;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});