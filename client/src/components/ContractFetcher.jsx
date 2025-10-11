import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./this.css";
import "./styles/styles.css";

const ContractFetcher = () => {
    const [contractAddress, setContractAddress] = useState("");
    const [solidityCode, setSolidityCode] = useState("Enter contract address and click 'Analyze & Protect'");
    const [riskScore, setRiskScore] = useState("Not analyzed");
    const [interpretation, setInterpretation] = useState("Not analyzed");
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [protectionResult, setProtectionResult] = useState(null);
    const lineNumbersRef = useRef(null);

   const getApiUrl = () => {
    const isDevelopment = import.meta.env.MODE === 'development' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
        // Always use localhost in development
        return 'http://localhost:3000';
    }
    
    // Use production URL in production
    return import.meta.env.VITE_API_URL || 'https://fortify-qwmj.onrender.com';
};


    const updateLineNumbers = () => {
        if (!solidityCode) return null;
    
        const lines = solidityCode.split("\n").length;
        const lineNumbers = [];
        for (let i = 1; i <= lines; i++) {
            lineNumbers.push(<div key={i}>{i}</div>);
        }
        return lineNumbers;
    };

    const checkRiskOnly = async () => {
        if (!contractAddress) {
            toast.error("Please enter a contract address!");
            return;
        }

        setLoading(true);
        setSolidityCode("Fetching contract and analyzing security...");
        setRiskScore("Loading...");
        setInterpretation("Loading...");
        setAnalysisResult(null);
        setProtectionResult(null);

        try {
            const response = await fetch(`${getApiUrl()}/api/risk/check-only`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contractAddress }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success("Risk analysis completed!");
                
                setSolidityCode("Contract source code not displayed in risk-check mode. Use 'Analyze & Protect' for full analysis.");
                setRiskScore(data.securityAnalysis.riskScore.toFixed(3));
                setInterpretation(data.securityAnalysis.interpretation);
                setAnalysisResult(data);

                if (data.securityAnalysis.wouldDeploy) {
                    toast.warning("High risk detected! Consider using 'Analyze & Protect' for automatic protection.");
                } else {
                    toast.info("Contract appears safe - no protection needed.");
                }
            } else {
                toast.error(data.error || "Risk check failed");
                setSolidityCode("Failed to fetch contract");
                setRiskScore("Error");
                setInterpretation("Error");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error - ensure backend is running");
            setSolidityCode("Network error");
            setRiskScore("Error");
            setInterpretation("Error");
        } finally {
            setLoading(false);
        }
    };

    // Full Analysis & Protection Pipeline
    const analyzeAndProtect = async () => {
        if (!contractAddress) {
            toast.error("Please enter a contract address!");
            return;
        }

        setLoading(true);
        setSolidityCode("Starting complete analysis and protection pipeline...");
        setRiskScore("Loading...");
        setInterpretation("Loading...");
        setAnalysisResult(null);
        setProtectionResult(null);

        try {
            // FIXED: Removed undefined API_CONFIG
            const response = await fetch(`${getApiUrl()}/api/risk/analyze-and-deploy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contractAddress }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success("Complete analysis finished!");
                
                // Set basic info
                setRiskScore(data.securityAnalysis.riskScore.toFixed(3));
                setInterpretation(data.securityAnalysis.interpretation);
                setAnalysisResult(data);

                // Display results based on action taken
                if (data.assessment.action === 'PROTECTED') {
                    setProtectionResult(data.assessment);
                    setSolidityCode(`🛡️ HIGH RISK CONTRACT - AUTOMATICALLY PROTECTED!

=== ORIGINAL CONTRACT ===
Address: ${contractAddress}
Risk Score: ${data.securityAnalysis.riskScore}
Status: ${data.securityAnalysis.interpretation}

=== PROTECTION DEPLOYED ===
🚨 SecurityProxy Address: ${data.assessment.proxyAddress}
✅ Your contract is now protected!

⚠️  IMPORTANT: Use the SecurityProxy address instead of the original address
🔗 Explorer: https://sepolia.etherscan.io/address/${data.assessment.proxyAddress}

=== VULNERABILITIES DETECTED ===
${data.vulnerabilities?.length > 0 ? 
    data.vulnerabilities.map((vuln, index) => 
        `${index + 1}. [${vuln.severity?.toUpperCase()}] ${vuln.type}
   ${vuln.description}
   Tool: ${vuln.tool}
`).join('\n') : 'See security analysis for details'}

The SecurityProxy will intercept and validate all transactions to prevent exploits.
                    `);

                    toast.success(`SecurityProxy deployed! Use address: ${data.assessment.proxyAddress.substring(0, 10)}...`);
                } else {
                    setSolidityCode(`✅ CONTRACT IS SAFE - NO PROTECTION NEEDED

=== SECURITY ANALYSIS ===
Address: ${contractAddress}
Risk Score: ${data.securityAnalysis.riskScore} (Low Risk)
Status: ${data.securityAnalysis.interpretation}
Threshold: ${data.securityAnalysis.threshold}

=== ASSESSMENT RESULT ===
Action: ${data.assessment.action}
Message: ${data.assessment.message}

=== VULNERABILITIES ===
${data.vulnerabilities?.length > 0 ? 
    data.vulnerabilities.map((vuln, index) => 
        `${index + 1}. [${vuln.severity?.toUpperCase()}] ${vuln.type}
   ${vuln.description}
`).join('\n') : 'No significant vulnerabilities detected'}

This contract appears to be secure and can be used safely.
                    `);

                    toast.success("Contract is safe - no protection needed!");
                }
            } else {
                toast.error(data.error || "Analysis and protection failed");
                setSolidityCode(`❌ Analysis failed: ${data.error || 'Unknown error'}`);
                setRiskScore("Error");
                setInterpretation("Error");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Network error - ensure backend is running");
            setSolidityCode("Network error occurred");
            setRiskScore("Error");
            setInterpretation("Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="proxy-container">
            <div className="firstthing">
                <input
                    type="text"
                    placeholder="Enter Contract Address (e.g., 0x123...)"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                        onClick={checkRiskOnly} 
                        disabled={loading}
                        style={{
                            backgroundColor: '#FF6500',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '5px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? "Checking..." : "Risk Check Only"}
                    </button>
                    <button 
                        onClick={analyzeAndProtect} 
                        disabled={loading}
                        style={{
                            backgroundColor: '#00CFFF',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '5px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? "Analyzing..." : "Analyze & Protect"}
                    </button>
                </div>
            </div>
            
            <div className="secondthing">
                <div className="newoutput-panel">
                    <div className="newheader-editor">
                        <h6>Security Analysis Results</h6>
                    </div>
                    <pre style={{ padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
                        <p style={{ color: 'black' }}><strong>Risk Score:</strong> {riskScore}</p>
                        <p style={{ color: 'black' }}><strong>Interpretation:</strong> {interpretation}</p>
                        
                        {protectionResult && (
                            <div style={{ marginTop: '15px', padding: '10px', background: '#e8f5e8', borderRadius: '5px' }}>
                                <p style={{ color: 'black' }}><strong>🛡️ PROTECTION STATUS:</strong> {protectionResult.action}</p>
                                <p style={{ color: 'black' }}><strong>📍 SecurityProxy Address:</strong></p>
                                <p style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' ,color:'black' }}>
                                    {protectionResult.proxyAddress}
                                </p>
                                <p style={{ color: 'black' }}><strong>Message:</strong> {protectionResult.message}</p>
                            </div>
                        )}

                        {analysisResult && analysisResult.vulnerabilities && analysisResult.vulnerabilities.length > 0 && (
                            <div style={{ marginTop: '15px' }}>
                                <p style={{ color: 'black' }}><strong>Vulnerabilities Found:</strong> {analysisResult.vulnerabilities.length}</p>
                                <p style={{ color: 'black' }}><strong>Summary:</strong></p>
                                <p style={{ color: 'black' }}>Critical: {analysisResult.securityAnalysis?.summary?.critical || 0}</p>
                                <p style={{ color: 'black' }}>High: {analysisResult.securityAnalysis?.summary?.high || 0}</p>
                                <p style={{ color: 'black' }}>Medium: {analysisResult.securityAnalysis?.summary?.medium || 0}</p>
                            </div>
                        )}
                    </pre>
                </div>

                <div className="new-code-container">
                    <div className="newheader-editor">
                        <h6>Analysis Results & Contract Info</h6>
                    </div>
                    <div className="newline-numbers" ref={lineNumbersRef}>
                        {updateLineNumbers()}
                    </div>
                    <div className="newcode-editor">
                        <pre>{solidityCode}</pre>
                    </div>
                </div>
            </div>
    </div>
    );
};

export default ContractFetcher;