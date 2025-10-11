import React from "react";
import { Routes, Route } from 'react-router-dom';
import SolidityIDE from "./components/SolidityIDE";
import Navbar from "./components/Navbar";
import Landing from "./components/landing/Landing";
import MainThingy from "./components/MainThingy";
import ContractFetcher from "./components/ContractFetcher";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/home" element={<div className="plswork"><MainThingy /></div>} />
        <Route path="/" element={<Landing />} />
        <Route path="/contract" element={
          <>
            <ContractFetcher />
          </>
        } />
      </Routes>
      
      {/* Global ToastContainer for all notifications */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}

export default App;