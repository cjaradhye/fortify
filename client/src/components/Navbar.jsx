import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./styles/navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogoClick = () => {
        navigate('/');
    };

    return (
        <div className="sol-navbar">
            {/* Logo */}
            <img 
                src="./logowithtext.png" 
                className="mainlogo" 
                onClick={handleLogoClick} 
                style={{ cursor: 'pointer' }} 
                alt="Logo"
            />

            {/* Hamburger Menu Button */}
            <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                ☰
            </div>

            {/* Navbar Links */}
            <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                <a href="#home" className="navlink active">Home</a>
                <a href="#about" className="navlink">Documentation</a>
                <a href="#contact" className="navlink">Contact</a>
            </div>
        </div>
    );
}

export default Navbar;
