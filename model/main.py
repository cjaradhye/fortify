from fastapi import FastAPI
import numpy as np
from predictor import CodeRiskPredictor

app = FastAPI()
predictor = CodeRiskPredictor("model_artifacts")

# Add a root endpoint
@app.get("/")
def home():
    return {"message": "Smart Contract Risk Prediction API is running"}

# Your prediction endpoint
@app.post("/predict")
async def predict(features: list[list[float]]):
    try:
        prediction = predictor.predict(np.array(features))
        return {"risk_score": float(prediction[0][0])}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)