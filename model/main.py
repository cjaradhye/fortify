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
    decay_factor = 0.8  # Closer to 1 = stronger decay
    weighted_random = 0.3 + (0.45 * (1 - math.exp(-decay_factor * rd.random())))
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