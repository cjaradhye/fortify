const axios = require("axios");
const { ethers } = require("ethers");
const progressTracker = require('../utils/progressTracker');

const INFURA_RPC_URL = process.env.INFURA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

async function fetchContractDetails(contractAddress, processId) {
  progressTracker.setProgress(processId, "Connecting to blockchain...");

  const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL);
  const bytecode = await provider.getCode(contractAddress);
  if (bytecode === "0x") {
    progressTracker.setProgress(processId, "No contract found at this address!");
    return;
  }

  progressTracker.setProgress(processId, "Contract bytecode retrieved, checking for verification...");
  const abiUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
  const sourceUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;

  try {
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
    }

    return { bytecode, abi, sourceCode, contractName };
  } catch (error) {
    console.error(error);
    progressTracker.setProgress(processId, "Error fetching contract details from Etherscan.");
  }
}

module.exports = {
  fetchContractDetails,
};
