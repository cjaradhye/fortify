import { useState, useEffect, useRef } from "react";

const SolidityIDE = () => {
    const [code, setCode] = useState(`pragma solidity ^0.8.0;\n\ncontract MyContract {\n    string public greeting = "Hello, World!";\n}`);
    const [output, setOutput] = useState("");
    const [isCompiling, setIsCompiling] = useState(false);
    const [compilerLoaded, setCompilerLoaded] = useState(false);
    const workerRef = useRef(null);

    useEffect(() => {
        // Create worker
        const worker = new Worker(new URL('./solc.worker.js', import.meta.url), {
            type: 'classic' // Use classic worker type
          });
        workerRef.current = worker;

        worker.onmessage = (e) => {
            if (e.data.type === 'READY') {
                setCompilerLoaded(true);
                setOutput("Compiler ready. You can compile now.");
                return;
            }

            setIsCompiling(false);
            if (e.data.error) {
                setOutput(`Error: ${e.data.error}`);
            } else {
                setOutput(JSON.stringify(e.data.output, null, 2));
            }
        };

        worker.onerror = (error) => {
            setIsCompiling(false);
            setOutput(`Worker error: ${error.message}`);
        };

        return () => {
            worker.terminate();
        };
    }, []);

    const compileSolidity = () => {
        if (!compilerLoaded) {
            setOutput("Compiler still loading...");
            return;
        }
        
        if (isCompiling) {
            setOutput("Already compiling...");
            return;
        }

        setIsCompiling(true);
        setOutput("Compiling...");
        
        workerRef.current.postMessage({
            code: code
        });
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Solidity IDE</h1>
            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={15}
                cols={80}
                style={{ padding: '10px', fontSize: '14px' }}
            />
            <br />
            <button 
                onClick={compileSolidity}
                disabled={isCompiling || !compilerLoaded}
                style={{ 
                    padding: '8px 16px', 
                    margin: '10px 0',
                    backgroundColor: isCompiling ? '#cccccc' : compilerLoaded ? '#4CAF50' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: compilerLoaded ? 'pointer' : 'not-allowed'
                }}
            >
                {!compilerLoaded ? 'Loading Compiler...' : isCompiling ? 'Compiling...' : 'Compile'}
            </button>
            <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '4px',
                overflowX: 'auto',
                minHeight: '100px'
            }}>
                {output}
            </pre>
        </div>
    );
};

export default SolidityIDE;