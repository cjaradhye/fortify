const { fetchContractDetails } = require('../services/blockchainService');
const progressTracker = require('../utils/progressTracker');

async function fetchContract(req, res) {
  const { contractAddress } = req.body;
  const processId = Date.now(); // Unique ID for the current process
  
  // Initialize progress tracking
  progressTracker.setProgress(processId, "Starting contract fetch...");

  try {
    progressTracker.setProgress(processId, "Fetching contract details...");
    const contractDetails = await fetchContractDetails(contractAddress, processId);
    
    if (contractDetails) {
      progressTracker.setProgress(processId, "Sending source code to ML model...");
      // You can call your ML model here with the contractDetails.sourceCode
      // await sendToMLModel(contractDetails.sourceCode);

      progressTracker.setProgress(processId, "Operation completed!");
      res.json({
        success: true,
        message: "Contract details fetched and sent to ML model",
      });
    } else {
      progressTracker.setProgress(processId, "Failed to fetch contract details.");
      res.status(400).json({ success: false, message: "Failed to fetch contract details" });
    }
  } catch (error) {
    console.error(error);
    progressTracker.setProgress(processId, `Error: ${error.message}`);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
}

async function getProgress(req, res) {
  const { processId } = req.query;
  const progress = progressTracker.getProgress(processId);
  res.json({ progress });
}

module.exports = {
  fetchContract,
  getProgress,
};
