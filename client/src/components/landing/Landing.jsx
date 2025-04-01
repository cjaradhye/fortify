import NavbarLanding from "./NavbarLanding";
import MainSection from "./MainSection";
import Second from "./Second";
import Third from "./Third";
import "./styles/landing.css";

function Landing(){
    return(
        <>
            <NavbarLanding />
            <MainSection />
            <Second />
            <Third />
        </>
    )
}

export default Landing;