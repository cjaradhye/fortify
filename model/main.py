# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# from typing import Optional
# from fastapi.middleware.cors import CORSMiddleware
# from gem import analyze_smart_contract, generate_readable_report
# import os
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.get("/")
# def home():
#     return {"message": "Smart Contract Risk Prediction API is running"}

# class CodeInput(BaseModel):
#     code: str
#     contract_name: Optional[str] = None

# @app.post("/predict")
# async def predict(request: CodeInput):
#     try:
#         if len(request.code) < 20:
#             raise HTTPException(status_code=422, detail="Code too short (min 20 chars)")
        
#         # Get API key from environment
#         api_key = os.getenv("GEMINI_API_KEY")
#         if not api_key:
#             raise HTTPException(status_code=500, detail="Gemini API key not configured")
        
#         # Get analysis from Gemini
#         analysis = analyze_smart_contract(request.code, api_key)
        
#         # Generate the full report
#         report = generate_readable_report(analysis)
        
#         # Calculate risk score
#         risk_score = 0.5  # Default if not calculable
#         if isinstance(analysis, list):
#             severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
#             for vuln in analysis:
#                 severity = vuln.get("severity", "N/A")
#                 if severity in severity_counts:
#                     severity_counts[severity] += 1
            
#             # Simple risk score calculation (can be enhanced)
#             risk_score = min(
#                 0.9 * severity_counts["Critical"] + 
#                 0.7 * severity_counts["High"] + 
#                 0.4 * severity_counts["Medium"] + 
#                 0.1 * severity_counts["Low"],
#                 1.0
#             )
        
#         return {
#             "risk_score": risk_score,
#             "report": report,
#             "raw_analysis": analysis if isinstance(analysis, list) else []
#         }
        
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from predictor import CodeRiskPredictor
from typing import Optional
import random as rd
from fastapi.middleware.cors import CORSMiddleware
import math
app = FastAPI()
predictor = CodeRiskPredictor("model_artifacts")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

def get_weighted_score():
    decay_factor = 0.2  # Closer to 1 = stronger decay
    weighted_random = 0.6 + (0.6 * (1 - math.exp(-decay_factor * rd.random())))
    return weighted_random

@app.get("/")
def home():
    return {"message": "Smart Contract Risk Prediction API is running"}

class CodeInput(BaseModel):
    code: str
    contract_name: Optional[str] = None

@app.post("/predict")
async def predict(request: CodeInput):
    try:
        if len(request.code) < 20:
            raise HTTPException(status_code=422, detail="Code too short (min 20 chars)")
        
        return {
            "risk_score": get_weighted_score(), 
            "interpretation": "Sample response"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)