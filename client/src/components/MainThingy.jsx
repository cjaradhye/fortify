import React, { useState } from "react";
import Navbar from "./Navbar";
import SolidityIDE from "./SolidityIDE";
import ContractFetcher from "./ContractFetcher";
import ToggleButton from "./ToggleButton";

const MainThingy = () => {
    const [showOne, setShowOne] = useState(true);

    return (
        <>
            <Navbar />
            <div className="newnewwork">
                <ToggleButton showOne={showOne} setShowOne={setShowOne} />
                {showOne ? <ContractFetcher /> : <SolidityIDE />}
            </div>
            <div className="plsworkwork">
                <h3>Fortify does not support Mobiles yet.</h3>
            </div>
        </>
    );
};

export default MainThingy;
