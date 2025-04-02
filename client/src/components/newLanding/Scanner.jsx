import React, { useEffect, useState } from "react";
import "./styles/scanner.css";

const Scanner = () => {
  const [typedCode, setTypedCode] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const contractCode = `pragma solidity ^0.8.0;

contract Secure {
    address owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    function withdraw() public {
        require(msg.sender == owner, "Not the owner!");
        payable(owner).transfer(address(this).balance);
    }
}`;

  useEffect(() => {
    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < contractCode.length) {
        setTypedCode((prev) => prev + contractCode[index]);
        index++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => setShowOverlay(true), 1000); // Delay before showing overlay
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className="section">
    <h3>DeFi Security, <span className="fancy">Reinvented.</span></h3>
    <div className="scan-container">
      <pre className="code-box">{typedCode}</pre>
      {showOverlay && (
        <div className="scan-overlay">
          <div className="safe-badge">✔ Safe</div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Scanner;
