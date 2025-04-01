import "./styles/navbar.css";

function Navbar(){
    return (
        <div className="sol-navbar">
            <img src="./logowithtext.png" className="mainlogo"></img>
            <div className="navbar-links">
                <a href="#home" className="navlink active">Home</a>
                <a href="#about" className="navlink">Documentation</a>
                <a href="#contact" className="navlink">Contact</a>
            </div>
        </div>
    )
}

export default Navbar;