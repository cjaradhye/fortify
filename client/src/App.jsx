// src/App.js
import React, { useState } from "react";
import SolidityIDE from "./components/SolidityIDE";
import Navbar from "./components/Navbar";

function App() {

  return (
    <>
      <Navbar />
      <SolidityIDE />
    </>
  );
}

export default App;
