import React from "react";
import "./ToggleButton.css";

const ToggleButton = ({ showOne, setShowOne }) => {
    return (
        <div className="toggle-container" onClick={() => setShowOne(!showOne)}>
            <div className={`toggle-slider ${showOne ? "active-toggle" : ""}`}></div>
            <div className="toggle-option">
                <div className="toggle-label left-button">Upload & Deploy</div>
                <div className="toggle-label right-button">Verify Existing Contract</div>
            </div>
        </div>
    );
};

export default ToggleButton;
