import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import "./styles/styles.css";

const SolidityIDE = () => {
    const [code, setCode] = useState(`pragma solidity ^0.8.0;\n\ncontract MyContract {\n    string public greeting = "Hello, World!";\n}`);
    const [output, setOutput] = useState("Click 'Risk Analyze' to check security or 'Deploy' to analyze and deploy.");
    const [isCompiling, setIsCompiling] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [deploymentAllowed, setDeploymentAllowed] = useState(false);
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

  const getApiUrl = () => {
    // Check if we're in development mode
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
        const lines = code.split('\n').length;
        const lineNumbers = [];
        for (let i = 1; i <= lines; i++) {
            lineNumbers.push(<div key={i}>{i}</div>);
        }
        return lineNumbers;
    };

    const analyzeSolidity = async () => {
        if (!code.trim()) {
            setOutput("Please enter Solidity code to analyze");
            return;
        }
    
        setIsAnalyzing(true);
        setOutput("Analyzing contract for vulnerabilities...");
        setAnalysisResult(null);
        setDeploymentAllowed(false);
    
        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/deploy/check-only`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code }),
            });
    
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `API error: ${response.status}`);
            }
    
            if (data.success) {
                setAnalysisResult(data);
                setDeploymentAllowed(data.deploymentAllowed);
                
                let statusIcon = "";
                if (data.deploymentStatus === 'ALLOWED') {
                    statusIcon = "✅";
                } else if (data.deploymentStatus === 'WARNING') {
                    statusIcon = "⚠️";
                } else {
                    statusIcon = "🚨";
                }
                
                setOutput(`${statusIcon} === SECURITY ANALYSIS RESULTS ===
Risk Score: ${data.riskScore.toFixed(3)}
Interpretation: ${data.interpretation}
Deployment Status: ${data.deploymentStatus}
Message: ${data.message}

=== VULNERABILITIES FOUND ===
${data.vulnerabilities.length > 0 ? 
    data.vulnerabilities.map((vuln, index) => 
        `${index + 1}. [${vuln.severity?.toUpperCase() || 'UNKNOWN'}] ${vuln.type || 'Security Issue'}
   Description: ${vuln.description}
   Tool: ${vuln.tool}
   Recommendation: ${vuln.recommendation}
`).join('\n') : 'No specific vulnerabilities detected'}

=== SUMMARY ===
Critical: ${data.summary?.critical || 0}
High: ${data.summary?.high || 0} 
Medium: ${data.summary?.medium || 0}
Low: ${data.summary?.low || 0}
Informational: ${data.summary?.informational || 0}

Slither Analysis: ${data.slitherUsed ? 'Used' : 'Not available'}

=== RECOMMENDATIONS ===
${data.recommendations ? data.recommendations.join('\n- ') : 'No specific recommendations'}
                `);
                
                if (data.deploymentAllowed) {
                    toast.success("Contract passed security check! Ready for deployment.");
                } else {
                    toast.error("Security issues detected. Deployment blocked.");
                }
            } else {
                setOutput(`Analysis error: ${data.error}`);
                toast.error("Analysis failed");
            }
        } catch (error) {
            const errorMsg = error.message.includes('Failed to fetch') 
                ? 'Failed to connect to backend. Please check your connection and try again.'
                : `Analysis error: ${error.message}`;
            
            setOutput(errorMsg);
            toast.error("Analysis failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Full Deployment Pipeline
    const deployContract = async () => {
        if (!code.trim()) {
            setOutput("Please enter Solidity code to deploy");
            return;
        }

        setIsDeploying(true);
        setOutput("Starting deployment pipeline...\n1. Security Analysis...");

        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/deploy/analyze-and-deploy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    code: code,
                    contractName: 'MyContract',
                    constructorArgs: []
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle deployment blocked due to security issues
                if (response.status === 403) {
                    setOutput(`🚨 DEPLOYMENT BLOCKED - SECURITY RISKS DETECTED

Risk Score: ${data.riskScore}
Interpretation: ${data.interpretation}

=== BLOCKING REASONS ===
${data.blockReasons ? data.blockReasons.join('\n- ') : 'Security threshold exceeded'}

=== VULNERABILITIES ===
${data.vulnerabilities?.length > 0 ? 
    data.vulnerabilities.map((vuln, index) => 
        `${index + 1}. [${vuln.severity?.toUpperCase()}] ${vuln.type}
   ${vuln.description}
`).join('\n') : 'See security analysis above'}

❌ Contract deployment was automatically blocked for security reasons.
🔧 Please fix the security issues and try again.
                    `);
                    
                    toast.error("Deployment blocked due to security risks!");
                    return;
                }
                
                throw new Error(data.error || `Deployment failed: ${response.status}`);
            }

            if (data.success) {
                setOutput(`🎉 CONTRACT SUCCESSFULLY DEPLOYED!

=== SECURITY CHECK PASSED ===
Risk Score: ${data.security.riskScore.toFixed(3)}
Interpretation: ${data.security.interpretation}
Vulnerabilities Found: ${data.security.vulnerabilitiesCount}
${data.security.warnings?.length > 0 ? `\n⚠️ Warnings: ${data.security.warnings.join(', ')}` : ''}

=== COMPILATION SUCCESS ===
Contract Name: ${data.compilation.contractName}
${data.compilation.warningsCount > 0 ? `Compilation Warnings: ${data.compilation.warningsCount}` : 'No compilation warnings'}

=== DEPLOYMENT SUCCESS ===
✅ Contract Address: ${data.deployment.contractAddress}
🔗 Transaction Hash: ${data.deployment.transactionHash}
⛽ Gas Used: ${data.deployment.gasUsed}
💰 Deployment Cost: ~${data.deployment.deploymentCost} ETH
🌐 Explorer: ${data.deployment.explorerUrl}

Your contract is now live on ${data.deployment.networkName || 'Sepolia'} testnet!
                `);
                
                toast.success(`Contract deployed successfully! Address: ${data.deployment.contractAddress.substring(0, 10)}...`);
            } else {
                setOutput(`Deployment error: ${data.error}`);
                toast.error("Deployment failed");
            }
        } catch (error) {
            const errorMsg = error.message.includes('Failed to fetch') 
                ? 'Failed to connect to backend. Please check your connection and try again.'
                : `Deployment error: ${error.message}`;
            
            setOutput(errorMsg);
            toast.error("Deployment failed");
        } finally {
            setIsDeploying(false);
        }
    };

    useEffect(() => {
        const textarea = textareaRef.current;
        const lineNumbers = lineNumbersRef.current;

        const handleScroll = () => {
            if (lineNumbers) {
                lineNumbers.scrollTop = textarea.scrollTop;
            }
        };

        if (textarea) {
            textarea.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (textarea) textarea.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="solidity-thingy" style={{ padding: '20px', fontFamily: 'monospace' }}>
            <div className="code-container">
                <div className="header-editor">
                    <h6>Solidity.sol</h6>
                    <div className="my-button">
                        <button 
                            onClick={analyzeSolidity}
                            disabled={isAnalyzing || isDeploying}
                            className="analyze-button"
                            style={{
                                backgroundColor: '#ff6b6b',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginRight: '10px'
                            }}
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Risk Analyze'}
                        </button>
                        <button 
                            onClick={deployContract}
                            disabled={isAnalyzing || isDeploying}
                            className={`deploy-button ${deploymentAllowed ? 'ready' : ''}`}
                            style={{
                                backgroundColor: deploymentAllowed ? '#00CFFF' : '#666',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: deploymentAllowed ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {isDeploying ? 'Deploying...' : 'Analyze & Deploy'}
                        </button>
                    </div>
                </div>
                <div className="line-numbers" ref={lineNumbersRef}>
                    {updateLineNumbers()}
                </div>
                <div className="code-editor">
                    <textarea
                        ref={textareaRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                </div>
            </div>
            <br />

            <div className="output-panel">
                <pre>
                    {output}
                </pre>
            </div>
        </div>
    );
};

export default SolidityIDE;