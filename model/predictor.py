import torch
import pickle
import numpy as np
from pathlib import Path
from model_definitions import ImprovedCodeBERTClassifier

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
        self.model.eval()
    
    def predict(self, features):
        if not isinstance(features, torch.Tensor):
            features = torch.tensor(features, dtype=torch.float32).to(self.device)
        with torch.no_grad():
            outputs = self.model(features)
            return torch.sigmoid(outputs).cpu().numpy()