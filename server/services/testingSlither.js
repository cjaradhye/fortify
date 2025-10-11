// vulnerability-service.js - Improved Slither integration
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class SlitherVulnerabilityService {
    constructor() {
        // Determine the best Slither command based on your test results
        this.preferredCommands = [
            'slither',
            'python -m slither'
        ];
    }

    async analyzeContract(contractContent, filename = 'contract.sol') {
        try {
            // Create temp file
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFile = path.join(tempDir, filename);
            fs.writeFileSync(tempFile, contractContent);

            // Try both command formats
            for (const baseCommand of this.preferredCommands) {
                try {
                    const result = await this.runSlitherAnalysis(baseCommand, tempFile);
                    if (result.success || result.vulnerabilities.length > 0) {
                        return result;
                    }
                } catch (error) {
                    console.log(`Command ${baseCommand} failed, trying next...`);
                    continue;
                }
            }

            throw new Error('All Slither commands failed');

        } catch (error) {
            console.error('Slither analysis error:', error);
            throw error;
        }
    }

    async runSlitherAnalysis(baseCommand, filePath) {
        const commands = [
            `${baseCommand} "${filePath}" --print human-summary`,
            `${baseCommand} "${filePath}"`
        ];

        for (const command of commands) {
            try {
                const result = await this.executeSlitherCommand(command);
                if (result.vulnerabilities.length > 0) {
                    return result;
                }
            } catch (error) {
                // Continue to next command variant
                continue;
            }
        }

        throw new Error(`No successful analysis with ${baseCommand}`);
    }

    async executeSlitherCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { 
                timeout: 30000,
                maxBuffer: 2 * 1024 * 1024 // 2MB buffer
            }, (error, stdout, stderr) => {
                
                // Get the actual output (Slither can output to either stdout or stderr)
                const output = stdout || stderr || '';
                
                // Parse vulnerabilities regardless of exit code
                const vulnerabilities = this.parseSlitherOutput(output);
                
                const result = {
                    success: vulnerabilities.length > 0 || (!error && output.length > 0),
                    vulnerabilities: vulnerabilities,
                    rawOutput: output,
                    command: command,
                    hadError: !!error,
                    errorCode: error ? error.code : null
                };

                // If we found vulnerabilities, consider it successful even if exit code != 0
                if (vulnerabilities.length > 0) {
                    result.success = true;
                    resolve(result);
                    return;
                }

                // If no vulnerabilities but got output, still might be success
                if (output.length > 100) {
                    result.success = true;
                    resolve(result);
                    return;
                }

                // If truly failed with no useful output
                if (error && !output) {
                    reject(error);
                    return;
                }

                resolve(result);
            });
        });
    }

    parseSlitherOutput(output) {
        const vulnerabilities = [];
        
        if (!output) return vulnerabilities;

        const lines = output.split('\n');
        let currentVuln = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for detector findings (INFO:Detectors: pattern)
            if (line.startsWith('INFO:Detectors:')) {
                if (currentVuln) {
                    vulnerabilities.push(currentVuln);
                }
                
                currentVuln = {
                    title: line.replace('INFO:Detectors:', '').trim(),
                    description: '',
                    severity: this.determineSeverity(line),
                    location: this.extractLocation(line),
                    reference: '',
                    details: []
                };
                continue;
            }
            
            // Look for reference URLs
            if (line.startsWith('Reference:') && currentVuln) {
                currentVuln.reference = line.replace('Reference:', '').trim();
                continue;
            }
            
            // Collect additional details
            if (currentVuln && line.length > 0 && 
                !line.startsWith('INFO:') && 
                !line.startsWith('Reference:')) {
                currentVuln.details.push(line);
            }
        }
        
        // Add the last vulnerability
        if (currentVuln) {
            vulnerabilities.push(currentVuln);
        }

        return vulnerabilities;
    }

    determineSeverity(line) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('reentrancy') || 
            lowerLine.includes('arbitrary') ||
            lowerLine.includes('tx.origin')) {
            return 'HIGH';
        }
        
        if (lowerLine.includes('low level call') ||
            lowerLine.includes('immutable')) {
            return 'LOW';
        }
        
        if (lowerLine.includes('version') ||
            lowerLine.includes('solidity')) {
            return 'INFORMATIONAL';
        }
        
        return 'MEDIUM';
    }

    extractLocation(line) {
        const match = line.match(/\(([^)]+\.sol[^)]*)\)/);
        return match ? match[1] : '';
    }

    // Method to format results for API response
    formatResults(analysis) {
        return {
            success: analysis.success,
            vulnerabilityCount: analysis.vulnerabilities.length,
            vulnerabilities: analysis.vulnerabilities.map(vuln => ({
                title: vuln.title,
                severity: vuln.severity,
                location: vuln.location,
                description: vuln.description,
                reference: vuln.reference,
                details: vuln.details.slice(0, 3) // Limit details for API response
            })),
            summary: this.generateSummary(analysis.vulnerabilities),
            command: analysis.command,
            hadAnalysisError: analysis.hadError
        };
    }

    generateSummary(vulnerabilities) {
        const severityCounts = {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
            INFORMATIONAL: 0
        };

        vulnerabilities.forEach(vuln => {
            severityCounts[vuln.severity] = (severityCounts[vuln.severity] || 0) + 1;
        });

        const total = vulnerabilities.length;
        if (total === 0) {
            return "No vulnerabilities detected.";
        }

        const parts = [];
        if (severityCounts.HIGH > 0) parts.push(`${severityCounts.HIGH} high`);
        if (severityCounts.MEDIUM > 0) parts.push(`${severityCounts.MEDIUM} medium`);
        if (severityCounts.LOW > 0) parts.push(`${severityCounts.LOW} low`);
        if (severityCounts.INFORMATIONAL > 0) parts.push(`${severityCounts.INFORMATIONAL} informational`);

        return `Found ${total} issue${total > 1 ? 's' : ''}: ${parts.join(', ')}.`;
    }
}

// Usage example
async function testService() {
    const service = new SlitherVulnerabilityService();
    
    const testContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  SECURE CONTRACT - safer patterns, for learning and local testing.
  Fixes included:
  - Proper owner access control (onlyOwner)
  - Immutable owner where possible
  - ReentrancyGuard implemented
  - Checks-Effects-Interactions + pull-payment withdraw pattern
  - No tx.origin usage
  - No untrusted delegatecall or unprotected selfdestruct
  - No critical reliance on block.timestamp
*/

contract SecureVault {
    address public immutable owner;
    mapping(address => uint256) private _balances;

    // Simple reentrancy guard
    uint8 private _status;
    uint8 private constant _NOT_ENTERED = 1;
    uint8 private constant _ENTERED = 2;

    event Deposit(address indexed sender, uint256 amount);
    event WithdrawRequested(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event OwnerWithdrawal(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier nonReentrant() {
        require(_status == _NOT_ENTERED, "Reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor() {
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    // --- Deposit / Accounting (payable) ---
    receive() external payable {
        require(msg.value > 0, "Zero deposit");
        _balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    // --- Pull pattern for withdrawals (safer) ---
    // User requests withdraw -> amount reserved -> user calls executeWithdraw
    // This separates intent and transfer and reduces attack surface.
    function requestWithdraw(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        // mark amount as reserved by reducing balance immediately (check-effects)
        _balances[msg.sender] -= amount;
        // emit event so frontends/tests can call executeWithdraw
        emit WithdrawRequested(msg.sender, amount);
    }

    // executeWithdraw does the external call; guarded by nonReentrant
    function executeWithdraw(address payable recipient, uint256 amount) external nonReentrant {
        // only allow recipient to be the caller (prevent others from pulling)
        require(recipient == payable(msg.sender), "Recipient must be caller");
        require(amount > 0, "Zero amount");
        // transfer using call pattern but after state already updated (checks-effects-interactions)
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // --- Owner-only functions ---
    // Owner can withdraw contract residual funds (e.g., fees)
    function ownerWithdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Zero amount");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Owner transfer failed");
        emit OwnerWithdrawal(to, amount);
    }

    // Example of a safe time-check (non-security-critical)
    // Avoid using timestamp for authorization or randomness.
    function isOddSecond() external view returns (bool) {
        // This is informational only; never rely on it for security decisions
        return (block.timestamp % 2 == 1);
    }

    // --- Emergency upgrade-safe placeholder ---
    // We do NOT implement delegatecall or selfdestruct here.
    // If you need upgradeability, prefer well-audited proxy patterns (OpenZeppelin) and tests.
}
`;

    try {
        const analysis = await service.analyzeContract(testContract, 'TestContract.sol');
        const formatted = service.formatResults(analysis);
        console.log('Analysis Results:', JSON.stringify(formatted, null, 2));
    } catch (error) {
        console.error('Service test failed:', error);
    }
}

module.exports = SlitherVulnerabilityService;

// Uncomment to test
testService();