// solc.worker.js
// Import the Solidity compiler
importScripts('./soljson.js');  // Load from local file

// Wait for the compiler to be fully initialized before reporting ready
let compilerLoaded = false;

function checkCompilerLoaded() {
  if (typeof Module !== 'undefined' && Module.cwrap) {
    compilerLoaded = true;
    self.postMessage({ type: 'READY' });
  } else {
    // If not loaded yet, check again after a short delay
    setTimeout(checkCompilerLoaded, 100);
  }
}

// Start checking if compiler is loaded
checkCompilerLoaded();

self.onmessage = async (e) => {
  if (e.data.type === 'COMPILE') {
    if (!compilerLoaded) {
      self.postMessage({ 
        type: 'ERROR', 
        message: 'Compiler not fully initialized yet. Please wait and try again.' 
      });
      return;
    }
    
    try {
      const input = {
        language: "Solidity",
        sources: {
          "contract.sol": { content: e.data.code }
        },
        settings: {
          outputSelection: { "*": { "*": ["*"] } }
        }
      };
      
      // Make sure Module is defined and cwrap is available
      if (typeof Module === 'undefined' || !Module.cwrap) {
        throw new Error('Solidity compiler not properly loaded');
      }
      
      const compile = Module.cwrap("compile", "string", ["string"]);
      const output = compile(JSON.stringify(input));
      self.postMessage({ type: 'COMPILED', output: JSON.parse(output) });
    } catch (error) {
      self.postMessage({ 
        type: 'ERROR', 
        message: error.message || 'Unknown compilation error' 
      });
    }
  }
};