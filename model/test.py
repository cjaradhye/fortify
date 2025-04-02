import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={"code": "contract Minimal { function foo() public pure returns(uint) { return 42; } }"},
    headers={"Content-Type": "application/json"}
)

print("Status:", response.status_code)
print("Response:", response.json())

API_URL = "http://localhost:8000/predict"
data = {"code": "pragma solidity ^0.8.0;"}

try:
    response = requests.post(API_URL, json=data, timeout=10)
    print(response.status_code, response.json())
except Exception as e:
    print("API Error:", str(e))


from predictor import CodeRiskPredictor
predictor = CodeRiskPredictor("model_artifacts")
test_code = "pragma solidity ^0.8.0;"
print(predictor.predict(test_code))
