require("dotenv").config();
const hre = require("hardhat");
async function main() {
  const targetContract = process.env.TARGET_CONTRACT;
  
  if (!targetContract) {
    console.error("Please set TARGET_CONTRACT in your .env file");
    process.exit(1);
  }
  if (!targetContract.startsWith('0x') || targetContract.length !== 42) {
    console.error("TARGET_CONTRACT does not appear to be a valid Ethereum address");
    process.exit(1);
  }
  console.log(`Deploying SecurityProxy for target contract: ${targetContract}`);
  
  await hre.run('compile');
  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const SecurityProxy = await ethers.getContractFactory("SecurityProxy");
  const securityProxy = await SecurityProxy.deploy(targetContract);
 
  await securityProxy.waitForDeployment();
  
  const proxyAddress = await securityProxy.getAddress();
  console.log(`SecurityProxy deployed to: ${proxyAddress}`);
  console.log(`Target contract is now protected and frozen`);
  
  const fs = require('fs');
  fs.writeFileSync(
    './contracts/SecurityProxy_address.txt',
    proxyAddress
  );
  
  console.log("Contract address saved to contracts/SecurityProxy_address.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });