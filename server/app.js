require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { fetchContractDetails, saveSolidityCode, extractSolidityCode } = require("./fetchContract"); // ✅ Import extractSolidityCode

const app = express();
app.use(express.json());

// ✅ Allow all origins temporarily (Change for production)
app.use(cors({ origin: "*" }));

app.post("/fetch-contract", async (req, res) => {
    const { contractAddress } = req.body;

    if (!contractAddress) {
        return res.status(400).json({ error: "Contract address is required" });
    }

    try {
        console.log(`Fetching contract details for: ${contractAddress}`);
        const details = await fetchContractDetails(contractAddress);

        if (details && details.rawSourceCode) {
            // ✅ Extract only Solidity contract code
            const extractedCode = extractSolidityCode(details.rawSourceCode);

            if (!extractedCode) {
                return res.status(400).json({ error: "No Solidity contract code found" });
            }

            await saveSolidityCode({ ...details, extractedCode }); // Save extracted Solidity code

            console.log("Sending Solidity code to ML model...");
            const mlResponse = await axios.post(
                "http://localhost:8000/predict",
                { code: extractedCode } // ✅ Send extracted Solidity code
            );

            if (mlResponse.data && mlResponse.data.risk_score) {
                res.json({
                    message: "Contract fetched successfully!",
                    sourceCode: extractedCode, // ✅ Send extracted Solidity code to frontend
                    risk_score: mlResponse.data.risk_score,
                    interpretation: mlResponse.data.interpretation, 
                });
            } else {
                res.status(500).json({ error: "ML model did not return a valid risk grade" });
            }

        } else {
            res.status(404).json({ error: "No verified contract found at this address" });
        }
    } catch (error) {
        console.error("Error fetching contract:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
