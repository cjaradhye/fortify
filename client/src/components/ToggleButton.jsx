import React from "react";
import "./ToggleButton.css";

const ToggleButton = ({ showOne, setShowOne }) => {
    return (
        <div className="toggle-container" onClick={() => setShowOne(!showOne)}>
            <div className={`toggle-slider ${showOne ? "" : "active-toggle"}`}></div>
            <span className="toggle-label">{showOne ? "Upload & Deploy" : "Verify Existing Contract"}</span>
        </div>
    );
};

export default ToggleButton;
