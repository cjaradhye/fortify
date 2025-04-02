const { ethers } = require("hardhat");

async function main() {
  const proxyAddress = "0xa68D14692641681A6FbAd42B8d94C0747Fb47462";
  
  const proxyABI = [
    "function frozen() external view returns (bool)"
  ];
  
  
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  const proxyContract = new ethers.Contract(proxyAddress, proxyABI, signer);

  const isFrozen = await proxyContract.frozen();
  console.log("Is the contract frozen?", isFrozen);
  
  if (isFrozen) {
    try {
  
      const amount = ethers.parseEther("0.1");
      
      
      const tx = await signer.sendTransaction({
        to: proxyAddress,
        value: amount,
      });
  
      console.log(`Transaction sent: ${tx.hash}`);
  
      const receipt = await tx.wait();
      console.log(`Transaction confirmed: ${tx.hash}`);
    } catch (error) {
      console.error("Transaction failed. The contract is frozen:", error.message);
    }
  } else {
    console.log("The contract is not frozen. You can send Ether.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });