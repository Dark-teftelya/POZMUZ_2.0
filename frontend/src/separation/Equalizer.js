import React, { useState, useEffect, useRef } from 'react';
import './equalizer.css';
import MusicPlayer from './components/MusicPlayer';
import { Howler } from 'howler';

const EqualizerCube = () => {
  const [howlInstance, setHowlInstance] = useState(null);
  const [angleY, setAngleY] = useState(0);
  const [volume, setVolume] = useState(50);
  const [bass, setBass] = useState(50);
  const [mid, setMid] = useState(50);
  const [treble, setTreble] = useState(50);
  const [mode, setMode] = useState(volume > 50 ? 'Enhanced' : 'Normal');
  const cubeRef = useRef(null);
  const audioContextRef = useRef(null);
  const biquadFiltersRef = useRef({});

  const rotateCube = (direction) => {
    if (direction === 'left') {
      setAngleY((prevAngle) => prevAngle - 90);
    } else if (direction === 'right') {
      setAngleY((prevAngle) => prevAngle + 90);
    }
  };

  const handleHowlCreated = (howl) => {
    console.log("🎵 Howl создан в плеере:", howl);
    setHowlInstance(howl);
  };

  const applyEqualizer = () => {
    if (!howlInstance) {
      console.warn("⛔ HowlInstance отсутствует!");
      return;
    }
    
    if (!audioContextRef.current) {
      console.log("🎵 Создаю новый AudioContext...");
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    console.log("🔄 Применение эквалайзера...");

    Object.values(biquadFiltersRef.current).forEach(filter => filter.disconnect());

    const source = audioContextRef.current.createMediaElementSource(howlInstance._sounds[0]._node);

    const bassFilter = audioContextRef.current.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.setValueAtTime(200, audioContextRef.current.currentTime);
    bassFilter.gain.setValueAtTime((bass - 50) * 0.5, audioContextRef.current.currentTime);

    const midFilter = audioContextRef.current.createBiquadFilter();
    midFilter.type = "peaking";
    midFilter.frequency.setValueAtTime(1000, audioContextRef.current.currentTime);
    midFilter.gain.setValueAtTime((mid - 50) * 0.5, audioContextRef.current.currentTime);

    const trebleFilter = audioContextRef.current.createBiquadFilter();
    trebleFilter.type = "highshelf";
    trebleFilter.frequency.setValueAtTime(3000, audioContextRef.current.currentTime);
    trebleFilter.gain.setValueAtTime((treble - 50) * 0.5, audioContextRef.current.currentTime);

    source.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(trebleFilter);
    trebleFilter.connect(audioContextRef.current.destination);

    biquadFiltersRef.current = { bassFilter, midFilter, trebleFilter };

    console.log("✅ Эквалайзер применён!", biquadFiltersRef.current);
  };

  useEffect(() => {
    setMode(volume > 50 ? 'Enhanced' : 'Normal');

    if (howlInstance) {
      howlInstance.volume(volume / 100);
      console.log(`🔊 Громкость изменена: ${volume}%`);
    }
  }, [volume, howlInstance]);

  useEffect(() => {
    if (biquadFiltersRef.current.bassFilter) {
      const gainValue = (bass - 50) * 0.5;
      biquadFiltersRef.current.bassFilter.gain.value = gainValue;
      console.log(`🎚️ Басы изменены: ${gainValue} dB`);
    }
  }, [bass]);

  useEffect(() => {
    if (biquadFiltersRef.current.midFilter) {
      const gainValue = (mid - 50) * 0.5;
      biquadFiltersRef.current.midFilter.gain.value = gainValue;
      console.log(`🎛️ Средние частоты изменены: ${gainValue} dB`);
    }
  }, [mid]);

  useEffect(() => {
    if (biquadFiltersRef.current.trebleFilter) {
      const gainValue = (treble - 50) * 0.5;
      biquadFiltersRef.current.trebleFilter.gain.value = gainValue;
      console.log(`🎵 Высокие частоты изменены: ${gainValue} dB`);
    }
  }, [treble]);

  return (
    <div>
      <div>
        <h1>Welcome to the Music Page</h1>
        <MusicPlayer 
          onHowlCreated={handleHowlCreated} 
          bass={bass} 
          mid={mid} 
          treble={treble} 
        />
      </div>
      <div id="cube-container">
        <div id="cube" ref={cubeRef} style={{ transform: `rotateY(${angleY}deg)` }}>
          <div className="face front">
            <h2>Настройки эквалайзера</h2>
            <div className="control-group">
              <label>Громкость: {volume}</label>
              <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(e.target.value)} />
            </div>
            <div className="control-group">
              <label>Басы: {bass}</label>
              <input type="range" min="0" max="100" value={bass} onChange={(e) => setBass(e.target.value)} />
            </div>
            <div className="control-group">
              <label>Средние частоты: {mid}</label>
              <input type="range" min="0" max="100" value={mid} onChange={(e) => setMid(e.target.value)} />
            </div>
            <div className="control-group">
              <label>Высокие частоты: {treble}</label>
              <input type="range" min="0" max="100" value={treble} onChange={(e) => setTreble(e.target.value)} />
            </div>
          </div>
          <div className="face back">
            <h3>Текущие настройки</h3>
            <p>Громкость: {volume}</p>
            <p>Басы: {bass}</p>
            <p>Средние частоты: {mid}</p>
            <p>Высокие частоты: {treble}</p>
          </div>
          <div className="face left">
            <h3>Изменение частот</h3>
            <p>Басы: {bass}</p>
            <p>Средние частоты: {mid}</p>
            <p>Высокие частоты: {treble}</p>
          </div>
          <div className="face right">
            <h3>Режим эквалайзера</h3>
            <p>{mode}</p>
          </div>
        </div>
        <div className="controls">
          <button onClick={() => rotateCube('right')} className="arrow-btn">←</button>
          <button onClick={applyEqualizer} className="apply-btn">Применить</button>
          <button onClick={() => rotateCube('left')} className="arrow-btn">→</button>
        </div>
      </div>
    </div>
  );
};

export default EqualizerCube;
