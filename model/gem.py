# from langchain_google_genai import GoogleGenerativeAI
# from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain
# import os
# import json

# from dotenv import load_dotenv

# load_dotenv()

# api_key = os.getenv("GEMINI_API_KEY")

# llm = GoogleGenerativeAI(model="gemini-1.5-pro", temperature=0.2)

# prompt_template = """
# You are a security expert specializing in smart contract audits. Analyze the following smart contract code for vulnerabilities, potential security risks, and exploitable areas.

# SMART CONTRACT CODE:
# ```solidity
# {contract_code}
# ```

# Perform a comprehensive security analysis focusing on:
# 1. Reentrancy vulnerabilities
# 2. Integer overflow/underflow issues
# 3. Front-running possibilities
# 4. Access control problems
# 5. Logic errors or edge cases
# 6. Gas optimization issues
# 7. Oracle manipulation vulnerabilities
# 8. Flash loan attack vectors
# 9. Function visibility concerns
# 10. DOS (Denial of Service) vulnerabilities

# For each identified issue:
# - Describe the vulnerability
# - Explain how it could be exploited
# - Rate its severity (Critical, High, Medium, Low)
# - Provide specific code references
# - Recommend fixes

# Present your analysis in a structured JSON format with the following keys:
# - "vulnerability_name"
# - "description"
# - "exploitation_scenario"
# - "severity" 
# - "affected_code_lines"
# - "recommended_fix"

# If no vulnerabilities are found in a specific category, explicitly state that.
# """

# prompt = PromptTemplate(
#     input_variables=["contract_code"],
#     template=prompt_template,
# )

# # Create the chain
# smart_contract_analyzer_chain = LLMChain(llm=llm, prompt=prompt)

# def analyze_smart_contract(contract_code):
#     """
#     Analyzes a smart contract for security vulnerabilities using the Gemini API.
    
#     Args:
#         contract_code (str): The Solidity code of the smart contract
        
#     Returns:
#         dict: Parsed JSON response containing the vulnerability analysis
#     """
#     try:
#         # Run the chain
#         result = smart_contract_analyzer_chain.run(contract_code=contract_code)
        
#         # Attempt to parse the response as JSON
#         try:
#             # Find JSON content if it's embedded in a larger text
#             json_start = result.find('{')
#             json_end = result.rfind('}') + 1
#             if json_start >= 0 and json_end > json_start:
#                 json_content = result[json_start:json_end]
#                 parsed_result = json.loads(json_content)
#             else:
#                 parsed_result = json.loads(result)
                
#             return parsed_result
#         except json.JSONDecodeError:
#             # If not valid JSON, return the raw text
#             return {"raw_analysis": result}
            
#     except Exception as e:
#         return {"error": str(e)}

# def generate_report(analysis_results):
#     """
#     Generates a human-readable report from the vulnerability analysis.
    
#     Args:
#         analysis_results (dict): The parsed results from the vulnerability analysis
        
#     Returns:
#         str: A formatted report
#     """
#     if "error" in analysis_results:
#         return f"Error during analysis: {analysis_results['error']}"
    
#     if "raw_analysis" in analysis_results:
#         return f"Analysis completed but returned in non-JSON format:\n\n{analysis_results['raw_analysis']}"
    
#     report = "# Smart Contract Security Analysis Report\n\n"
    
#     # Add vulnerabilities to the report
#     vulnerabilities = analysis_results.get("vulnerabilities", [])
#     if not vulnerabilities:
#         vulnerabilities = [analysis_results]  # Handle case where result is directly a list of vulnerabilities
        
#     if not isinstance(vulnerabilities, list):
#         return f"Unexpected analysis format. Raw output:\n\n{analysis_results}"
    
#     for vuln in vulnerabilities:
#         report += f"## {vuln.get('vulnerability_name', 'Unnamed Vulnerability')}\n"
#         report += f"**Severity**: {vuln.get('severity', 'Unknown')}\n\n"
#         report += f"**Description**: {vuln.get('description', 'No description provided')}\n\n"
#         report += f"**Exploitation Scenario**: {vuln.get('exploitation_scenario', 'No scenario provided')}\n\n"
#         report += f"**Affected Code Lines**: {vuln.get('affected_code_lines', 'Not specified')}\n\n"
#         report += f"**Recommended Fix**: {vuln.get('recommended_fix', 'No fix provided')}\n\n"
#         report += "---\n\n"
    
#     return report

# if __name__ == "__main__":
#     example_contract = """
#     pragma solidity ^0.8.0;
    
#     contract SimpleStorage {
#         uint256 private _value;
#         address public owner;
        
#         constructor() {
#             owner = msg.sender;
#         }
        
#         function setValue(uint256 newValue) public {
#             _value = newValue;
#         }
        
#         function getValue() public view returns (uint256) {
#             return _value;
#         }
        
#         function transferOwnership(address newOwner) public {
#             require(msg.sender == owner, "Not the owner");
#             owner = newOwner;
#         }
#     }
#     """
    
#     analysis = analyze_smart_contract(example_contract)
    
#     report = generate_report(analysis)
#     print(report)

import google.generativeai as genai
import os
import json
import re

# Function to analyze smart contract using Gemini API
def analyze_smart_contract(contract_code, api_key):
    """
    Analyzes a smart contract for security vulnerabilities using the Gemini API directly.
    
    Args:
        contract_code (str): The Solidity code of the smart contract
        api_key (str): Your Gemini API key
        
    Returns:
        dict: Analysis results
    """
    try:
        # Configure the Gemini API with the provided key
        genai.configure(api_key=api_key)
        
        # Create the prompt
        prompt = f"""
        You are a security expert specializing in smart contract audits. Analyze the following smart contract code for vulnerabilities, potential security risks, and exploitable areas.

        SMART CONTRACT CODE:
        ```solidity
        {contract_code}
        ```

        Perform a comprehensive security analysis focusing on:
        1. Reentrancy vulnerabilities
        2. Integer overflow/underflow issues
        3. Front-running possibilities
        4. Access control problems
        5. Logic errors or edge cases
        6. Gas optimization issues
        7. Oracle manipulation vulnerabilities
        8. Flash loan attack vectors
        9. Function visibility concerns
        10. DOS (Denial of Service) vulnerabilities

        For each identified issue:
        - Describe the vulnerability
        - Explain how it could be exploited
        - Rate its severity (Critical, High, Medium, Low)
        - Provide specific code references
        - Recommend fixes

        Present your analysis as a structured JSON array where each object represents a finding/vulnerability.
        """
        
        # Configure the model
        model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config={"temperature": 0.2}
        )
        
        # Generate response
        response = model.generate_content(prompt)
        result = response.text
        
        # Extract JSON from the response if it's wrapped in code blocks
        json_pattern = r'```(?:json)?\s*(\[.*?\])\s*```'
        json_match = re.search(json_pattern, result, re.DOTALL)
        
        if json_match:
            result = json_match.group(1)
            
        # Try to parse the result as JSON
        try:
            parsed_result = json.loads(result)
            return parsed_result
        except json.JSONDecodeError:
            # If parsing fails, return the raw text
            return {"raw_analysis": result}
            
    except Exception as e:
        return {"error": str(e)}

def calculate_risk_score(vulnerabilities):
    """
    Calculate a risk score between 0-1 based on the vulnerabilities found.
    
    Args:
        vulnerabilities: List of vulnerability objects
        
    Returns:
        float: Risk score between 0-1
    """
    severity_weights = {
        "Critical": 0.4,
        "High": 0.25,
        "Medium": 0.15,
        "Low": 0.05,
        "N/A": 0
    }
    
    total_score = 0
    max_score = 0
    
    for vuln in vulnerabilities:
        severity = vuln.get("severity", "N/A")
        if severity in severity_weights:
            total_score += severity_weights[severity]
            max_score += 0.4  # Maximum possible weight (Critical)
    
    # Normalize to 0-1 scale
    if max_score > 0:
        normalized_score = min(total_score, 1.0)
    else:
        normalized_score = 0
        
    return round(normalized_score, 2)

def generate_readable_report(analysis_results):
    """
    Generates a human-readable report from the vulnerability analysis results.
    
    Args:
        analysis_results: The parsed analysis results
        
    Returns:
        str: A formatted report in paragraph form
    """
    # Handle errors
    if isinstance(analysis_results, dict) and "error" in analysis_results:
        return f"Error during analysis: {analysis_results['error']}"
    
    if isinstance(analysis_results, dict) and "raw_analysis" in analysis_results:
        return f"Analysis completed but couldn't be properly parsed:\n\n{analysis_results['raw_analysis']}"
    
    # Ensure we have a list of vulnerabilities
    vulnerabilities = analysis_results if isinstance(analysis_results, list) else []
    
    # Calculate risk score
    risk_score = calculate_risk_score(vulnerabilities)
    
    # Start building the report
    report = "SMART CONTRACT SECURITY ANALYSIS REPORT\n"
    report += "=" * 40 + "\n\n"
    
    # Add risk score
    report += f"RISK ASSESSMENT SCORE: {risk_score}/1.0\n\n"
    
    # Add executive summary
    report += "EXECUTIVE SUMMARY:\n"
    report += "-" * 20 + "\n"
    
    # Count vulnerabilities by severity
    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    real_vulnerabilities = []
    
    for vuln in vulnerabilities:
        severity = vuln.get("severity", "N/A")
        if severity in severity_counts and severity != "N/A":
            severity_counts[severity] += 1
            real_vulnerabilities.append(vuln)
    
    # Create summary text
    if sum(severity_counts.values()) == 0:
        report += "No significant vulnerabilities were found in the analyzed smart contract.\n"
    else:
        report += f"Analysis identified {sum(severity_counts.values())} vulnerabilities:\n"
        for severity, count in severity_counts.items():
            if count > 0:
                report += f"- {count} {severity} severity issue{'s' if count > 1 else ''}\n"
        
        if risk_score >= 0.7:
            report += "\nThis contract has CRITICAL security concerns that must be addressed before deployment.\n"
        elif risk_score >= 0.4:
            report += "\nThis contract has SIGNIFICANT security concerns that should be addressed.\n"
        elif risk_score >= 0.2:
            report += "\nThis contract has MODERATE security concerns that would benefit from remediation.\n"
        else:
            report += "\nThis contract has MINOR security concerns with relatively low risk.\n"
    
    report += "\n"
    
    # Add detailed findings section
    report += "DETAILED FINDINGS:\n"
    report += "-" * 20 + "\n\n"
    
    if real_vulnerabilities:
        for i, vuln in enumerate(real_vulnerabilities):
            name = vuln.get("vulnerability_name", "Unnamed Vulnerability")
            severity = vuln.get("severity", "Unknown")
            description = vuln.get("description", "No description provided")
            exploitation = vuln.get("exploitation_scenario", "No scenario provided")
            affected_lines = vuln.get("affected_code_lines", "Not specified")
            fix = vuln.get("recommended_fix", "No fix provided")
            
            report += f"{i+1}. {name} (Severity: {severity})\n"
            report += f"   Description: {description}\n"
            if exploitation != "N/A":
                report += f"   Exploitation Scenario: {exploitation}\n"
            report += f"   Affected Code Lines: {affected_lines}\n"
            if fix != "N/A":
                report += f"   Recommended Fix: {fix}\n"
            report += "\n"
    
    # Add section for secure aspects
    report += "SECURE ASPECTS:\n"
    report += "-" * 20 + "\n"
    
    secure_aspects = []
    for vuln in vulnerabilities:
        name = vuln.get("vulnerability_name", "")
        if "No " in name and vuln.get("severity", "") == "N/A":
            secure_aspects.append(vuln)
    
    if secure_aspects:
        for aspect in secure_aspects:
            name = aspect.get("vulnerability_name", "")
            description = aspect.get("description", "No description provided")
            report += f"- {name}: {description}\n\n"
    else:
        report += "No specific secure aspects were highlighted in the analysis.\n\n"
    
    # Add conclusion
    report += "CONCLUSION:\n"
    report += "-" * 20 + "\n"
    
    if risk_score >= 0.7:
        report += "The analyzed smart contract contains serious security vulnerabilities that require immediate attention. DO NOT deploy this contract until these issues have been fixed and verified.\n"
    elif risk_score >= 0.4:
        report += "The analyzed smart contract contains notable security concerns. It is recommended to address these issues before deploying this contract to a production environment.\n"
    elif risk_score >= 0.2:
        report += "The analyzed smart contract contains some minor security concerns. While not critical, addressing these issues would improve the overall security posture of the contract.\n"
    else:
        report += "The analyzed smart contract appears to be relatively secure with only minor issues identified. As with any smart contract, continue to follow security best practices and consider a professional audit before major deployments.\n"
    
    return report

# Example usage
if __name__ == "__main__":
    # Get API key from user (or you could store it in an environment variable)
    api_key = input("Enter your Gemini API key: ")
    
    # Example smart contract code - you would replace this with your input mechanism
    example_contract = """
    pragma solidity ^0.8.0;
    
    contract SimpleStorage {
        uint256 private _value;
        address public owner;
        
        constructor() {
            owner = msg.sender;
        }
        
        function setValue(uint256 newValue) public {
            _value = newValue;
        }
        
        function getValue() public view returns (uint256) {
            return _value;
        }
        
        function transferOwnership(address newOwner) public {
            require(msg.sender == owner, "Not the owner");
            owner = newOwner;
        }
    }
    """
    
    # Analyze the contract
    analysis = analyze_smart_contract(example_contract, api_key)
    
    # Generate and print the report
    report = generate_readable_report(analysis)
    print(report)