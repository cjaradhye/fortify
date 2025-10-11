const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
class SecurityAnalysisService {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../../');
        this.tempDir = path.resolve(__dirname, '../temp');
        this.slitherWasUsed = false;
        this.ensureTempDir();
        
        console.log(`📁 Current file: ${__dirname}`);
        console.log(`📁 Project root: ${this.projectRoot}`);
        console.log(`📁 Analysis temp directory: ${this.tempDir}`);
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async saveToTempFile(solidityCode, filename = 'Contract.sol') {
        const filePath = path.join(this.tempDir, filename);
        fs.writeFileSync(filePath, solidityCode, 'utf-8');
        return filePath;
    }

    removeCommentsAndStrings(code) {
        code = code.replace(/\/\/.*$/gm, '');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');
        code = code.replace(/"[^"]*"/g, '""');
        code = code.replace(/'[^']*'/g, "''");
        return code;
    }

    // ENHANCED security patterns check - much more aggressive detection
    performBasicSecurityCheck(code) {
        const vulnerabilities = [];
        const cleanCode = this.removeCommentsAndStrings(code);
        
        // Critical vulnerability patterns - these should ALWAYS be flagged as high/critical
        const criticalPatterns = {
            'tx.origin': {
                severity: 'Critical',
                description: 'Use of tx.origin for authorization - extremely dangerous',
                recommendation: 'Never use tx.origin for authorization. Use msg.sender instead.'
            },
            'selfdestruct': {
                severity: 'Critical', 
                description: 'Selfdestruct function detected - can permanently destroy contract',
                recommendation: 'Remove selfdestruct or add strict access controls with multi-sig'
            },
            'delegatecall': {
                severity: 'Critical',
                description: 'Delegatecall to potentially untrusted address - code injection risk',
                recommendation: 'Avoid delegatecall or strictly whitelist target addresses'
            },
            '.call{value:': {
                severity: 'High',
                description: 'Raw call with value transfer detected - potential reentrancy',
                recommendation: 'Use ReentrancyGuard and checks-effects-interactions pattern'
            },
            'suicide(': {
                severity: 'Critical',
                description: 'Deprecated suicide function - use selfdestruct instead',
                recommendation: 'Replace suicide with selfdestruct and add access controls'
            }
        };

        // Check critical patterns first
        Object.entries(criticalPatterns).forEach(([pattern, info]) => {
            if (cleanCode.includes(pattern)) {
                vulnerabilities.push({
                    tool: 'Enhanced Pattern Check',
                    type: pattern,
                    severity: info.severity,
                    description: info.description,
                    recommendation: info.recommendation
                });
            }
        });

        // Advanced vulnerability checks
        vulnerabilities.push(...this.checkReentrancyVulnerability(cleanCode));
        vulnerabilities.push(...this.checkUnprotectedCriticalFunctions(cleanCode));
        vulnerabilities.push(...this.checkAccessControlVulnerabilities(cleanCode));
        vulnerabilities.push(...this.checkIntegerOverflowRisks(cleanCode));
        vulnerabilities.push(...this.checkDangerousConstructorPatterns(cleanCode));

        return vulnerabilities;
    }

    // Much more aggressive reentrancy detection
    checkReentrancyVulnerability(code) {
        const vulnerabilities = [];
        
        // Look for the classic reentrancy pattern: external call before state update
        const reentrancyPatterns = [
            // Pattern 1: call{value:} followed by state changes
            /\.call\{value:\s*\w+\}[^;]*;[\s\S]*?(\w+\[.*?\]\s*[-+]?=|\w+\s*[-+]?=)/g,
            // Pattern 2: transfer/send followed by state changes  
            /\.(transfer|send)\([^)]+\);[\s\S]*?(\w+\[.*?\]\s*[-+]?=|\w+\s*[-+]?=)/g
        ];

        reentrancyPatterns.forEach((pattern, index) => {
            const matches = code.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    // Check if this is in a function that doesn't have reentrancy protection
                    if (!code.includes('ReentrancyGuard') && 
                        !code.includes('nonReentrant') &&
                        !match.includes('_nonReentrantBefore')) {
                        
                        vulnerabilities.push({
                            tool: 'Reentrancy Pattern Detection',
                            type: 'reentrancy-vulnerability',
                            severity: 'Critical',
                            description: 'Classic reentrancy vulnerability: external call before state update',
                            recommendation: 'Update state before external calls or use ReentrancyGuard modifier'
                        });
                    }
                });
            }
        });

        // Check for withdrawal functions specifically
        if (code.includes('function withdraw') || code.includes('function claim')) {
            const withdrawFunctions = code.match(/function\s+(withdraw|claim)[^{]*\{[^}]*\}/gs) || [];
            
            withdrawFunctions.forEach(func => {
                if (func.includes('.call{value:') || func.includes('.transfer(') || func.includes('.send(')) {
                    // Check if state is updated after the call
                    const callIndex = func.search(/\.call\{value:|\.transfer\(|\.send\(/);
                    const afterCall = func.substring(callIndex);
                    
                    if (/balances\[.*?\]\s*-=|\w+\s*-=/.test(afterCall)) {
                        vulnerabilities.push({
                            tool: 'Withdrawal Function Analysis',
                            type: 'withdrawal-reentrancy',
                            severity: 'Critical',
                            description: 'Withdrawal function vulnerable to reentrancy attack',
                            recommendation: 'Update balances before sending funds (checks-effects-interactions)'
                        });
                    }
                }
            });
        }

        return vulnerabilities;
    }

    // More comprehensive unprotected function detection
    checkUnprotectedCriticalFunctions(code) {
        const vulnerabilities = [];
        
        // Functions that should ALWAYS have access control
        const criticalFunctions = [
            'setAdmin', 'setOwner', 'transferOwnership', 'changeOwner',
            'kill', 'destroy', 'selfdestruct', 'pause', 'unpause',
            'emergencyStop', 'emergencyWithdraw', 'setPrice', 'setRate',
            'mint', 'burn', 'addMinter', 'removeMinter'
        ];

        criticalFunctions.forEach(funcName => {
            const regex = new RegExp(`function\\s+${funcName}\\s*\\([^)]*\\)\\s*[^{]*\\{[^}]*\\}`, 'gi');
            const matches = code.match(regex);
            
            if (matches) {
                matches.forEach(func => {
                    // Check if function has any access control
                    const hasAccessControl = 
                        func.includes('onlyOwner') ||
                        func.includes('onlyAdmin') ||
                        func.includes('onlyRole') ||
                        func.includes('require(msg.sender == owner') ||
                        func.includes('require(owner == msg.sender') ||
                        func.includes('require(msg.sender == admin') ||
                        func.includes('_checkOwner()') ||
                        func.includes('modifier') && func.includes('only');

                    if (!hasAccessControl) {
                        vulnerabilities.push({
                            tool: 'Critical Function Access Control',
                            type: 'unprotected-critical-function',
                            severity: 'Critical',
                            description: `Unprotected critical function: ${funcName} - anyone can call it`,
                            recommendation: `Add access control modifier (onlyOwner/onlyAdmin) to ${funcName}`
                        });
                    }
                });
            }
        });

        return vulnerabilities;
    }

    // Enhanced access control vulnerability detection
    checkAccessControlVulnerabilities(code) {
        const vulnerabilities = [];

        // Check for tx.origin usage in access control
        if (code.includes('tx.origin')) {
            const txOriginMatches = code.match(/tx\.origin\s*==|==\s*tx\.origin/g);
            if (txOriginMatches) {
                vulnerabilities.push({
                    tool: 'Access Control Analysis',
                    type: 'tx-origin-authorization',
                    severity: 'Critical',
                    description: 'tx.origin used for authorization - vulnerable to phishing attacks',
                    recommendation: 'Use msg.sender instead of tx.origin for all authorization checks'
                });
            }
        }

        // Check for missing zero address checks in critical functions
        const addressSetterFunctions = code.match(/function\s+set\w*\s*\([^)]*address[^)]*\)[^{]*\{[^}]*\}/gi) || [];
        addressSetterFunctions.forEach(func => {
            if (!func.includes('address(0)') && !func.includes('_addr != address(0)')) {
                vulnerabilities.push({
                    tool: 'Access Control Analysis', 
                    type: 'missing-zero-address-check',
                    severity: 'Medium',
                    description: 'Address setter function missing zero address validation',
                    recommendation: 'Add require(newAddress != address(0)) check'
                });
            }
        });

        return vulnerabilities;
    }

    // Check for integer overflow risks
    checkIntegerOverflowRisks(code) {
        const vulnerabilities = [];
        
        // Check Solidity version
        const versionMatch = code.match(/pragma\s+solidity\s+([^;]+);/);
        let version = null;
        if (versionMatch) {
            version = versionMatch[1];
        }

        // For pre-0.8.0 versions, arithmetic is dangerous
        if (version && !version.includes('0.8') && !code.includes('SafeMath')) {
            if (code.includes('+') || code.includes('-') || code.includes('*')) {
                vulnerabilities.push({
                    tool: 'Integer Overflow Analysis',
                    type: 'integer-overflow-risk',
                    severity: 'High',
                    description: 'Arithmetic operations in pre-0.8.0 Solidity without SafeMath',
                    recommendation: 'Use SafeMath library or upgrade to Solidity 0.8.0+'
                });
            }
        }

        // Check for uint8/uint16 arithmetic which can overflow easily
        if (code.includes('uint8') || code.includes('uint16')) {
            const smallIntArithmetic = code.match(/uint(8|16)\s+\w+.*[+\-*]/g);
            if (smallIntArithmetic) {
                vulnerabilities.push({
                    tool: 'Integer Overflow Analysis',
                    type: 'small-int-overflow',
                    severity: 'Medium', 
                    description: 'Small integer types (uint8/uint16) arithmetic - high overflow risk',
                    recommendation: 'Use uint256 or add overflow checks for small integer arithmetic'
                });
            }
        }

        return vulnerabilities;
    }

    // Check for dangerous constructor patterns
    checkDangerousConstructorPatterns(code) {
        const vulnerabilities = [];

        // Check for public constructors (old syntax)
        if (code.includes('constructor') && code.includes('public')) {
            vulnerabilities.push({
                tool: 'Constructor Analysis',
                type: 'public-constructor',
                severity: 'Low',
                description: 'Constructor marked as public (unnecessary in modern Solidity)',
                recommendation: 'Remove public visibility from constructor'
            });
        }

        return vulnerabilities;
    }

    // IMPROVED Slither execution with better error handling
    async runSlitherAnalysis(contractPath) {
        try {
            console.log('🔍 Running Slither analysis...');

            // Check if Slither is available
            try {
                await execAsync('slither --version', { timeout: 5000 });
            } catch (err) {
                console.log('❌ Slither not found');
                return { success: false, error: 'Slither not installed' };
            }

            const resultJsonPath = path.join(path.dirname(contractPath), `slither_result_${Date.now()}.json`);

            // Use more comprehensive Slither detectors
            const slitherCommand = `slither "${contractPath}" --json "${resultJsonPath}" --exclude-informational --exclude-optimization --exclude naming-convention`;

            console.log('Running Slither command:', slitherCommand);
            
            try {
                await execAsync(slitherCommand, { 
                    timeout: 45000,
                    maxBuffer: 1024 * 1024 * 2
                });
            } catch (execError) {
                // Slither often returns non-zero exit codes even on success
                console.log('Slither completed with exit code:', execError.code);
            }

            if (!fs.existsSync(resultJsonPath)) {
                return { success: false, error: 'Slither did not produce output file' };
            }

            let slitherOutput;
            try {
                const fileContent = fs.readFileSync(resultJsonPath, 'utf-8');
                slitherOutput = JSON.parse(fileContent);
            } catch (parseError) {
                console.log('❌ Failed to parse Slither JSON:', parseError.message);
                return { success: false, error: 'Invalid Slither output' };
            }

            // Clean up
            try { 
                fs.unlinkSync(resultJsonPath); 
            } catch(e) {}

            console.log('✅ Slither analysis completed');
            console.log(`Found ${slitherOutput.results?.detectors?.length || 0} detectors`);
            
            return { success: true, results: slitherOutput };

        } catch (error) {
            console.log('⚠️ Slither analysis failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // IMPROVED Slither results processing
    processSlitherResults(slitherOutput) {
        if (!slitherOutput.success || !slitherOutput.results) {
            return [];
        }

        const vulnerabilities = [];
        const results = slitherOutput.results;
        
        if (results.detectors && Array.isArray(results.detectors)) {
            results.detectors.forEach(detector => {
                // Map Slither impact more aggressively
                let severity = 'High'; // Default to High instead of Medium
                
                if (detector.impact) {
                    switch (detector.impact.toLowerCase()) {
                        case 'high':
                            severity = 'Critical'; // Escalate High to Critical
                            break;
                        case 'medium':
                            severity = 'High'; // Escalate Medium to High  
                            break;
                        case 'low':
                            severity = 'Medium'; // Keep Low as Medium
                            break;
                        case 'informational':
                            severity = 'Low';
                            break;
                        default:
                            severity = 'High';
                    }
                }

                // Special handling for critical vulnerability types
                const checkType = detector.check || '';
                if (checkType.includes('reentrancy') || 
                    checkType.includes('delegatecall') ||
                    checkType.includes('selfdestruct') ||
                    checkType.includes('tx-origin')) {
                    severity = 'Critical';
                }

                vulnerabilities.push({
                    tool: 'Slither',
                    type: detector.check || 'unknown-vulnerability',
                    severity: severity,
                    description: detector.description || detector.markdown || 'Slither detected security issue',
                    recommendation: this.getRecommendation(detector.check),
                    confidence: detector.confidence || 'high'
                });
            });
        }

        console.log(`Processed ${vulnerabilities.length} Slither vulnerabilities`);
        return vulnerabilities;
    }

    getRecommendation(checkType) {
        const recommendations = {
            'reentrancy-eth': 'CRITICAL: Implement ReentrancyGuard and use checks-effects-interactions pattern',
            'reentrancy-no-eth': 'Use ReentrancyGuard to prevent state manipulation attacks',
            'arbitrary-send-eth': 'CRITICAL: Validate all recipients and use pull payment pattern',
            'controlled-delegatecall': 'CRITICAL: Never delegatecall to user-controlled addresses',
            'unprotected-selfdestruct': 'CRITICAL: Remove selfdestruct or add multi-sig protection',
            'tx-origin': 'CRITICAL: Replace tx.origin with msg.sender immediately',
            'suicidal': 'CRITICAL: Remove suicide/selfdestruct functions',
            'unprotected-upgrade': 'CRITICAL: Add access controls to upgrade functions',
            'missing-zero-check': 'Add require(address != address(0)) validation',
            'solc-version': 'Update to Solidity 0.8.19+ to avoid compiler bugs',
            'unused-return': 'Check return values of external calls',
            'low-level-calls': 'Avoid low-level calls when possible',
            'timestamp-dependence': 'Do not use block.timestamp for critical logic',
            'weak-randomness': 'Use Chainlink VRF for secure randomness',
            'integer-overflow': 'Use Solidity 0.8+ or SafeMath for arithmetic'
        };
        return recommendations[checkType] || 'Review code and implement security best practices';
    }

    // TUNED risk scoring to target 85-90% for highly vulnerable contracts
    calculateRiskScore(vulnerabilities) {
        if (vulnerabilities.length === 0) {
            return 12; // Base score for uncertainty
        }

        let score = 0;
        const weights = { 
            'Critical': 35,  // Reduced slightly from 45
            'High': 25,      // Reduced from 30  
            'Medium': 12,    // Reduced from 15
            'Low': 4         // Reduced from 5
        };

        vulnerabilities.forEach(vuln => {
            const baseWeight = weights[vuln.severity] || 8;
            
            // Moderate penalties for specific critical vulnerabilities
            let multiplier = 1;
            if (vuln.type.includes('reentrancy')) multiplier = 1.3;
            if (vuln.type.includes('delegatecall')) multiplier = 1.25;  
            if (vuln.type.includes('selfdestruct')) multiplier = 1.25;
            if (vuln.type.includes('tx-origin')) multiplier = 1.2;
            if (vuln.type.includes('unprotected')) multiplier = 1.15;
            
            score += Math.floor(baseWeight * multiplier);
        });

        // Moderate additional penalties
        const criticalCount = vulnerabilities.filter(v => v.severity === 'Critical').length;
        const highCount = vulnerabilities.filter(v => v.severity === 'High').length;
        
        if (criticalCount > 0) score += 15; // Reduced penalty for critical vulnerabilities
        if (criticalCount > 2) score += 8;  // Additional penalty for multiple critical issues
        if (highCount > 2) score += 6;      // Reduced penalty for multiple high-severity issues
        
        if (!this.slitherWasUsed) {
            score += 15; // Moderate uncertainty penalty
        }

        // Cap the maximum score at 92 to stay in 85-90% range for extreme cases
        return Math.min(score, 92);
    }

    getRiskInterpretation(riskScore, vulnerabilityCount) {
        if (riskScore >= 75) {
            return `CRITICAL RISK (${riskScore}/100) - ${vulnerabilityCount} vulnerabilities. NEVER DEPLOY.`;
        } else if (riskScore >= 50) {
            return `HIGH RISK (${riskScore}/100) - ${vulnerabilityCount} vulnerabilities. Major security review required.`;
        } else if (riskScore >= 25) {
            return `MEDIUM RISK (${riskScore}/100) - ${vulnerabilityCount} vulnerabilities. Security fixes recommended.`;
        } else if (riskScore > 0) {
            return `LOW RISK (${riskScore}/100) - ${vulnerabilityCount} minor issues detected.`;
        } else {
            return `MINIMAL RISK (${riskScore}/100) - No major security concerns detected.`;
        }
    }

    async analyzeContract(solidityCode) {
        try {
            const contractPath = await this.saveToTempFile(solidityCode);
            
            console.log('🔍 Starting comprehensive security analysis...');
            console.log('Contract preview:', solidityCode.substring(0, 200) + '...');
            
            // Always run enhanced pattern matching first
            console.log('Running enhanced pattern matching...');
            let vulnerabilities = this.performBasicSecurityCheck(solidityCode);
            console.log(`Pattern matching found ${vulnerabilities.length} issues`);
            
            // Try Slither analysis
            const slitherResult = await this.runSlitherAnalysis(contractPath);
            this.slitherWasUsed = false;

            if (slitherResult.success) {
                console.log('✅ Slither analysis completed');
                const slitherVulns = this.processSlitherResults(slitherResult);
                console.log(`Slither found ${slitherVulns.length} additional issues`);
                
                // Combine vulnerabilities (avoid duplicates)
                slitherVulns.forEach(slitherVuln => {
                    const isDuplicate = vulnerabilities.some(existing => 
                        existing.type === slitherVuln.type || 
                        existing.description.toLowerCase().includes(slitherVuln.type.toLowerCase())
                    );
                    if (!isDuplicate) {
                        vulnerabilities.push(slitherVuln);
                    }
                });
                
                this.slitherWasUsed = true;
            } else {
                console.log('⚠️ Slither failed:', slitherResult.error);
            }

            const riskScore = this.calculateRiskScore(vulnerabilities);
            const interpretation = this.getRiskInterpretation(riskScore, vulnerabilities.length);

            console.log(`Final analysis: ${vulnerabilities.length} vulnerabilities, risk score: ${riskScore}`);

            // Clean up
            try {
                fs.unlinkSync(contractPath);
            } catch (e) {}

            return {
                success: true,
                riskScore,
                interpretation,
                vulnerabilities,
                slitherUsed: this.slitherWasUsed,
                summary: {
                    total: vulnerabilities.length,
                    critical: vulnerabilities.filter(v => v.severity === 'Critical').length,
                    high: vulnerabilities.filter(v => v.severity === 'High').length,
                    medium: vulnerabilities.filter(v => v.severity === 'Medium').length,
                    low: vulnerabilities.filter(v => v.severity === 'Low').length
                }
            };

        } catch (error) {
            console.error('Analysis failed:', error);
            return {
                success: false,
                error: error.message,
                riskScore: 95,
                interpretation: 'Analysis failed - assume critical risk',
                vulnerabilities: [],
                summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
            };
        }
    }
}

module.exports = new SecurityAnalysisService();