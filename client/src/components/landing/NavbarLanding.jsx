import "../styles/navbar.css";

function NavbarLanding(){
    return (
        <div className="plswork">
            <div className="sol-navbar">
                <img src="./logowithtext.png" className="mainlogo"></img>
                {/* <div className="navbar-links">
                    <a href="#home" className="navlink active">Home</a>
                    <a href="#about" className="navlink">Documentation</a>
                    <a href="#contact" className="navlink">Contact</a>
                </div> */}
                <button className="register-button"><a className="eh" href="/home">Fortify Now</a></button>
            </div>
            
        </div>
    )
}

export default NavbarLanding;