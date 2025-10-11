import pytest
from predictor import Predictor

def test_predictor_output():
    predictor = Predictor()
    result = predictor.predict('contract code')
    assert isinstance(result, dict)
