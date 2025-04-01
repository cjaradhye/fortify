import torch
import torch.nn as nn

class TemperatureScaling(nn.Module):
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)
    def forward(self, logits):
        return logits / self.temperature

class ResidualBlock(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.fc = nn.Linear(in_features, out_features)
        self.bn = nn.BatchNorm1d(out_features)
        self.dropout = nn.Dropout(0.3)
        self.adapter = nn.Linear(in_features, out_features)
    def forward(self, x):
        identity = x
        out = torch.relu(self.fc(x))
        out = self.bn(out)
        out = self.dropout(out)
        return out + self.adapter(identity)

class ImprovedCodeBERTClassifier(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, 2048)
        self.bn1 = nn.BatchNorm1d(2048)
        self.dropout1 = nn.Dropout(0.3)
        self.res1 = ResidualBlock(2048, 1024)
        self.res2 = ResidualBlock(1024, 512)
        self.res3 = ResidualBlock(512, 256)
        self.fc_out = nn.Linear(256, 1)
        self.temperature = TemperatureScaling()
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = self.bn1(x)
        x = self.dropout1(x)
        x = self.res1(x)
        x = self.res2(x)
        x = self.res3(x)
        x = self.fc_out(x)
        x = self.temperature(x)
        return x