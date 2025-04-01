// src/components/CompilerOutput.js
import React from "react";

function CompilerOutput({ output }) {
  return (
    <div>
      <h2>Compilation Output</h2>
      {output ? (
        <pre>{JSON.stringify(output, null, 2)}</pre>
      ) : (
        <p>No output yet. Compile your code!</p>
      )}
    </div>
  );
}

export default CompilerOutput;
