import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./this.css";
import "./styles/styles.css"; // Assuming you have a CSS file for stylin

const ContractFetcher = () => {
    const [contractAddress, setContractAddress] = useState("");
    const [solidityCode, setSolidityCode] = useState("Loading.. \n");
    const [riskScore, setRiskScore] = useState("Loading..");
    const [interpretation, setInterpretation] = useState("Loading..");
    const [loading, setLoading] = useState(false);
    const lineNumbersRef = useRef(null);

    const updateLineNumbers = () => {
        if (!solidityCode) return null; // ✅ Handle null case
    
        const lines = solidityCode.split("\n").length;
        const lineNumbers = [];
        for (let i = 1; i <= lines; i++) {
            lineNumbers.push(<div key={i}>{i}</div>);
        }
        return lineNumbers;
    };
    

    const fetchContract = async () => {
        if (!contractAddress) {
            toast.error("Please enter a contract address!");
            return;
        }

        setLoading(true);
        setSolidityCode("Loading.. \n");
        setRiskScore(null);
        setInterpretation(null);

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
                setRiskScore(data.risk_score); // From ML model
                setInterpretation(data.interpretation);
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
        <div className="proxy-container">
            {/* <h2>Fetch Smart Contract</h2> */}
            <div className="firstthing">
                <input
                    type="text"
                    placeholder="Enter Contract Address"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                />
                <button onClick={fetchContract} disabled={loading}>
                    {loading ? "Fetching..." : "Fetch Contract"}
                </button>

            </div>
            <div className="secondthing">
                <div className="newoutput-panel">
                    <div className="newheader-editor">
                        <h6>Risk Assessment</h6>
                    </div>
                    <pre>
                    <p><strong>Risk Score:</strong> {riskScore}</p>
                    <p><strong>Interpretation:</strong> {interpretation}</p>
                    </pre>
                </div>


                {/* Solidity Code Display */}
            
                <div className="new-code-container">
                    <div className="newheader-editor">
                        <h6>Fetched Solidity Code:</h6>
                    </div>
                    <div className="newline-numbers" ref={lineNumbersRef}>
                        {updateLineNumbers()}
                    </div>
                    <div className="newcode-editor">
                        <pre>{solidityCode}</pre>
                    </div>
                    
                </div>
            </div>
            
            {/* Risk Analysis Section */}


        </div>
    );
};

export default ContractFetcher;
