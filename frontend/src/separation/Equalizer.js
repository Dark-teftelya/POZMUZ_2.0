import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as Tone from 'tone';
import '../style/equalizer.css';
import eqVolumeGif from '../assets/eqvol.gif';
import musicWaveGif from '../assets/music.gif';
import midRangeIcon from '../assets/midr.png';
import guitarIcon from '../assets/guitar.png';
import boomBoxIcon from '../assets/boom_box.png';
import mixerBanner from '../assets/mixer.png';
import trimIcon from '../assets/trim-icon.png';
import volumeIcon from '../assets/volume-icon.png';
import speedIcon from '../assets/speed-icon.png';
import pitchIcon from '../assets/pitch-icon.png';
import equalizerIcon from '../assets/equalizer-icon.png';

import { API_BASE_URL } from "../config";

const EqualizerCube = () => {
  const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const [player, setPlayer] = useState(null);
  const [filters, setFilters] = useState([]);
  const [pitchShift, setPitchShift] = useState(null);
  const [eqValues, setEqValues] = useState(Array(frequencies.length).fill(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const positionRef = useRef(0);
  const startTimeRef = useRef(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [originalAudioBuffer, setOriginalAudioBuffer] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState('equalizer');
  const [activeMode, setActiveMode] = useState(null);
  const [volume, setVolume] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [format, setFormat] = useState('MP3');
  const [error, setError] = useState('');
  const [fileSelected, setFileSelected] = useState(false);
  const audioProcessingRef = useRef(null);

  useEffect(() => {
    const newPlayer = new Tone.Player().toDestination();
    const newFilters = frequencies.map((freq) => {
      const filter = new Tone.Filter({
        type: 'peaking',
        frequency: freq,
        Q: 1,
        gain: 0,
      });
      return filter;
    });

    const newPitchShift = new Tone.PitchShift({
      pitch: 0,
      windowSize: 0.1,
      delayTime: 0,
      feedback: 0,
    }).toDestination();

    newPlayer.chain(...newFilters, newPitchShift, Tone.Destination);

    const analyser = new Tone.Analyser('waveform', 1024);
    newPlayer.connect(analyser);
    analyserRef.current = analyser;

    setPlayer(newPlayer);
    setFilters(newFilters);
    setPitchShift(newPitchShift);
  }, []);

  useEffect(() => {
    const startAudioContext = async () => {
      if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log('Audio context started.');
      }
    };
    startAudioContext();
  }, []);

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const analyser = analyserRef.current;

      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      if (!audioBuffer) {
        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        const channelData = audioBuffer.getChannelData(0);
        const step = Math.ceil(channelData.length / width);
        const amp = height / 2;

        ctx.beginPath();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;

        for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = channelData[(i * step) + j] || 0;
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          const x = i;
          const y = (1 + min) * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        for (let i = 0; i < width; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = channelData[(i * step) + j] || 0;
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          const x = i;
          const y = (1 + max) * amp;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (mode === 'trim' && trimStart !== trimEnd) {
        const start = Math.min(trimStart, trimEnd);
        const end = Math.max(trimStart, trimEnd);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(start * width, 0, (end - start) * width, height);
      }

      requestAnimationFrame(drawWaveform);
    };
    drawWaveform();
  }, [mode, trimStart, trimEnd, audioBuffer]);

  useEffect(() => {
    if (player) player.volume.value = volume;
  }, [volume, player]);

  useEffect(() => {
    if (player) player.playbackRate = playbackRate;
  }, [playbackRate, player]);

  useEffect(() => {
    if (pitchShift) pitchShift.pitch = pitch;
  }, [pitch, pitchShift]);

  const analyzeTrackFrequencies = async (buffer) => {
    if (!buffer) return;

    try {
      const tempPlayer = new Tone.Player(buffer).toDestination();
      const fft = new Tone.FFT(2048);
      tempPlayer.connect(fft);

      tempPlayer.start();
      await Tone.context.setTimeout(() => {
        tempPlayer.stop();
      }, 0.1);

      const fftData = fft.getValue();
      const sampleRate = buffer.sampleRate;
      const fftSize = 2048;
      const freqBinSize = sampleRate / fftSize;

      const initialEqValues = new Array(frequencies.length).fill(0);

      frequencies.forEach((freq, index) => {
        const lowerBound = index === 0 ? 0 : (frequencies[index - 1] + freq) / 2;
        const upperBound = index === frequencies.length - 1 ? sampleRate / 2 : (frequencies[index + 1] + freq) / 2;

        const startBin = Math.floor(lowerBound / freqBinSize);
        const endBin = Math.floor(upperBound / freqBinSize);

        let sum = 0;
        let count = 0;
        for (let i = startBin; i <= endBin && i < fftData.length; i++) {
          sum += fftData[i];
          count++;
        }
        const avgAmplitude = count > 0 ? sum / count : 0;

        const normalizedValue = Math.max(-30, Math.min(30, avgAmplitude + 30));
        initialEqValues[index] = normalizedValue;
      });

      setEqValues(initialEqValues);
      initialEqValues.forEach((value, index) => {
        if (filters[index]) filters[index].gain.value = value;
      });

      tempPlayer.dispose();
      fft.dispose();
    } catch (error) {
      console.error('Ошибка в analyzeTrackFrequencies:', error);
      setError('Ошибка анализа частот: ' + error.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        if (Tone.context.state !== 'running') {
          await Tone.start();
          console.log('Audio context started.');
        }

        const url = URL.createObjectURL(file);
        await player.load(url);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = Tone.context;
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Buffer loaded:', buffer);

        setAudioBuffer(buffer);
        setOriginalAudioBuffer(buffer);
        setTrimStart(0);
        setTrimEnd(1);
        positionRef.current = 0;
        setVolume(0);
        setPlaybackRate(1);
        setPitch(0);
        setError('');
        setFileSelected(true);

        console.log('Starting frequency analysis...');
        await analyzeTrackFrequencies(buffer);
        console.log('Frequency analysis completed.');
      } catch (error) {
        setError('Ошибка загрузки аудио: ' + error.message);
        console.error('Ошибка загрузки аудио:', error);
      }
    }
  };

  const adjustEQ = (index, value) => {
    if (!filters.length) return;
    const newValues = [...eqValues];
    newValues[index] = parseFloat(value);
    setEqValues(newValues);
    filters[index].gain.value = parseFloat(value);
  };

  const handlePlay = () => {
    if (player && player.state === 'stopped') {
      if (!isPlaying && !isPaused) {
        player.start(0);
        startTimeRef.current = Tone.now();
        setIsPlaying(true);
      } else if (isPaused) {
        player.start(Tone.now(), positionRef.current);
        startTimeRef.current = Tone.now() - positionRef.current;
        setIsPlaying(true);
        setIsPaused(false);
      }
    }
  };

  const handlePause = () => {
    if (player && isPlaying) {
      positionRef.current = Tone.now() - startTimeRef.current;
      player.stop();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (player) {
      player.stop();
      setIsPlaying(false);
      setIsPaused(false);
      positionRef.current = 0;
      startTimeRef.current = null;
    }
  };

  const handleMouseDown = (e) => {
    if (mode !== 'trim' || !audioBuffer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    setTrimStart(Math.max(0, Math.min(1, x)));
    setTrimEnd(Math.max(0, Math.min(1, x)));
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (mode !== 'trim' || !isDragging || !audioBuffer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    setTrimEnd(Math.max(0, Math.min(1, x)));
  };

  const handleMouseUp = () => {
    if (mode !== 'trim') return;
    setIsDragging(false);
    if (trimStart !== trimEnd) setIsTrimming(true);
  };

  const handleTrim = async () => {
    if (!audioBuffer || !isTrimming) return;

    try {
      const start = Math.min(trimStart, trimEnd);
      const end = Math.max(trimStart, trimEnd);
      const startSample = Math.floor(start * audioBuffer.length);
      const endSample = Math.floor(end * audioBuffer.length);
      const newLength = endSample - startSample;

      if (newLength <= 0) {
        console.error('Длина обрезанного участка должна быть больше 0');
        return;
      }

      const newBuffer = Tone.context.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        audioBuffer.sampleRate
      );

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const newChannelData = newBuffer.getChannelData(channel);
        for (let i = 0; i < newLength; i++) {
          newChannelData[i] = channelData[startSample + i];
        }
      }

      if (player.state === 'started') player.stop();

      const newPlayer = new Tone.Player(newBuffer).toDestination();
      newPlayer.chain(...filters, pitchShift, Tone.Destination);
      const analyser = new Tone.Analyser('waveform', 1024);
      newPlayer.connect(analyser);
      analyserRef.current = analyser;

      setPlayer(newPlayer);
      setAudioBuffer(newBuffer);
      setTrimStart(0);
      setTrimEnd(1);
      setIsTrimming(false);
      setIsPlaying(false);
      setIsPaused(false);
      positionRef.current = 0;
      startTimeRef.current = null;

      await analyzeTrackFrequencies(newBuffer);

      newPlayer.start(0);
      startTimeRef.current = Tone.now();
      setIsPlaying(true);
    } catch (error) {
      setError('Ошибка при обрезке аудио: ' + error.message);
      console.error('Ошибка при обрезке аудио:', error);
    }
  };

  const handleResetTrack = () => {
    if (!originalAudioBuffer) return;

    try {
      if (player.state === 'started') player.stop();

      const newPlayer = new Tone.Player(originalAudioBuffer).toDestination();
      newPlayer.chain(...filters, pitchShift, Tone.Destination);
      const analyser = new Tone.Analyser('waveform', 1024);
      newPlayer.connect(analyser);
      analyserRef.current = analyser;

      setPlayer(newPlayer);
      setAudioBuffer(originalAudioBuffer);
      setTrimStart(0);
      setTrimEnd(1);
      setIsTrimming(false);
      setIsPlaying(false);
      setIsPaused(false);
      positionRef.current = 0;
      startTimeRef.current = null;
      setVolume(0);
      setPlaybackRate(1);
      setPitch(0);

      analyzeTrackFrequencies(originalAudioBuffer);
    } catch (error) {
      setError('Ошибка при сбросе трека: ' + error.message);
      console.error('Ошибка при сбросе трека:', error);
    }
  };

  const handleRemoveTrack = () => {
    if (player) {
      if (player.state === 'started') player.stop();
      player.dispose();
    }

    const newPlayer = new Tone.Player().toDestination();
    newPlayer.chain(...filters, pitchShift, Tone.Destination);
    const analyser = new Tone.Analyser('waveform', 1024);
    newPlayer.connect(analyser);
    analyserRef.current = analyser;

    setPlayer(newPlayer);
    setAudioBuffer(null);
    setOriginalAudioBuffer(null);
    setTrimStart(0);
    setTrimEnd(1);
    setIsTrimming(false);
    setIsPlaying(false);
    setIsPaused(false);
    positionRef.current = 0;
    startTimeRef.current = null;
    setVolume(0);
    setPlaybackRate(1);
    setPitch(0);
    setEqValues(Array(frequencies.length).fill(0));
    setFileSelected(false);
    setError('');
  };

  const presets = {
    default: Array(frequencies.length).fill(0),
    classical: [-2, -1, 0, 2, 4, 6, 4, 2, 0, -2],
    dance: [6, 4, 2, 0, -2, -4, 0, 2, 4, 6],
    club: [0, 0, 2, 4, 6, 6, 4, 2, 0, 0],
    boost: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  };

  const applyPreset = (presetName) => {
    const newValues = presets[presetName];
    setEqValues(newValues);
    newValues.forEach((value, index) => {
      if (filters[index]) filters[index].gain.value = value;
    });
  };

  const handleModeClick = (newMode) => {
    // Переключаем режим
    setActiveMode(activeMode === newMode ? null : newMode);
    setMode(newMode);

    // Плавная прокрутка к блоку audioProcessingSection
    if (audioProcessingRef.current) {
      audioProcessingRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackRate(newSpeed);
  };

  const handlePitchChange = (e) => {
    const newPitch = parseFloat(e.target.value);
    setPitch(newPitch);
  };

  const handleSaveAudio = async () => {
    if (!audioBuffer) {
      setError('Нет обработанного аудио для сохранения');
      return;
    }

    try {
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      const filterNodes = frequencies.map((freq, index) => {
        const filter = offlineContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = eqValues[index];
        return filter;
      });

      const gainNode = offlineContext.createGain();
      gainNode.gain.value = Math.pow(10, volume / 20);

      source.connect(filterNodes[0]);
      filterNodes.reduce((prev, curr) => {
        prev.connect(curr);
        return curr;
      });
      filterNodes[filterNodes.length - 1].connect(gainNode);
      gainNode.connect(offlineContext.destination);

      source.start(0);
      const renderedBuffer = await offlineContext.startRendering();
      const blob = await bufferToWave(renderedBuffer, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `processed_audio.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError('');
    } catch (err) {
      setError('Ошибка при сохранении аудио: ' + err.message);
      console.error('Ошибка при сохранении аудио:', err);
    }
  };

  const bufferToWave = (buffer, format) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    let offset = 0;
    writeString(view, offset, 'RIFF');
    offset += 4;
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true);
    offset += 4;
    writeString(view, offset, 'WAVE');
    offset += 4;
    writeString(view, offset, 'fmt ');
    offset += 4;
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numOfChan, true);
    offset += 2;
    view.setUint32(offset, buffer.sampleRate, true);
    offset += 4;
    view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true);
    offset += 4;
    view.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString(view, offset, 'data');
    offset += 4;
    view.setUint32(offset, buffer.length * numOfChan * 2, true);
    offset += 4;

    const samples = [];
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChan; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        samples.push(sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
      }
    }

    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset, samples[i], true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: format === 'MP3' ? 'audio/mpeg' : 'audio/wav' });
  };

  return (
    <div className="container">
      <div className="welcomeSection">
        <div className="contai">
          <h1 className="t1">Добро пожаловать на страницу обработки</h1>
          <h3 className="t2">Тонкая визуальная настройка звукового спектра</h3>
        </div>
        <div className="welcomeContent">
          <div className="contai1">
            <h2 className="t3">Попробуй функции</h2>
          </div>
          <div className="contai2">
            <img
              src={eqVolumeGif}
              alt="Используй эквалайзер"
              className="eqVolumeGif"
              onClick={() => handleModeClick('equalizer')} // Добавляем обработчик для GIF
              style={{ cursor: 'pointer' }} // Добавляем курсор, чтобы показать, что это кликабельно
            />
            <p className="t4">Используй эквалайзер</p>
            <Link to='/track-separation'>
              <img src={musicWaveGif} alt="Сгенерируй свой звук" className="musicWaveGif" />
            </Link>
            <p className="t5">Сгенерируй свой звук</p>
          </div>
        </div>
      </div>

      <div className="audioProcessingSection" ref={audioProcessingRef}>
        <h2>Обработка аудио</h2>
        <div className="file-upload-container">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            id="audio-upload"
            className="audio-upload-input"
          />
          <label htmlFor="audio-upload" className="audio-upload-label">
            {fileSelected ? 'Файл загружен' : 'Выберите файл'}
          </label>
          {fileSelected && (
            <button onClick={handleRemoveTrack} className="deleteButton">
              🗑️
            </button>
          )}
        </div>
        {error && <p className="error">{error}</p>}

        {audioBuffer && (
          <canvas
            ref={canvasRef}
            width="800"
            height="100"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        )}

        <div className="mode-controls">
          <div className={`mode-item ${activeMode === 'trim' ? 'active' : ''}`} onClick={() => handleModeClick('trim')}>
            <div className="mode-icon">
              <img src={trimIcon} alt="Обрезка" className={activeMode === 'trim' ? 'active' : ''} />
            </div>
            <span className="mode-text">Обрезка</span>
          </div>
          <div
            className={`mode-item ${activeMode === 'volume' ? 'active' : ''}`}
            onClick={() => handleModeClick('volume')}
          >
            <div className="mode-icon">
              <img src={volumeIcon} alt="Понижение громкости" className={activeMode === 'volume' ? 'active' : ''} />
            </div>
            <span className="mode-text">Понижение громкости</span>
          </div>
          <div
            className={`mode-item ${activeMode === 'speed' ? 'active' : ''}`}
            onClick={() => handleModeClick('speed')}
          >
            <div className="mode-icon">
              <img src={speedIcon} alt="Ускорение трека" className={activeMode === 'speed' ? 'active' : ''} />
            </div>
            <span className="mode-text">Ускорение трека</span>
          </div>
          <div
            className={`mode-item ${activeMode === 'pitch' ? 'active' : ''}`}
            onClick={() => handleModeClick('pitch')}
          >
            <div className="mode-icon">
              <img src={pitchIcon} alt="Тональность" className={activeMode === 'pitch' ? 'active' : ''} />
            </div>
            <span className="mode-text">Тональность</span>
          </div>
          <div
            className={`mode-item ${activeMode === 'equalizer' ? 'active' : ''}`}
            onClick={() => handleModeClick('equalizer')}
          >
            <div className="mode-icon">
              <img src={equalizerIcon} alt="Эквалайзер" className={activeMode === 'equalizer' ? 'active' : ''} />
            </div>
            <span className="mode-text">Эквалайзер</span>
          </div>
        </div>

        {activeMode && (
          <>
            {mode === 'equalizer' && (
              <div className="equalizer-section">
                <div className="preset-controls">
                  <span
                    onClick={() => applyPreset('default')}
                    style={{ cursor: 'pointer' }}
                    className="t15"
                  >
                    По умолчанию
                  </span>
                  <span
                    onClick={() => applyPreset('classical')}
                    style={{ cursor: 'pointer' }}
                    className="t16"
                  >
                    Классика
                  </span>
                  <span
                    onClick={() => applyPreset('dance')}
                    style={{ cursor: 'pointer' }}
                    className="t17"
                  >
                    Танцевальная
                  </span>
                  <span
                    onClick={() => applyPreset('club')}
                    style={{ cursor: 'pointer' }}
                    className="t18"
                  >
                    Клуб микс
                  </span>
                  <span
                    onClick={() => applyPreset('boost')}
                    style={{ cursor: 'pointer' }}
                    className="t19"
                  >
                    Усиление
                  </span>
                </div>

                <div className="equalizer-controls">
                  {frequencies.map((freq, index) => (
                    <div key={freq} className="eq-band">
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="0.1"
                        value={eqValues[index]}
                        onChange={(e) => adjustEQ(index, e.target.value)}
                        orient="vertical"
                        aria-label={`Adjust gain for ${freq} Hz`}
                      />
                      <label>{freq} Hz</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'trim' && (
              <div className="trim-controls">
                <button onClick={handleTrim} disabled={!isTrimming} className="neonButton">
                  Применить обрезку
                </button>
                <button onClick={handleResetTrack} disabled={!audioBuffer} className="neonButton">
                  Сбросить трек
                </button>
              </div>
            )}

            {mode === 'volume' && (
              <div className="volume-controls">
                <label>Громкость: {Math.round(volume)} dB</label>
                <input
                  type="range"
                  min="-60"
                  max="0"
                  step="1"
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label="Adjust volume"
                />
              </div>
            )}

            {mode === 'speed' && (
              <div className="speed-controls">
                <label>Скорость: {playbackRate.toFixed(2)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={playbackRate}
                  onChange={handleSpeedChange}
                  aria-label="Adjust playback speed"
                />
              </div>
            )}

            {mode === 'pitch' && (
              <div className="pitch-controls">
                <label>Тональность: {pitch} полутонов</label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={pitch}
                  onChange={handlePitchChange}
                  aria-label="Adjust pitch"
                />
              </div>
            )}

            <div className="audio-controls">
              <div className="control-group-left">
                <button
                  onClick={handlePlay}
                  disabled={isPlaying && !isPaused}
                  className="play"
                >
                  Играть
                </button>
                <button onClick={handlePause} disabled={!isPlaying} className="pause">
                  Пауза
                </button>
                <button
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                  className="stop"
                >
                  Стоп
                </button>
              </div>
              <div className="control-group-right">
                <button
                  onClick={() => setFormat(format === 'MP3' ? 'WAV' : 'MP3')}
                  className="formatButton"
                >
                  {format}
                </button>
                <button
                  onClick={handleSaveAudio}
                  disabled={!audioBuffer}
                  className="saveButton"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="frequencySection">
        <p className="t8">Изменяйте частоты для получения персонализированного звучания</p>
        <div className="cont5">
          <div className="bass">
            <img src={guitarIcon} alt="bass" className="guitarIcon" />
            <p className="t9">Bass</p>
            <p className="t10">Отрегулируйте низкие частоты для получения громких ударов</p>
          </div>
          <div className="treble">
            <img src={boomBoxIcon} alt="treble" className="boomBoxIcon" />
            <p className="t11">Treble</p>
            <p className="t12">Усиление высоких нот для получения четкого звучания</p>
          </div>
          <div className="midr">
            <img src={midRangeIcon} alt="mid range" className="midRangeIcon" />
            <p className="t13">Mid Range</p>
            <p className="t14">Контролируйте средние частоты для сбалансированного звучания</p>
          </div>
        </div>
      </div>

      <div className="mixerSection">
        <div className="mixerContent">
          <img src={mixerBanner} alt="Микшер" className="mixerBanner" />
          <div className="mixerText">
            <p className="t6">Готовы к Mix & Track?</p>
            <p className="t7">Перейдите на страницу сведения и треков</p>
          </div>
          <Link to="/audio-enhancement">
            <button className="button1">Попробовать</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EqualizerCube;