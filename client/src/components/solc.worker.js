// solc.worker.js
const SOLC_URL = 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js';

async function loadCompiler() {
  try {
    // Fetch the compiler script
    const response = await fetch(SOLC_URL);
    const scriptText = await response.text();
    
    // Create a blob URL
    const blob = new Blob([scriptText], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Use vite-ignore for the dynamic import
    const module = await import(/* @vite-ignore */ blobUrl);
    return module.default;
  } catch (error) {
    throw new Error(`Failed to load compiler: ${error.message}`);
  }
}

let solcPromise = loadCompiler();

self.onmessage = async function(e) {
  try {
    const solc = await solcPromise;
    
    if (!solc || !solc.cwrap) {
      throw new Error('Solidity compiler failed to initialize');
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

    const compile = solc.cwrap("compile", "string", ["string"]);
    const output = compile(JSON.stringify(input));
    self.postMessage({ output: JSON.parse(output) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};