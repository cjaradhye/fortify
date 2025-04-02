import torch
import pickle
import numpy as np
from pathlib import Path
from model_definitions import ImprovedCodeBERTClassifier
from transformers import AutoTokenizer, AutoModel

class CodeBERTFeatureExtractor:
    def __init__(self, model_name="microsoft/codebert-base"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.eval()

    def extract(self, code_snippet):
        tokens = self.tokenizer(code_snippet, return_tensors="pt", padding=True, truncation=True, max_length=512)
        with torch.no_grad():
            outputs = self.model(**tokens)
        embeddings = outputs.last_hidden_state[:, 0, :].squeeze().numpy().reshape(1, -1)
    
        padded_features = np.pad(embeddings, ((0, 0), (0, 6)), mode='constant')  # Now (1, 774)
        return padded_features


class CodeRiskPredictor:
    def __init__(self, artifacts_dir):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.load_artifacts(artifacts_dir)
    
    def load_artifacts(self, artifacts_dir):
        with open(Path(artifacts_dir) / "model_config.pkl", "rb") as f:
            self.config = pickle.load(f)
        self.model = ImprovedCodeBERTClassifier(self.config['input_dim']).to(self.device)
        self.model.load_state_dict(torch.load(Path(artifacts_dir) / "model_weights.pth", map_location=self.device))
        self.model.temperature.load_state_dict(torch.load(Path(artifacts_dir) / "temperature_scaling.pth", map_location=self.device))
        print("Temperature scaling parameters:", self.model.temperature)
        self.model.eval()
    
    def predict(self, features):
        if not isinstance(features, torch.Tensor):
            features = torch.tensor(features, dtype=torch.float32).to(self.device)
        with torch.no_grad():
            outputs = self.model(features)
            return torch.sigmoid(outputs).cpu().numpy()
        
extractor = CodeBERTFeatureExtractor()
predictor = CodeRiskPredictor("model_artifacts")

code_sample = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private number;
    
    // Function to store a number
    function store(uint256 num) public {
        number = num;
    }
    
    // Function to retrieve the stored number
    function retrieve() public view returns (uint256) {
        return number;
    }
}"""
features = extractor.extract(code_sample)

if isinstance(features, np.ndarray):
    features = torch.tensor(features, dtype=torch.float32)  # Ensure tensor conversion

risk_score = predictor.predict(features)
print(risk_score)

