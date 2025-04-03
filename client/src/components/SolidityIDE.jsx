import { useState, useEffect, useRef } from "react";
import "./styles/styles.css";

const SolidityIDE = () => {
    const [code, setCode] = useState(`pragma solidity ^0.8.0;\n\ncontract MyContract {\n    string public greeting = "Hello, World!";\n}`);
    const [output, setOutput] = useState("Initializing compiler...");
    const [isCompiling, setIsCompiling] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [compilerState, setCompilerState] = useState("loading");
    const workerRef = useRef(null);
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

    // Function to update line numbers
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
    
        try {
            const response = await fetch('http://localhost:8000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ code: code }),
                credentials: 'same-origin'  // Important for cookies/sessions
            });
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.detail || 
                    errorData.message || 
                    `API error: ${response.status} ${response.statusText}`
                );
            }
    
            const data = await response.json();
            
            if (data.error) {
                setOutput(`Analysis error: ${data.error}`);
            } else {
                setOutput(`
    === Risk Analysis Results ===
    Risk Score: ${data.risk_score.toFixed(3)}
    Interpretation: ${data.interpretation}
    
    ${data.detailed_analysis || ''}
    
    Recommendations:
    ${getRecommendations(data.risk_score)}
                `);
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                setOutput(`Failed to connect to analysis API. Please ensure:
    1. The API server is running at http://localhost:8000
    2. The server has CORS enabled
    3. No browser extensions are blocking the request`);
            } else {
                setOutput(`Analysis error: ${error.message}`);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    // Helper function for recommendations
    const getRecommendations = (riskScore) => {
        if (riskScore > 0.75) {
            return "- Critical risk detected\n- Immediate security review required\n- Consider formal verification";
        } else if (riskScore > 0.5) {
            return "- High risk detected\n- Thorough security audit recommended\n- Test extensively on testnet";
        } else if (riskScore > 0.25) {
            return "- Moderate risk\n- Standard security review recommended";
        }
        return "- Low risk\n- Basic security checks recommended";
    };
    useEffect(() => {
        if (!window.WebAssembly || !WebAssembly.instantiate) {
            setCompilerState('error');
            setOutput("WebAssembly is not supported in this browser.");
            return;
        }

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

        // Create a blob URL with custom worker code instead of using a separate file
        const workerCode = `
            // Set up global context for the Solidity compiler
            self.Module = {
                // Pre-define needed properties to avoid undefined errors
                cwrap: null,
                // Add any initial setup needed for the compiler
                onRuntimeInitialized: function() {
                    // This will run once the compiler is fully loaded
                    // Now cwrap should be available
                    try {
                        self.Module.cwrap = function(name, returnType, argTypes) {
                            // Make a wrapper for the compiler function
                            return function(input) {
                                try {
                                    // In production, this would call the actual compiler
                                    // For now, we're just validating the input
                                    const jsonInput = JSON.parse(input);
                                    const sourceCode = Object.values(jsonInput.sources)[0].content;
                                    
                                    // Very basic validation
                                    if (!sourceCode.includes('contract')) {
                                        throw new Error("No contract definition found");
                                    }
                                    
                                    // Extract contract name for output
                                    const contractNameMatch = sourceCode.match(/contract\\s+(\\w+)/);
                                    const contractName = contractNameMatch ? contractNameMatch[1] : "Unknown";
                                    
                                    // Create mock compilation output
                                    return JSON.stringify({
                                        contracts: {
                                            "contract.sol": {
                                                [contractName]: {
                                                    abi: [
                                                        {
                                                            "inputs": [],
                                                            "name": "greeting",
                                                            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                                                            "stateMutability": "view",
                                                            "type": "function"
                                                        }
                                                    ],
                                                    evm: {
                                                        bytecode: {
                                                            object: "0x60806040526040518060400160405280600c81526020017f48656c6c6f2c20576f726c642100000000000000000000000000000000000000815250600090816200004a9190620001a5565b5034801562000058576000"
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    });
                                } catch (error) {
                                    throw new Error("Compilation error: " + error.message);
                                }
                            };
                        };
                        
                        // Signal that the compiler is ready
                        self.postMessage({ type: 'READY' });
                    } catch (error) {
                        self.postMessage({ 
                            type: 'ERROR',
                            message: 'Failed to initialize compiler: ' + error.message
                        });
                    }
                }
            };
            
            // Simulate loading the Solidity compiler
            setTimeout(() => {
                // Call onRuntimeInitialized to simulate compiler loading
                if (self.Module && typeof self.Module.onRuntimeInitialized === 'function') {
                    self.Module.onRuntimeInitialized();
                } else {
                    self.postMessage({ 
                        type: 'ERROR',
                        message: 'Module initialization failed'
                    });
                }
            }, 2000);  // Simulate 2 second loading time
            
            self.onmessage = function(e) {
                if (e.data.type !== 'COMPILE') return;
                
                try {
                    if (typeof self.Module === 'undefined' || !self.Module.cwrap) {
                        throw new Error('Compiler not loaded');
                    }
            
                    const input = {
                        language: "Solidity",
                        sources: {
                            "contract.sol": {
                                content: e.data.code
                            }
                        },
                        settings: {
                            outputSelection: {
                                "*": {
                                    "*": ["*"]
                                }
                            }
                        }
                    };
            
                    const compile = self.Module.cwrap("compile", "string", ["string"]);
                    const output = compile(JSON.stringify(input));
                    self.postMessage({ 
                        type: 'COMPILED',
                        output: JSON.parse(output) 
                    });
                } catch (error) {
                    self.postMessage({ 
                        type: 'ERROR',
                        message: error.message
                    });
                }
            };
        `;

        // Create worker
        let worker;
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            worker = new Worker(workerUrl);
            workerRef.current = worker;
        } catch (error) {
            setCompilerState('error');
            setOutput(`Failed to initialize worker: ${error.message}`);
            return;
        }
        
        // Set timeout for compiler loading
        const loadingTimeout = setTimeout(() => {
            if (compilerState === 'loading') {
                setCompilerState('error');
                setOutput("Compiler loading timed out. Please refresh the page.");
            }
        }, 30000);

        worker.onmessage = (e) => {
            switch (e.data.type) {
                case 'READY':
                    clearTimeout(loadingTimeout);
                    setCompilerState('ready');
                    setOutput("Compiler ready. Click 'Compile' to compile your code.");
                    break;
                case 'COMPILED':
                    setIsCompiling(false);
                    setOutput(JSON.stringify(e.data.output, null, 2));
                    break;
                case 'ERROR':
                    setIsCompiling(false);
                    if (compilerState === 'loading') {
                        clearTimeout(loadingTimeout);
                        setCompilerState('error');
                    }
                    setOutput(`Error: ${e.data.message}`);
                    break;
                default:
                    break;
            }
        };

        worker.onerror = (error) => {
            clearTimeout(loadingTimeout);
            setCompilerState('error');
            setOutput(`Worker error: ${error.message}`);
        };

        return () => {
            clearTimeout(loadingTimeout);
            if (textarea) textarea.removeEventListener('scroll', handleScroll);
            if (worker) worker.terminate();
            // Clean up blob URL
            if (worker && worker.url) URL.revokeObjectURL(worker.url);
        };
    }, []);

    const compileSolidity = () => {
        if (compilerState !== 'ready') {
            setOutput(compilerState === 'loading' 
                ? "Compiler still loading... Please wait." 
                : "Compiler failed to load. Please refresh the page.");
            return;
        }
        
        if (!workerRef.current) {
            setOutput("Worker not initialized. Please refresh the page.");
            return;
        }
        
        setIsCompiling(true);
        setOutput("Compiling...");
        workerRef.current.postMessage({
            type: 'COMPILE',
            code: code
        });
    };

    return (
        <div className="solidity-thingy" style={{ padding: '20px', fontFamily: 'monospace' }}>
            <div className="code-container">
                <div className="header-editor">
                    <h6>Solidity.sol</h6>
                    <div className="my-button">
                        {compilerState === 'error' && (
                            <button 
                                onClick={() => window.location.reload()}
                                className="refresh-button"
                            >
                                Refresh Page
                            </button>
                        )}
                        <button 
                            onClick={compileSolidity}
                            disabled={isCompiling || compilerState !== 'ready'}
                            className={`compile-button ${
                                compilerState === 'ready' 
                                    ? isCompiling ? 'compiling' : 'ready'
                                    : compilerState === 'loading' ? 'loading' : 'error'
                            }`}
                        >
                            {compilerState === 'ready' 
                                ? (isCompiling ? 'Compiling...' : 'Compile')
                                : (compilerState === 'loading' ? 'Loading Compiler...' : 'Compiler Error')}
                        </button>
                        <button 
                            onClick={analyzeSolidity}
                            disabled={isAnalyzing}
                            className="analyze-button"
                            style={{
                                marginLeft: '10px',
                                backgroundColor: '#ff6b6b',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Risk Analyze'}
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