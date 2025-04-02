import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

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
        "Medium": 0.2,
        "Low": 0.1,
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
   
    # Count vulnerabilities by severity
    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    real_vulnerabilities = []
    
    for vuln in vulnerabilities:
        severity = vuln.get("severity", "N/A")
        if severity in severity_counts and severity != "N/A":
            severity_counts[severity] += 1
            real_vulnerabilities.append(vuln)

    if risk_score >= 0.7:
        report += "The analyzed smart contract contains serious security vulnerabilities that require immediate attention. DO NOT deploy this contract until these issues have been fixed and verified.\n"
    elif risk_score >= 0.4:
        report += "The analyzed smart contract contains notable security concerns. It is recommended to address these issues before deploying this contract to a production environment.\n"
    elif risk_score >= 0.2:
        report += "The analyzed smart contract contains some minor security concerns. While not critical, addressing these issues would improve the overall security posture of the contract.\n"
    else:
        report += "The analyzed smart contract appears to be relatively secure with only minor issues identified. As with any smart contract, continue to follow security best practices and consider a professional audit before major deployments.\n"
    
    return report

if __name__ == "__main__":
    api_key = os.getenv("GEMINI_KEY_2")
    path = os.path.join("..", "contracts", "fetched", "FetchedContract.sol")
    with open(path, "r", encoding="utf-8") as file:
        source = file.read()
    
    analysis = analyze_smart_contract(source, api_key)
    
    report = generate_readable_report(analysis)
    print(report)