import streamlit as st
import requests
import json
from requests.exceptions import RequestException

# ==============================================
# APP CONFIGURATION
# ==============================================
st.set_page_config(
    page_title="Smart Contract Risk Analyzer",
    page_icon="🔒",
    layout="wide"
)

# ==============================================
# CUSTOM CSS STYLING
# ==============================================
st.markdown("""
<style>
    .stTextArea textarea {
        font-family: 'Courier New', monospace !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
    }
    .risk-high {
        color: #ff4b4b;
        font-size: 24px;
        font-weight: bold;
    }
    .risk-medium {
        color: #ffa500;
        font-size: 24px;
        font-weight: bold;
    }
    .risk-low {
        color: #0f9d58;
        font-size: 24px;
        font-weight: bold;
    }
    .header {
        font-size: 28px !important;
        font-weight: bold;
        margin-bottom: 20px;
    }
    .stButton>button {
        background-color: #4CAF50;
        color: white;
        font-weight: bold;
        padding: 10px 24px;
        border-radius: 6px;
    }
    .stButton>button:hover {
        background-color: #45a049;
    }
    .highlight {
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 1px 4px;
        font-family: monospace;
    }
</style>
""", unsafe_allow_html=True)

# ==============================================
# SESSION STATE INITIALIZATION
# ==============================================
if 'api_response' not in st.session_state:
    st.session_state.api_response = None
if 'last_code' not in st.session_state:
    st.session_state.last_code = ""


st.markdown('<p class="header">🔒 Smart Contract Risk Analyzer</p>', unsafe_allow_html=True)
st.markdown("""
Analyze Solidity smart contracts for potential vulnerabilities using advanced machine learning models.
""")


contract_code = st.text_area(
    "Paste your Solidity contract code:",
    height=300,
    value=st.session_state.last_code,
    placeholder="""// Example contract
pragma solidity ^0.8.0;

contract Example {
    mapping(address => uint) balances;
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw() public {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] = 0;
    }
}""",
    help="Paste your complete Solidity contract code to analyze",
    key="code_input"
)


API_URL = "http://localhost:8000/predict"

def analyze_contract(code):
    """Improved version with better error handling"""
    if not code.strip():
        return {"error": "Please enter Solidity code to analyze"}
    
    if len(code) < 20:
        return {"error": "Code too short (min 20 characters required)"}
    
    try:
        response = requests.post(
            API_URL,
            json={"code": code},
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=10
        )
        
        if response.status_code == 422:
            try:
                detail = response.json().get("detail", "Unknown validation error")
                if isinstance(detail, list):
                    detail = "; ".join([f"{e['loc'][1]}: {e['msg']}" for e in detail])
                return {"error": f"Validation error: {detail}"}
            except:
                return {"error": "Unprocessable entity (invalid input format)"}
                
        response.raise_for_status()
        return response.json()
        
    except RequestException as e:
        return {"error": f"API request failed: {str(e)}"}


if st.button("Analyze Contract", type="primary", key="analyze"):
    with st.spinner("🔍 Analyzing contract for vulnerabilities..."):
        st.session_state.api_response = analyze_contract(contract_code)

if st.session_state.api_response:
    if "error" in st.session_state.api_response:
        st.error(f"**Error:** {st.session_state.api_response['error']}")
        
        if "API connection" in st.session_state.api_response['error']:
            st.info("""
            **Troubleshooting steps:**
            1. Ensure your API server is running at `http://localhost:8000`
            2. Check the terminal where you ran `python main.py` for errors
            3. Verify the endpoint matches exactly: `/predict`
            """)
    else:
        try:
            risk_score = st.session_state.api_response["risk_score"]
            interpretation = st.session_state.api_response.get("interpretation", "No detailed interpretation available")
            
            # ==============================================
            # RISK VISUALIZATION
            # ==============================================
            st.subheader("Risk Assessment Results")
            
            # Visual risk meter
            risk_percentage = min(int(risk_score * 100), 100)
            st.progress(risk_percentage)
            
            # Risk classification
            if risk_score > 0.75:
                risk_class = "high"
                risk_emoji = "🔴"
                risk_text = "Critical Risk"
                risk_alert = st.error
                alert_message = "**Immediate attention required!** This contract shows multiple high-risk patterns."
            elif risk_score > 0.5:
                risk_class = "medium"
                risk_emoji = "🟠"
                risk_text = "High Risk"
                risk_alert = st.warning
                alert_message = "**Potential vulnerabilities detected.** Requires careful review."
            elif risk_score > 0.25:
                risk_class = "medium"
                risk_emoji = "🟡"
                risk_text = "Moderate Risk"
                risk_alert = st.warning
                alert_message = "**Some concerning patterns found.** Recommended review."
            else:
                risk_class = "low"
                risk_emoji = "🟢"
                risk_text = "Low Risk"
                risk_alert = st.success
                alert_message = "**No critical issues found.** Standard security checks still recommended."
            
            st.markdown(
                f'<p class="risk-{risk_class}">{risk_emoji} Risk Score: {risk_score:.3f} ({risk_text})</p>',
                unsafe_allow_html=True
            )
            
            # Detailed analysis
            risk_alert(alert_message)
            
            with st.expander("📋 Detailed Analysis", expanded=True):
                st.markdown(f"**Interpretation:** {interpretation}")
                
                if risk_score > 0.5:
                    st.markdown("""
                    **Recommended Actions:**
                    - Conduct thorough security review
                    - Consider formal verification
                    - Test extensively on testnet
                    """)
                else:
                    st.markdown("""
                    **Recommended Actions:**
                    - Standard security audit
                    - Test coverage analysis
                    - Gas optimization review
                    """)
            
            # Technical details
            with st.expander("⚙️ Technical Details"):
                st.json(st.session_state.api_response)
                
        except Exception as e:
            st.error(f"Failed to process results: {str(e)}")
            with st.expander("Show raw API response"):
                st.json(st.session_state.api_response)

# ==============================================
# SIDEBAR WITH ADDITIONAL INFORMATION
# ==============================================
with st.sidebar:
    st.markdown("### ℹ️ About This Tool")
    st.markdown("""
    This tool analyzes Solidity smart contracts for potential security vulnerabilities using:
    - Machine learning models trained on known vulnerabilities
    - Static analysis patterns
    - Code similarity detection
    """)
    
    st.markdown("### 🛠️ How To Use")
    st.markdown("""
    1. Paste your Solidity code
    2. Click "Analyze Contract"
    3. Review the risk assessment
    4. Check detailed recommendations
    """)
    
    st.markdown("### 🔍 Example Vulnerable Patterns")
    st.markdown("""
    ```solidity
    // Reentrancy vulnerability
    function withdraw() public {
        (bool success, ) = msg.sender.call{value: 1 ether}("");
        require(success);
        balances[msg.sender] = 0;
    }
    
    // Unchecked call return value
    function transfer(address payable dst) public {
        dst.send(100);
    }
    ```
    """)
    
    st.markdown("### ⚠️ Limitations")
    st.markdown("""
    - Cannot detect all vulnerability types
    - False positives/negatives possible
    - Always conduct manual review
    """)

# ==============================================
# FOOTER
# ==============================================
st.markdown("---")
st.caption("""
Smart Contract Risk Analyzer v2.0 | For educational and research purposes only | 
[Report Issues](https://github.com/your-repo/issues)
""")