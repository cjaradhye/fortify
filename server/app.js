require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { fetchContractDetails, saveSolidityCode } = require("./fetchContract");

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend to call backend

app.post("/fetch-contract", async (req, res) => {
    const { contractAddress } = req.body;

    if (!contractAddress) {
        return res.status(400).json({ error: "Contract address is required" });
    }

    try {
        console.log(`Fetching contract details for: ${contractAddress}`);
        const details = await fetchContractDetails(contractAddress);

        if (details && details.rawSourceCode) {
            await saveSolidityCode(details); // Save Solidity file
            res.json({ message: "Contract fetched successfully!", sourceCode: details.rawSourceCode });
        } else {
            res.status(404).json({ error: "No verified contract found at this address" });
        }
    } catch (error) {
        console.error("Error fetching contract:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
