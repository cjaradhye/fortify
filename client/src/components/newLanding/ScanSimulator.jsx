import React, { useState, useEffect } from "react";
import "./styles/scansimulator.css";

const ScanSimulator = () => {
  const [scanText, setScanText] = useState("Grade");
  const [riskPercentage, setRiskPercentage] = useState(null);
  const [deployDisabled, setDeployDisabled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanText("Scanning...");
      setDeployDisabled(false);

      setTimeout(() => {
        const risk = Math.floor(Math.random() * (95 - 50 + 1)) + 50; // Random risk between 50% and 95%
        setRiskPercentage(risk);
        setScanText(`Risk: ${risk}%`);

        if (risk > 70) {
          setDeployDisabled(true);
        }
      }, 2000);
    }, 5000); // Restart animation every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
<div className="scan-box container">
      <pre className="code-box">
        {`pragma solidity ^0.8.0;

contract Secure {
    address owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function withdraw() public {
        require(msg.sender == owner, "Not the owner!");
        payable(owner).transfer(address(this).balance);
    }
}`}
      </pre>
      <div className="button-container">
        <button className="grade-button" disabled={scanText === "Scanning..."}>
          {scanText}
        </button>
        <button className={`deploy-button ${deployDisabled ? "disabled" : ""}`} disabled={deployDisabled}>
          {deployDisabled ? "Cannot Deploy" : "Deploy"}
        </button>
      </div>
    </div>
  );
};

export default ScanSimulator;
