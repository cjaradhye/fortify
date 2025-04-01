import { useState, useEffect, useRef } from "react";
import "./styles/styles.css";

const SolidityIDE = () => {
    const [code, setCode] = useState(`pragma solidity ^0.8.0;\n\ncontract MyContract {\n    string public greeting = "Hello, World!";\n}`);
    const [output, setOutput] = useState("Initializing compiler...");
    const [isCompiling, setIsCompiling] = useState(false);
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

    useEffect(() => {
        // Check for WebAssembly support
        if (!window.WebAssembly || !WebAssembly.instantiate) {
            setCompilerState('error');
            setOutput("WebAssembly is not supported in this browser.");
            return;
        }

        // Scroll synchronization
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

        // Create worker safely
        let worker;
        try {
            worker = new Worker(new URL('./solc.worker.js', import.meta.url));
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
                    <h3>Solidity.sol</h3>
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