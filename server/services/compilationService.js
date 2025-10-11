const solc = require('solc');

class CompilationService {
    constructor() {
        this.defaultVersion = '0.8.19';
    }

    // Basic syntax validation
    validateSyntax(solidityCode) {
        try {
            if (!solidityCode.includes('contract ') && !solidityCode.includes('interface ') && !solidityCode.includes('library ')) {
                return {
                    valid: false,
                    error: 'No contract declaration found'
                };
            }

            if (!solidityCode.includes('pragma solidity')) {
                return {
                    valid: false,
                    error: 'Missing pragma solidity declaration'
                };
            }

            // Check balanced braces
            const openBraces = (solidityCode.match(/\{/g) || []).length;
            const closeBraces = (solidityCode.match(/\}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                return {
                    valid: false,
                    error: 'Unbalanced braces'
                };
            }

            return { valid: true };

        } catch (error) {
            return {
                valid: false,
                error: `Syntax validation error: ${error.message}`
            };
        }
    }

    // Main compilation function
    async compileContract(solidityCode, contractFileName = 'Contract.sol') {
        try {
            console.log('🔧 Compiling contract...');
            
            // Validate syntax first
            const syntaxCheck = this.validateSyntax(solidityCode);
            if (!syntaxCheck.valid) {
                return {
                    success: false,
                    error: syntaxCheck.error
                };
            }

            // Solc input structure
            const input = {
                language: 'Solidity',
                sources: {
                    [contractFileName]: {
                        content: solidityCode
                    }
                },
                settings: {
                    outputSelection: {
                        '*': {
                            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
                        }
                    },
                    optimizer: {
                        enabled: true,
                        runs: 200
                    }
                }
            };

            const output = JSON.parse(solc.compile(JSON.stringify(input)));

            // Check for compilation errors
            if (output.errors) {
                const errors = output.errors.filter(error => error.severity === 'error');
                const warnings = output.errors.filter(error => error.severity === 'warning');

                if (errors.length > 0) {
                    return {
                        success: false,
                        error: 'Compilation failed',
                        errors: errors.map(e => e.message),
                        warnings: warnings.map(w => w.message)
                    };
                }
            }

            // Extract compiled contract
            const contracts = output.contracts[contractFileName];
            
            if (!contracts || Object.keys(contracts).length === 0) {
                return {
                    success: false,
                    error: 'No contracts found in source code'
                };
            }

            const contractName = Object.keys(contracts)[0];
            const contractData = contracts[contractName];

            if (!contractData.abi || !contractData.evm || !contractData.evm.bytecode) {
                return {
                    success: false,
                    error: 'Incomplete compilation output'
                };
            }

            const warnings = output.errors?.filter(error => error.severity === 'warning') || [];

            console.log(`✅ Compilation successful: ${contractName}`);

            return {
                success: true,
                contractName,
                abi: contractData.abi,
                bytecode: contractData.evm.bytecode.object,
                warnings: warnings.map(w => w.message)
            };

        } catch (error) {
            console.error('Compilation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Estimate deployment gas (simple calculation)
    estimateDeploymentGas(bytecode) {
        if (!bytecode) return null;
        const cleanBytecode = bytecode.replace(/^0x/, '');
        return 21000 + Math.ceil(cleanBytecode.length / 2) * 68;
    }
}

module.exports = new CompilationService();