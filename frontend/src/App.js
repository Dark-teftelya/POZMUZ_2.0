import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Home/HomePage';  
import TrackSeparation from './separation/TrackSeparation'; 
import Equalizer from './separation/Equalizer'; 
import AudioEnhancement from './separation/AudioEnhancement';
import MusicPlayer from './separation/components/MusicPlayer';
import './style/global.css';
import nav_icon from "./assets/nav_icon.png"

const App = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <Router>
            {/* Навигация */}
            <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
            <nav className="header-container">
                <img
                    src={nav_icon}
                    alt="Toggle navigation menu"
                    className="nav-icon nav-icon-toggle"
                    onClick={toggleMenu}
                />
                <ul className={`nav-list ${isMenuOpen ? 'active' : ''}`}>
                    <li>
                        <Link to="/" className="nav-link" onClick={toggleMenu}>
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link to="/track-separation" className="nav-link" onClick={toggleMenu}>
                            Track Separation
                        </Link>
                    </li>
                    <li className="nav-icon-desktop">
                        <img src={nav_icon} alt="nav_icon" className="nav-icon" />
                    </li>
                    <li className="logo-container">
                        <span className="logo-gradient">POZMUZ</span>
                    </li>
                    <li>
                        <Link to="/equalizer" className="nav-link" onClick={toggleMenu}>
                            Equalizer
                        </Link>
                    </li>
                    <li>
                        <Link to="/audio-enhancement" className="nav-link" onClick={toggleMenu}>
                            AudioEnhancement
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Основной контент */}
            <div className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/track-separation" element={<TrackSeparation />} />
                    <Route path="/equalizer" element={<Equalizer />} />
                    <Route path="/audio-enhancement" element={<AudioEnhancement />} />
                    <Route path="/musicplayer" element={<MusicPlayer />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;