import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

train_texts = [
    "contract Safe { function withdraw() internal {} }",
    "contract Risky { function withdraw() public { msg.sender.call{value: 1 ether}(); } }",
    "contract MediumRisk { function transfer() public { payable(msg.sender).transfer(1 ether); } }"
]

vectorizer = TfidfVectorizer(
    max_features=1000,
    ngram_range=(1, 3),
    stop_words=None,
    analyzer='word'
)
vectorizer.fit(train_texts)

with open("tfidf_vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

print("Vectorizer trained and saved successfully!")