import React from "react";
import { Routes, Route } from 'react-router-dom';
import SolidityIDE from "./components/SolidityIDE";
import Navbar from "./components/Navbar";
import Landing from "./components/landing/Landing";
import MainThingy from "./components/MainThingy";
import ContractFetcher from "./components/ContractFetcher";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Routes>
      <Route path="/home" element={<div className="plswork"><MainThingy /></div>} />
      <Route path="/" element={<Landing />} />
      <Route path="/contract" element={
        <>
          <ToastContainer />
          <ContractFetcher />
        </>
      } />
    </Routes>
  );
}

export default App;