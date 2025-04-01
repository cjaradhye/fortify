// src/components/SolidityEditor.js
import React, { useState } from "react";

function SolidityEditor({ onCodeChange }) {
  const [code, setCode] = useState("");

  const handleChange = (e) => {
    setCode(e.target.value);
    onCodeChange(e.target.value);
  };

  return (
    <div>
      <h2>Write your Solidity Code</h2>
      <textarea
        value={code}
        onChange={handleChange}
        placeholder="Write your Solidity code here..."
        rows="15"
        cols="80"
      />
    </div>
  );
}

export default SolidityEditor;

