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
            <ToggleButton showOne={showOne} setShowOne={setShowOne} />
            {showOne ? <SolidityIDE /> : <ContractFetcher />}
        </>
    );
};

export default MainThingy;
