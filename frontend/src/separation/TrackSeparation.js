import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import WaveSurfer from 'wavesurfer.js';
import '../style/trackSeparation.css';
import icon1 from '../assets/icons_music.png';
import icon2 from '../assets/icons_gen.png';
import { API_BASE_URL } from '../config';

const CustomRangeSlider = ({ trackId, defaultValue, onVolumeChange }) => {
  const sliderRef = useRef(null);

  const handleMove = (clientX) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const value = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      sliderRef.current.value = value;
      onVolumeChange(trackId, value);
      console.log(`Кастомный ползунок ${trackId}: значение ${value}, clientX: ${clientX}, rect: ${rect.left}-${rect.right}`);
    } else {
      console.error(`sliderRef для ${trackId} не найден`);
    }
  };

  const handleMouseDown = (e) => {
    console.log(`MouseDown для ${trackId}`);
    handleMove(e.clientX);
    const moveHandler = (moveEvent) => handleMove(moveEvent.clientX);
    const upHandler = () => {
      console.log(`MouseUp для ${trackId}`);
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    console.log(`TouchStart для ${trackId}, touches: ${e.touches.length}`);
    handleMove(e.touches[0].clientX);
    const moveHandler = (moveEvent) => {
      console.log(`TouchMove для ${trackId}`);
      handleMove(moveEvent.touches[0].clientX);
    };
    const endHandler = () => {
      console.log(`TouchEnd для ${trackId}`);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };
    document.addEventListener('touchmove', moveHandler);
    document.addEventListener('touchend', endHandler);
  };

  return (
    <input
      ref={sliderRef}
      id={`volume-${trackId}`}
      className="range-slider"
      type="range"
      min="0"
      max="100"
      defaultValue={defaultValue}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onChange={(e) => onVolumeChange(trackId, e.target.value)}
      onInput={(e) => onVolumeChange(trackId, e.target.value)}
    />
  );
};

const TrackSeparation = () => {
  const [file, setFile] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null); // null, 'queued', 'processing'
  const [isPlaying, setIsPlaying] = useState({});
  const [activeMode, setActiveMode] = useState(null);
  const wavesurferRefs = useRef({});

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError(null);
    setTracks([]);
    setIsPlaying({});
    setQueueStatus(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError(new Error('Пожалуйста, выберите файл для обработки.'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);
    setQueueStatus('queued');

    try {
      const queueResponse = await axios.get(`${API_BASE_URL}/api/check-queue/`);
      console.log('Статус очереди:', queueResponse.data);
      if (queueResponse.data.status === 'busy') {
        const checkQueue = async () => {
          const poll = setInterval(async () => {
            try {
              const pollResponse = await axios.get(`${API_BASE_URL}/api/check-queue/`);
              if (pollResponse.data.status === 'free') {
                clearInterval(poll);
                setQueueStatus('processing');
                processFile(formData);
              }
            } catch (err) {
              console.error('Ошибка проверки очереди:', err);
              clearInterval(poll);
              setError(new Error('Ошибка при ожидании очереди.'));
              setLoading(false);
              setQueueStatus(null);
            }
          }, 2000);
        };
        checkQueue();
      } else {
        setQueueStatus('processing');
        processFile(formData);
      }
    } catch (error) {
      console.error('Ошибка проверки очереди:', error);
      setError(new Error('Произошла ошибка при проверке очереди: ' + error.message));
      setLoading(false);
      setQueueStatus(null);
    }
  };

  const processFile = async (formData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/separate/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Ответ от /api/separate/:', response.data);
      if (response.data.tracks && response.data.tracks.length > 0) {
        setTracks(response.data.tracks);
      } else {
        setError(new Error('Не удалось найти треки в ответе от сервера.'));
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      setError(new Error('Произошла ошибка при обработке файла: ' + error.message));
    } finally {
      setLoading(false);
      setQueueStatus(null);
    }
  };

  const handleGenerateSound = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/generate/`);
      console.log('Ответ от /api/generate/:', response.data);
      if (response.data.tracks && response.data.tracks.length > 0) {
        setTracks((prev) => [...prev, ...response.data.tracks]);
      } else {
        setError(new Error('Сервер вернул пустой список треков.'));
      }
    } catch (error) {
      console.error('Ошибка генерации звука:', error);
      setError(new Error('Не удалось сгенерировать звук: ' + error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    tracks.forEach((track, index) => {
      const trackId = `track-${index}`;
      if (!wavesurferRefs.current[trackId]) {
        const wavesurfer = WaveSurfer.create({
          container: `#waveform-${trackId}`,
          waveColor: 'violet',
          progressColor: 'purple',
          cursorColor: 'white',
          barWidth: 2,
          height: 80,
          responsive: true,
          interact: true,
        });
        const filePath = track.filename.includes('generated')
          ? `${API_BASE_URL}/media/${track.filename}`
          : `${API_BASE_URL}/output/${track.filename}`;
        console.log(`Инициализация WaveSurfer для ${track.name}: ${filePath}`);
        wavesurfer.load(filePath);

        wavesurfer.on('ready', () => {
          console.log(`${track.name} готов к воспроизведению`);
          if (wavesurfer.backend && wavesurfer.backend.ac && wavesurfer.backend.ac.state === 'suspended') {
            wavesurfer.backend.ac.resume();
          }
        });
        wavesurfer.on('error', (err) => {
          console.error(`Ошибка WaveSurfer для ${track.name}:`, err);
          if (err.message.includes('AudioContext')) {
            console.warn('Проблема с AudioContext, требуется пользовательское взаимодействие');
          }
        });
        wavesurfer.on('play', () =>
          setIsPlaying((prev) => ({ ...prev, [trackId]: true }))
        );
        wavesurfer.on('pause', () =>
          setIsPlaying((prev) => ({ ...prev, [trackId]: false }))
        );
        wavesurfer.on('finish', () =>
          setIsPlaying((prev) => ({ ...prev, [trackId]: false }))
        );

        wavesurferRefs.current[trackId] = wavesurfer;
      }
    });

    return () => {
      Object.values(wavesurferRefs.current).forEach((wavesurfer) => wavesurfer.destroy());
      wavesurferRefs.current = {};
    };
  }, [tracks]);

  const handlePlayStop = (trackId) => {
    const wavesurfer = wavesurferRefs.current[trackId];
    if (wavesurfer) {
      if (isPlaying[trackId]) {
        wavesurfer.stop();
      } else {
        wavesurfer.play();
      }
    }
  };

  const handleVolumeChange = (trackId, value) => {
    const wavesurfer = wavesurferRefs.current[trackId];
    if (wavesurfer) {
      const volume = parseFloat(value) / 100;
      console.log(`Установка громкости для ${trackId}: ${volume}`);
      wavesurfer.setVolume(volume);
      console.log(`Текущая громкость ${trackId}: ${wavesurfer.getVolume()}`);
      if (wavesurfer.backend && wavesurfer.backend.ac && wavesurfer.backend.ac.state === 'suspended') {
        wavesurfer.backend.ac.resume().then(() => {
          wavesurfer.setVolume(volume);
          console.log(`Аудио-контекст возобновлён для ${trackId}`);
        });
      }
      if (wavesurfer.isPlaying()) {
        wavesurfer.play();
      }
    } else {
      console.error(`WaveSurfer для ${trackId} не найден`);
    }
  };

  const handleSwitchMode = (newMode) => {
    if (tracks.length > 0 || error) {
      const confirmSwitch = window.confirm(
        `Вы уверены, что хотите переключиться на "${newMode === 'separation' ? 'Разделение' : 'Генерацию'} "? Все текущие треки будут сброшены.`
      );
      if (!confirmSwitch) return;
    }

    setTracks([]);
    Object.values(wavesurferRefs.current).forEach((wavesurfer) => wavesurfer.destroy());
    wavesurferRefs.current = {};
    setIsPlaying({});
    setQueueStatus(null);

    if (newMode === 'separation' && error && error.message.includes('сгенерировать')) {
      setError(null);
    }
    setFile(null);
    setActiveMode(newMode);
  };

  return (
    <div className="container">
      {!activeMode && (
        <section className="modeSelection">
          <h2>Выберите режим</h2>
          <div className="modeButtons">
            <div
              className="modeButton separation"
              onClick={() => handleSwitchMode('separation')}
              title="Разделить трек"
            >
              <img src={icon1} alt="Separation" />
              <span>Разделение</span>
            </div>
            <div
              className="modeButton generation"
              onClick={() => handleSwitchMode('generation')}
              title="Сгенерировать звук"
            >
              <img src={icon2} alt="Generation" />
              <span>Генерация</span>
            </div>
          </div>
        </section>
      )}

      {activeMode === 'separation' && (
        <section className="uploadSection">
          <h2>Разделение треков</h2>
          <p>Загрузите аудиофайл и разделите его на отдельные дорожки</p>
          <form onSubmit={handleSubmit} className="form-group">
            <input type="file" accept=".mp3,.wav" onChange={handleFileChange} />
            <button type="submit" className="neonButton" disabled={loading}>
              Разделить трек
            </button>
          </form>
          <button
            onClick={() => handleSwitchMode('generation')}
            className="switchButton"
          >
            Перейти к генерации
          </button>
          {loading && queueStatus === 'queued' && (
            <p className="loading">Подождите, вы в очереди...</p>
          )}
          {loading && queueStatus === 'processing' && (
            <p className="loading">Идет обработка...</p>
          )}
          {error && <p className="error">{error.message}</p>}
        </section>
      )}

      {activeMode === 'generation' && (
        <section className="generationSection">
          <h2>Генерация звука</h2>
          <p>Создайте новый звук с помощью WaveGAN</p>
          <button onClick={handleGenerateSound} className="neonButton" disabled={loading}>
            Сгенерировать звук
          </button>
          <button
            onClick={() => handleSwitchMode('separation')}
            className="switchButton"
          >
            Перейти к разделению
          </button>
          {loading && <p className="loading">Идет обработка...</p>}
          {error && <p className="error">{error.message}</p>}
        </section>
      )}

      <section className={`librarySection ${tracks.length > 0 ? 'visible' : 'hidden'}`}>
        <h2>{activeMode === 'separation' ? 'Обработанные треки' : 'Сгенерированные звуки'}</h2>
        <p>Прослушайте и настройте треки</p>
        {tracks.length === 0 && !loading ? (
          <p>Треки не найдены</p>
        ) : (
          tracks.map((track, index) => {
            const trackId = `track-${index}`;
            const filePath = track.filename.includes('generated')
              ? `${API_BASE_URL}/media/${track.filename}`
              : `${API_BASE_URL}/output/${track.filename}`;
            return (
              <div key={index} className="trackItem">
                <h4>{track.name}</h4>
                <div id={`waveform-${trackId}`} className="waveform"></div>
                <div className="trackControls">
                  <button
                    onClick={() => handlePlayStop(trackId)}
                    className="playButton"
                  >
                    {isPlaying[trackId] ? '■' : '▶'}
                  </button>
                  <label htmlFor={`volume-${trackId}`}>Громкость:</label>
                  <CustomRangeSlider
                    trackId={trackId}
                    defaultValue="50"
                    onVolumeChange={handleVolumeChange}
                  />
                  <a
                    href={filePath}
                    download={`${track.name}.wav`}
                    className="saveButton"
                    title="Сохранить трек"
                    onClick={(e) => {
                      console.log(`Попытка скачать: ${filePath}`);
                      // Можно добавить проверку доступности файла
                      fetch(filePath)
                        .then((res) => {
                          if (!res.ok) {
                            e.preventDefault();
                            console.error(`Ошибка загрузки ${filePath}: ${res.status}`);
                            alert('Не удалось скачать трек');
                          }
                        })
                        .catch((err) => {
                          e.preventDefault();
                          console.error(`Ошибка fetch ${filePath}:`, err);
                          alert('Ошибка при скачивании трека');
                        });
                    }}
                  >
                    Сохранить
                  </a>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="featuresSection">
        <h2>Возможности</h2>
        <p>Разделяйте аудиофайлы на дорожки с помощью Spleeter или генерируйте новые звуки с WaveGAN.</p>
        <p>Управляйте воспроизведением и громкостью прямо в интерфейсе.</p>
      </section>
    </div>
  );
};

export default TrackSeparation;