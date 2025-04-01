// src/App.js
import React, { useState } from "react";
import SolidityIDE from "./components/SolidityIDE";
import Navbar from "./components/Navbar";
import Landing from "./components/landing/Landing";
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/home" element={
        <div className="plswork">
          <Navbar />
          <SolidityIDE />
        </div>
        } />
      <Route path="/" element={
        <Landing />} />
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  )
}

export default App;

