import React, { useState, useEffect, useRef } from 'react';
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
  const [isMarqueeVisible, setIsMarqueeVisible] = useState(true);
  const canvasRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Manage marquee visibility
  useEffect(() => {
    const showDuration = 60 * 1000; // 2 minutes
    const cycleDuration = 300 * 1000; // 5 minutes

    const toggleMarquee = () => {
      setIsMarqueeVisible(true);
      setTimeout(() => {
        setIsMarqueeVisible(false);
      }, showDuration);
    };

    toggleMarquee();
    const interval = setInterval(toggleMarquee, cycleDuration);

    return () => clearInterval(interval);
  }, []);

  // Moving grid animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation variables
    const squareSize = 50;
    const gridSize = Math.ceil(Math.max(window.innerWidth, window.innerHeight) / squareSize) + 1;
    let offsetX = 0;
    let offsetY = 0;
    let direction = 0; // 0: top-left, 1: top-right, 2: bottom-left, 3: bottom-right
    const speed = 2; // Pixels per frame
    const directionChangeInterval = 5000; // Change direction every 5 seconds

    // Direction vectors: [dx, dy]
    const directions = [
      [-1, -1], // top-left
      [1, -1],  // top-right
      [-1, 1],  // bottom-left
      [1, 1],   // bottom-right
    ];

    // Change direction periodically
    const changeDirection = () => {
      direction = (direction + 1) % 4;
    };
    setInterval(changeDirection, directionChangeInterval);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const [dx, dy] = directions[direction];

      // Update offsets
      offsetX = (offsetX + dx * speed) % squareSize;
      offsetY = (offsetY + dy * speed) % squareSize;

      // Draw grid
      for (let x = -squareSize; x < canvas.width + squareSize; x += squareSize) {
        for (let y = -squareSize; y < canvas.height + squareSize; y += squareSize) {
          ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
          ctx.strokeRect(x + offsetX, y + offsetY, squareSize, squareSize);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <Router>
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Navigation */}
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

      {/* Main Content */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/track-separation" element={<TrackSeparation />} />
          <Route path="/equalizer" element={<Equalizer />} />
          <Route path="/audio-enhancement" element={<AudioEnhancement />} />
          <Route path="/musicplayer" element={<MusicPlayer />} />
        </Routes>
      </div>

      {/* Marquee */}
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