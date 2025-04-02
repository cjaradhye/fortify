from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from predictor import CodeRiskPredictor
from typing import Optional

app = FastAPI()
predictor = CodeRiskPredictor("model_artifacts")

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
            "risk_score": 0.42, 
            "interpretation": "Sample response"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 