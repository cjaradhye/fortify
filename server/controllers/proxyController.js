// controllers/proxyController.js

const { fetchContractDetails } = require('../blockchain/scripts/fetchContract');
const progressTracker = require('../utils/progressTracker');

async function fetchContract(req, res) {
    const { contractAddress } = req.body;
    const processId = Date.now(); // Unique ID for the current process

    // Initialize progress tracking
    progressTracker.setProgress(processId, "Starting contract fetch...");

    try {
        // Fetch contract details and progress updates
        const contractDetails = await fetchContractDetails(contractAddress, processId);

        if (contractDetails) {
            progressTracker.setProgress(processId, "Sending source code to ML model...");
            // You can integrate the ML model call here

            progressTracker.setProgress(processId, "Operation completed!");
            res.json({
                success: true,
                message: "Contract details fetched and sent to ML model",
                processId, // Send processId so frontend can track progress
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
