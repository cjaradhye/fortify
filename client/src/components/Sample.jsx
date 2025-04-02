import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';

const ContractAnalyzer = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect when component mounts
    socketService.connect();

    return () => {
      // Disconnect when component unmounts
      socketService.disconnect();
    };
  }, []);

  const analyzeContract = (contractAddress) => {
    setStatus('analyzing');
    setProgress(0);
    setResults(null);
    setError(null);

    socketService.analyzeContract(contractAddress, {
      onProgress: (data) => {
        setProgress(data.progress);
        setStatus(data.message);
      },
      onComplete: (data) => {
        setResults(data);
        setStatus('completed');
        setProgress(100);
      },
      onError: (error) => {
        setError(error);
        setStatus('error');
      }
    });
  };

  return (
    <div>
      <h2>Contract Analyzer</h2>
      
      <button 
        onClick={() => analyzeContract("0x4E95B942633b77372fFeafDf9A8105C23B17D91B")}
        disabled={status === 'analyzing'}
      >
        {status === 'analyzing' ? 'Analyzing...' : 'Analyze Contract'}
      </button>

      {status === 'analyzing' && (
        <div>
          <progress value={progress} max="100" />
          <p>{status} ({progress}%)</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>Error: {error.message}</p>
        </div>
      )}

      {results && (
        <div className="results">
          <h3>Analysis Results</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ContractAnalyzer;