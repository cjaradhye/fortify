// src/App.js
import React, { useState } from "react";
import SolidityIDE from "./components/SolidityIDE";
import Navbar from "./components/Navbar";
import Landing from "./components/landing/Landing";
// import Sample from "./components/Sample";
import { Routes, Route } from 'react-router-dom'
import ContractFetcher from "./components/ContractFetcher";
import { ToastContainer } from "react-toastify";



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
      <Route path="/contract" element={
        <>
        <ToastContainer />
        <ContractFetcher />
        </>} />
    </Routes>
  )
}

export default App;

