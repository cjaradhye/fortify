import React, { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ContractFetcher = () => {
    const [contractAddress, setContractAddress] = useState("");
    const [solidityCode, setSolidityCode] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchContract = async () => {
        if (!contractAddress) {
            toast.error("Please enter a contract address!");
            return;
        }

        setLoading(true);
        setSolidityCode(null);

        try {
            const response = await fetch("http://localhost:3000/fetch-contract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contractAddress }),
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Contract fetched successfully!");
                setSolidityCode(data.sourceCode);
            } else {
                toast.error(data.error || "Failed to fetch contract");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <h2>Fetch Smart Contract</h2>
            <input
                type="text"
                placeholder="Enter Contract Address"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
            />
            <button onClick={fetchContract} disabled={loading}>
                {loading ? "Fetching..." : "Fetch Contract"}
            </button>

            {solidityCode && (
                <div className="code-container">
                    <h3>Fetched Solidity Code:</h3>
                    <pre>{solidityCode}</pre>
                </div>
            )}
        </div>
    );
};

export default ContractFetcher;
