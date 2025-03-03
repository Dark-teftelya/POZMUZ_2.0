// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Home/HomePage';  // Убедитесь, что это правильный путь к компоненту Home
import TrackSeparation from './separation/TrackSeparation'; 
import Equalizer from './separation/Equalizer'; 
import AudioEnhancement from './separation/AudioEnhancement';
import MusicPlayer from './separation/components/MusicPlayer';
import './Home/home.css'
const App = () => {
    return (
        <Router>
            <nav className="header-container">
                <ul className="nav-list">
                    <li>
                        <Link to="/" className="nav-link">Home</Link>
                    </li>
                    <li>
                        <Link to="/track-separation" className="nav-link">Track Separation</Link>
                    </li>
                    <li>
                        <Link to="/equalizer" className="nav-link">Equalizer</Link>
                    </li>
                    <li>
                        <Link to="/audio-enhancement" className="nav-link">AudioEnhancement</Link>
                    </li>
                </ul>
            </nav>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/track-separation" element={<TrackSeparation />} />
                <Route path="/equalizer" element={< Equalizer />} />
                <Route path="/audio-enhancement" element={<AudioEnhancement />} />
                <Route path="/musicplayer" element={<MusicPlayer />} />
            </Routes>
        </Router>
    );
};

export default App;
