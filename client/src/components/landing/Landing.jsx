import NavbarLanding from "./NavbarLanding";
import MainSection from "./MainSection";
import Second from "./Second";
import Third from "./Third";
import "./styles/landing.css";
import Scanner from "../newLanding/Scanner";
import ScanSimulator from "../newLanding/ScanSimulator";
import HowItWorks from "../newLanding/HowItWorks";
import Footer from "../newLanding/Footer";

function Landing(){
    return(
        <>
            <NavbarLanding />
            <Scanner />
            <div className="disection">
                <Second />
                <ScanSimulator />
            </div>
            <HowItWorks />
            <Footer />
        </>
    )
}

export default Landing;