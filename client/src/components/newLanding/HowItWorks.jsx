import React from "react";
import "./styles/howitworks.css";

const HowItWorks = () => {
  return (
    <section className="section">
      <h2 className="section-title">How Fortify Secures Your Contracts</h2>
      <div className="pathways-container">
        
        {/* Pathway 1: Upload & Deploy */}
        <div className="pathway">
          <h3>Upload & Deploy</h3>
          <div className="glass-box"><strong>Upload Code:</strong> User submits Solidity code.</div>
          <div className="glass-box"><strong>AI Grades Security:</strong> ML checks vulnerabilities.</div>
          <div className="glass-box"><strong>Deploy If Safe:</strong> Contract is deployed securely.</div>
          <div className="glass-box"><strong>Block Deployment If Risky:</strong> Unsafe contracts are blocked.</div>
        </div>

        {/* Pathway 2: Existing Contract Security */}
        <div className="pathway">
            <h3>Verify Existing</h3>
            <div className="glass-box"><strong>Enter Contract Address:</strong> Fetches data from blockchain.</div>
            <div className="glass-box"><strong>Extract & Display Code:</strong> Retrieves and presents contract source code.</div>
            <div className="glass-box"><strong>AI Security Check:</strong> ML scans for vulnerabilities.</div>
            <div className="glass-box"><strong>Deploy Proxy Contract If Unsafe:</strong> Testnet proxy contract deployed.</div>
        </div>


      </div>
    </section>
  );
};

export default HowItWorks;
