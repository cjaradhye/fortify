import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={"code": "contract Minimal { function foo() public pure returns(uint) { return 42; } }"},
    headers={"Content-Type": "application/json"}
)

print("Status:", response.status_code)
print("Response:", response.json())