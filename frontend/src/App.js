import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Home/HomePage';
import TrackSeparation from './separation/TrackSeparation';
import Equalizer from './separation/Equalizer';
import AudioEnhancement from './separation/AudioEnhancement';
import MusicPlayer from './separation/components/MusicPlayer';
import './style/global.css';
import nav_icon from './assets/nav_icon.png';

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMarqueeVisible, setIsMarqueeVisible] = useState(true); // Начинаем с видимой строки

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Управление видимостью бегущей строки
  useEffect(() => {
    const showDuration = 120 * 1000; // 2 минуты
    const cycleDuration = 300 * 1000; // 5 минут

    const toggleMarquee = () => {
      setIsMarqueeVisible(true);
      setTimeout(() => {
        setIsMarqueeVisible(false);
      }, showDuration);
    };

    // Запускаем сразу и повторяем каждые 5 минут
    toggleMarquee();
    const interval = setInterval(toggleMarquee, cycleDuration);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      {/* Навигация */}
      <link
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
        rel="stylesheet"
      />
      <link rel="manifest" href="/manifest.json" />
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

      {/* Бегущая строка */}
      {isMarqueeVisible && (
        <div className="marquee-container">
          <div className="marquee">
            <span className="marquee-text">
              Сервис находится на доработке! В случае возникновения ошибок, обращайтесь в наши соц сети:{' '}
            </span>
            <a
              href="https://t.me/PozMUZZ"
              target="_blank"
              rel="noopener noreferrer"
              className="marquee-link"
            >
              https://t.me/PozMUZZ
            </a>
          </div>
        </div>
      )}
    </Router>
  );
};

export default App;