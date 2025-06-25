import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as Tone from 'tone';
import WaveSurfer from 'wavesurfer.js';
import lamejs from 'lamejs';
import * as musicMetadata from 'music-metadata-browser';
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

const EqualizerCube = () => {
  const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const [player, setPlayer] = useState(null);
  const [filters, setFilters] = useState([]);
  const [pitchShift, setPitchShift] = useState(null);
  const [eqValues, setEqValues] = useState(Array(frequencies.length).fill(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const analyserRef = useRef(null);
  const wavesurferRef = useRef(null);
  const waveformContainerRef = useRef(null);
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
  const [format, setFormat] = useState('WAV');
  const [error, setError] = useState('');
  const [fileSelected, setFileSelected] = useState(false);
  const [trackName, setTrackName] = useState('');
  const audioProcessingRef = useRef(null);

  // Максимальный размер файла (100 МБ)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB in bytes

  // Функция для санирования имени файла
  const sanitizeFileName = (name) => {
    return name
      .replace(/[<>"';&]/g, '') // Удаляем потенциально опасные символы
      .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
      .slice(0, 100); // Ограничиваем длину имени
  };

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

    return () => {
      newPlayer.dispose();
      newFilters.forEach(filter => filter.dispose());
      newPitchShift.dispose();
      if (analyser) analyser.dispose();
    };
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
    if (!audioBuffer || !waveformContainerRef.current) return;

    try {
      const wavesurfer = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: 'violet',
        progressColor: 'purple',
        cursorColor: 'white',
        barWidth: 2,
        height: 100,
        responsive: true,
      });

      wavesurferRef.current = wavesurfer;

      const blob = bufferToWave(audioBuffer);
      if (blob) {
        wavesurfer.loadBlob(blob);
      } else {
        throw new Error('Не удалось создать WAV Blob');
      }

      wavesurfer.on('interaction', (time) => {
        if (!audioBuffer) return;
        const duration = audioBuffer.duration;
        const position = Math.max(0, Math.min(1, time / duration));

        if (mode === 'trim') {
          if (!isDragging) {
            setTrimStart(position);
            setTrimEnd(position);
            setIsDragging(true);
          } else {
            setTrimEnd(position);
          }
        } else {
          handleSeek(position * duration, true);
        }
      });

      wavesurfer.on('error', (err) => {
        console.error('WaveSurfer ошибка:', err);
        setError('Ошибка WaveSurfer: ' + err.message);
      });

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
      };
    } catch (err) {
      console.error('Ошибка инициализации WaveSurfer:', err);
      setError('Ошибка инициализации WaveSurfer: ' + err.message);
    }
  }, [audioBuffer, mode]);

  useEffect(() => {
    if (!isPlaying || !wavesurferRef.current || !startTimeRef.current) return;

    const updateWaveformPosition = () => {
      if (!wavesurferRef.current || !audioBuffer) return;
      const currentTime = Tone.now() - startTimeRef.current;
      const duration = audioBuffer.duration;
      if (currentTime <= duration) {
        wavesurferRef.current.seekTo(currentTime / duration);
      } else if (isPlaying) {
        handleStop();
      }
    };

    const interval = setInterval(updateWaveformPosition, 100);
    return () => clearInterval(interval);
  }, [isPlaying, audioBuffer]);

  useEffect(() => {
    if (player) {
      player.volume.value = volume;
    }
  }, [volume, player]);

  useEffect(() => {
    if (player) {
      player.playbackRate = playbackRate;
    }
  }, [playbackRate, player]);

  useEffect(() => {
    if (pitchShift) {
      pitchShift.pitch = pitch;
    }
  }, [pitch, pitchShift]);

  const handleSeek = async (seekTime, shouldPlay = false) => {
    if (!player || !audioBuffer) return;

    const duration = audioBuffer.duration;
    if (seekTime < 0 || seekTime > duration) return;

    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      if (player.state === 'started') {
        player.stop();
      }

      positionRef.current = seekTime;
      startTimeRef.current = Tone.now() - seekTime;

      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(seekTime / duration);
      }

      if (shouldPlay || isPlaying || isPaused) {
        player.start(Tone.now(), seekTime);
        setIsPlaying(true);
        setIsPaused(false);
      }
    } catch (error) {
      console.error('Ошибка в handleSeek:', error);
      setError('Ошибка перемотки: ' + error.message);
    }
  };

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

  const validateAudioFile = (file) => {
    return new Promise((resolve, reject) => {
      // Проверка размера файла
      if (file.size > MAX_FILE_SIZE) {
        console.error('Ошибка: Файл слишком большой', { size: file.size });
        reject(new Error('Файл слишком большой. Максимальный размер: 100 МБ.'));
        return;
      }
  
      // Проверка MIME-типа и расширения
      const validMimeTypes = ['audio/mpeg', 'audio/wav', 'application/octet-stream'];
      const validExtensions = ['.mp3', '.wav'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const isMimeValid = validMimeTypes.includes(file.type) || file.type === '';
      const isExtensionValid = validExtensions.includes(fileExtension);
  
      if (!isMimeValid || !isExtensionValid) {
        console.error('Ошибка: Неподдерживаемый формат', {
          mimeType: file.type,
          extension: fileExtension,
        });
        reject(new Error('Неподдерживаемый формат файла. Используйте WAV или MP3.'));
        return;
      }
  
      // Проверка с music-metadata-browser
      musicMetadata.parseBlob(file, { duration: false, native: true }).then(metadata => {
        const format = metadata.format;
        console.log('Метаданные файла:', { container: format.container });
        if (['mpeg', 'wav'].includes(format.container?.toLowerCase())) {
          resolve(true);
        } else {
          console.error('Ошибка: Неподдерживаемый контейнер', { container: format.container });
          reject(new Error('Файл не является валидным аудиофайлом (MP3 или WAV).'));
        }
      }).catch(error => {
        console.error('Ошибка проверки метаданных:', error);
        // Запасной вариант: проверка заголовков
        const reader = new FileReader();
        reader.onload = (e) => {
          const buffer = e.target.result;
          const view = new DataView(buffer);
  
          // Проверка WAV (RIFF)
          const isWav =
            view.getUint8(0) === 0x52 && // R
            view.getUint8(1) === 0x49 && // I
            view.getUint8(2) === 0x46 && // F
            view.getUint8(3) === 0x46;   // F
  
          // Проверка MP3 (ID3 или синхронизация фрейма)
          const isMp3 =
            (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) || // ID3
            (view.getUint8(0) === 0xFF && (view.getUint8(1) & 0xE0) === 0xE0); // MP3 frame sync
  
          if (isWav && fileExtension === '.wav') {
            console.log('Файл подтверждён как WAV по заголовку RIFF');
            resolve(true);
          } else if (isMp3 && fileExtension === '.mp3') {
            console.log('Файл подтверждён как MP3 по заголовку ID3 или фрейму');
            resolve(true);
          } else {
            console.error('Ошибка: Файл не является WAV или MP3', {
              firstBytes: Array.from(new Uint8Array(buffer).slice(0, 4)),
              extension: fileExtension,
            });
            reject(new Error('Файл не является валидным аудиофайлом (MP3 или WAV).'));
          }
        };
        reader.onerror = () => {
          console.error('Ошибка чтения файла');
          reject(new Error('Ошибка чтения файла.'));
        };
        reader.readAsArrayBuffer(file.slice(0, 128)); // Читаем первые 128 байт
      });
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setError('Выберите аудиофайл');
      return;
    }

    let url = null;

    try {
      // Проверка файла
      await validateAudioFile(file);

      // Санируем имя файла
      const sanitizedName = sanitizeFileName(file.name);
      console.log('Загрузка файла:', { name: sanitizedName, type: file.type, size: file.size });

      // Определяем формат файла
      const extension = sanitizedName.split('.').pop().toLowerCase();
      const mimeType = file.type;
      let detectedFormat = 'WAV';
      if (extension === 'mp3' || mimeType === 'audio/mpeg') {
        detectedFormat = 'MP3';
      } else if (extension === 'wav' || mimeType === 'audio/wav') {
        detectedFormat = 'WAV';
      } else {
        throw new Error('Неподдерживаемый формат файла. Используйте WAV или MP3.');
      }
      setFormat(detectedFormat);

      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }

      url = URL.createObjectURL(file);
      await player.load(url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Не удалось загрузить файл');
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = Tone.context;
      const buffer = await audioContext.decodeAudioData(arrayBuffer);

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
      setTrackName(sanitizedName);

      await analyzeTrackFrequencies(buffer);
    } catch (error) {
      console.error('Ошибка загрузки аудио:', error);
      setError(error.message || 'Ошибка загрузки аудио');
      setFileSelected(false);
      setTrackName('');
      setFormat('WAV');
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
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

  const handlePlay = async () => {
    if (!player || !audioBuffer) return;

    if (player.state === 'stopped') {
      try {
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }

        if (!isPlaying && !isPaused) {
          player.start(0);
          startTimeRef.current = Tone.now();
          positionRef.current = 0;
          setIsPlaying(true);
          if (wavesurferRef.current) {
            wavesurferRef.current.seekTo(0);
          }
        } else if (isPaused) {
          player.start(Tone.now(), positionRef.current);
          startTimeRef.current = Tone.now() - positionRef.current;
          setIsPlaying(true);
          setIsPaused(false);
          if (wavesurferRef.current) {
            wavesurferRef.current.seekTo(positionRef.current / audioBuffer.duration);
          }
        }
      } catch (error) {
        console.error('Ошибка в handlePlay:', error);
        setError('Ошибка воспроизведения: ' + error.message);
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
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(0);
      }
    }
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
        setError('Длина обрезки должна быть больше 0');
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
      newPlayer.volume.value = volume;
      newPlayer.playbackRate = playbackRate;
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

      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }

      await analyzeTrackFrequencies(newBuffer);
    } catch (error) {
      console.error('Ошибка при обрезке аудио:', error);
      setError('Ошибка при обрезке аудио: ' + error.message);
    }
  };

  const handleResetTrack = async () => {
    if (!originalAudioBuffer) {
      setError('Исходный трек недоступен');
      return;
    }

    try {
      if (player.state === 'started') player.stop();

      const newPlayer = new Tone.Player(originalAudioBuffer).toDestination();
      newPlayer.chain(...filters, pitchShift, Tone.Destination);
      newPlayer.volume.value = 0;
      newPlayer.playbackRate = 1;
      const analyser = new Tone.Analyser('waveform', 1024);
      newPlayer.connect(analyser);
      analyserRef.current = analyser;

      setVolume(0);
      setPlaybackRate(1);
      setPitch(0);
      setEqValues(Array(frequencies.length).fill(0));
      filters.forEach((filter) => (filter.gain.value = 0));
      if (pitchShift) pitchShift.pitch = 0;
      setTrimStart(0);
      setTrimEnd(1);
      setIsTrimming(false);
      setIsPlaying(false);
      setIsPaused(false);
      positionRef.current = 0;
      startTimeRef.current = null;

      setPlayer(newPlayer);
      setAudioBuffer(null);
      setTimeout(() => {
        setAudioBuffer(originalAudioBuffer);
      }, 0);

      await analyzeTrackFrequencies(originalAudioBuffer);
    } catch (error) {
      console.error('Ошибка при сбросе трека:', error);
      setError('Ошибка при сбросе трека: ' + error.message);
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

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

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
    setTrackName('');
    setFormat('WAV');
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
    setActiveMode(activeMode === newMode ? null : newMode);
    setMode(newMode);

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

  const handleFormatToggle = () => {
    setFormat(format === 'WAV' ? 'MP3' : 'WAV');
  };

  const bufferToWave = (buffer) => {
    try {
      if (!buffer || buffer.length === 0 || !buffer.numberOfChannels || !buffer.sampleRate) {
        throw new Error('Невалидный аудио буфер');
      }

      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2;
      const arrayBuffer = new ArrayBuffer(44 + length);
      const view = new DataView(arrayBuffer);

      const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + length, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numOfChan, true);
      view.setUint32(24, buffer.sampleRate, true);
      view.setUint32(28, buffer.sampleRate * numOfChan * 2, true);
      view.setUint16(32, numOfChan * 2, true);
      view.setUint16(34, 16, true);
      writeString(view, 36, 'data');
      view.setUint32(40, length, true);

      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numOfChan; channel++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
          const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, value, true);
          offset += 2;
        }
      }

      return new Blob([arrayBuffer], { type: 'audio/wav' });
    } catch (error) {
      console.error('Ошибка в bufferToWave:', error);
      setError('Ошибка создания WAV: ' + error.message);
      return null;
    }
  };

  const bufferToMp3 = (buffer) => {
    try {
      if (!buffer || buffer.length === 0 || !buffer.numberOfChannels || !buffer.sampleRate) {
        throw new Error('Невалидный аудио буфер');
      }

      const numOfChan = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const mp3encoder = new lamejs.Mp3Encoder(numOfChan, sampleRate, 128);
      const samplesPerChannel = buffer.length;
      const mp3Data = [];

      const left = new Int16Array(samplesPerChannel);
      const right = numOfChan === 2 ? new Int16Array(samplesPerChannel) : null;

      for (let i = 0; i < samplesPerChannel; i++) {
        left[i] = Math.max(-1, Math.min(1, buffer.getChannelData(0)[i])) * 0x7FFF;
        if (numOfChan === 2) {
          right[i] = Math.max(-1, Math.min(1, buffer.getChannelData(1)[i])) * 0x7FFF;
        }
      }

      const sampleBlockSize = 1152;
      for (let i = 0; i < samplesPerChannel; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize);
        const rightChunk = right ? right.subarray(i, i + sampleBlockSize) : leftChunk;
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
      return mp3Blob;
    } catch (error) {
      console.error('Ошибка в bufferToMp3:', error);
      setError('Ошибка создания MP3: ' + error.message);
      return null;
    }
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
      source.playbackRate.value = playbackRate;

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

      let blob;
      let fileName;

      if (format === 'MP3') {
        blob = bufferToMp3(renderedBuffer);
        fileName = 'processed_audio.mp3';
      } else {
        blob = bufferToWave(renderedBuffer);
        fileName = 'processed_audio.wav';
      }

      if (!blob) {
        throw new Error(`Не удалось создать файл в формате ${format}`);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError('');
    } catch (error) {
      console.error('Ошибка при сохранении аудио:', error);
      setError('Ошибка при сохранении аудио: ' + error.message);
    }
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
              onClick={() => handleModeClick('equalizer')}
              style={{ cursor: 'pointer' }}
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
            accept="audio/mpeg,audio/wav"
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
          <div className="trackItem">
            {trackName && <p className="trackTitle">{trackName}</p>}
            <div ref={waveformContainerRef} className="waveform" onMouseUp={handleMouseUp} />
          </div>
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
              <img src={pitchIcon} alt="Изменение высоты тона" className={activeMode === 'pitch' ? 'active' : ''} />
            </div>
            <span className="mode-text">Изменение высоты тона</span>
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

        {activeMode === 'equalizer' && (
          <div className="equalizer-section">
            <div className="preset-controls">
              <button className="t15" onClick={() => applyPreset('default')}>
                Default
              </button>
              <button className="t16" onClick={() => applyPreset('classical')}>
                Classical
              </button>
              <button className="t17" onClick={() => applyPreset('dance')}>
                Dance
              </button>
              <button className="t18" onClick={() => applyPreset('club')}>
                Club
              </button>
              <button className="t19" onClick={() => applyPreset('boost')}>
                Boost
              </button>
            </div>
            <div className="equalizer-controls">
              {frequencies.map((freq, index) => (
                <div key={freq} className="eq-band">
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={eqValues[index]}
                    onChange={(e) => adjustEQ(index, e.target.value)}
                  />
                  <label>{freq} Hz</label>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'trim' && (
          <div className="trim-controls">
            <button className="neonButton" onClick={handleTrim}>
              Применить обрезку
            </button>
          </div>
        )}

        {activeMode === 'volume' && (
          <div className="volume-controls">
            <input
              type="range"
              min="-60"
              max="12"
              value={volume}
              onChange={handleVolumeChange}
            />
            <span>{volume.toFixed(1)} dB</span>
          </div>
        )}

        {activeMode === 'speed' && (
          <div className="speed-controls">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={playbackRate}
              onChange={handleSpeedChange}
            />
            <span>{playbackRate.toFixed(1)}x</span>
          </div>
        )}

        {activeMode === 'pitch' && (
          <div className="pitch-controls">
            <input
              type="range"
              min="-12"
              max="12"
              value={pitch}
              onChange={handlePitchChange}
            />
            <span>{pitch} semitones</span>
          </div>
        )}

        <div className="audio-controls">
          <div className="control-group-left">
            <button className="play" onClick={handlePlay}>
              Воспроизвести
            </button>
            <button className="pause" onClick={handlePause}>
              Пауза
            </button>
            <button className="stop" onClick={handleStop}>
              Стоп
            </button>
            <button className="resetButton" onClick={handleResetTrack}>
              Сбросить всё
            </button>
          </div>
          <div className="control-group-right">
            <button className="formatButton" onClick={handleFormatToggle}>
              {format}
            </button>
            <button className="saveButton" onClick={handleSaveAudio}>
              Сохранить
            </button>
          </div>
        </div>
      </div>

      <div className="frequencySection">
        <h2 className="t8">Частотные диапазоны</h2>
        <div className="cont5">
          <div className="bass">
            <img src={boomBoxIcon} alt="Bass" className="boomBoxIcon" />
            <h3 className="t9">Bass</h3>
            <p className="t10">Низкие частоты (20-250 Hz)</p>
          </div>
          <div className="midr">
            <img src={midRangeIcon} alt="Mid Range" className="midRangeIcon" />
            <h3 className="t11">Mid Range</h3>
            <p className="t12">Средние частоты (250 Hz-4 kHz)</p>
          </div>
          <div className="treble">
            <img src={guitarIcon} alt="Treble" className="guitarIcon" />
            <h3 className="t13">Treble</h3>
            <p className="t14">Высокие частоты (4 kHz-20 kHz)</p>
          </div>
        </div>
      </div>

      <div className="mixerSection">
        <div className="mixerContent">
          <img src={mixerBanner} alt="Mixer Banner" className="mixerBanner" />
          <div className="mixerText">
            <h2 className="t6">Попробуй функцию сведения</h2>
            <p className="t7">Используй наш микшер для создания уникального звучания</p>
          </div>
          <Link to="/audio-enhancement">
            <button className="button1">Создать сейчас</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EqualizerCube;