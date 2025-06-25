import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import WaveSurfer from 'wavesurfer.js';
import { Modal, Button } from 'react-bootstrap';
import '../style/trackSeparation.css';
import icon1 from '../assets/icons_music.png';
import icon2 from '../assets/icons_gen.png';
import boostyIcon from '../assets/boosty_icon.png';
import loadingGif from '../assets/gif_file/cat.gif';
import saccess from '../assets/gif_file/save.gif';
import { API_BASE_URL } from '../config';

// Компонент модального окна
const LoadingModal = ({ show, queueStatus }) => {
  return (
    <Modal
      show={show}
      centered
      dialogClassName="loading-modal"
      backdropClassName="loading-modal-backdrop"
    >
      <div className="loading-modal-titlebar">Processing</div>
      <Modal.Body className="loading-modal-body">
        <img src={loadingGif} alt="Loading..." className="loading-gif" />
        <p className="neon-text">
          {queueStatus === 'queued' ? 'AI МАГИЯ СЕЙЧАС ЗАНЯТА, ПОДОЖДИТЕ...' : 'ПРОИСХОДИТ AI МАГИЯ'}
        </p>
      </Modal.Body>
    </Modal>
  );
};

const Notification = ({ show }) => {
  return (
    <div className={`notification ${show ? 'visible' : 'hidden'}`}>
      <img src={saccess} alt="Success Icon" className="notification-icon" />
      <p className="notification-text">Успешно обработано!</p>
    </div>
  );
};

const CustomRangeSlider = ({ trackId, defaultValue, onVolumeChange }) => {
  const sliderRef = useRef(null);

  const handleMove = (clientX) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const value = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      sliderRef.current.value = value;
      onVolumeChange(trackId, value);
    }
  };

  const handleMouseDown = (e) => {
    handleMove(e.clientX);
    const moveHandler = (moveEvent) => handleMove(moveEvent.clientX);
    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
    const moveHandler = (moveEvent) => handleMove(moveEvent.touches[0].clientX);
    const endHandler = () => {
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
  const [queueStatus, setQueueStatus] = useState(null);
  const [isPlaying, setIsPlaying] = useState({});
  const [activeMode, setActiveMode] = useState(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [nextMode, setNextMode] = useState(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const wavesurferRefs = useRef({});
  const [userId] = useState(Math.random().toString(36).substring(2, 15));

  const cleanupResources = useCallback(async () => {
    try {
      console.log('Очистка временных файлов для userId:', userId);
      await axios.post(`${API_BASE_URL}/api/cleanup/`, { user_id: userId });
      console.log('Очистка API завершена');
    } catch (error) {
      console.error('Ошибка очистки API:', error.response?.data || error.message);
    }

    const wavesurfers = Object.values(wavesurferRefs.current);
    wavesurfers.forEach((wavesurfer) => {
      if (wavesurfer && typeof wavesurfer.destroy === 'function') {
        try {
          wavesurfer.destroy();
          console.log('WaveSurfer уничтожен');
        } catch (err) {
          console.error('Ошибка при уничтожении WaveSurfer:', err);
        }
      }
    });
    wavesurferRefs.current = {};
  }, [userId]);

  useEffect(() => {
    return () => {
      console.log('Размонтирование TrackSeparation');
      cleanupResources();
    };
  }, [cleanupResources]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError(null);
    setTracks([]);
    setIsPlaying({});
    setQueueStatus(null);
    setTracksLoading(false);
  };

  const processFile = async (formData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/separate/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.tracks && response.data.tracks.length > 0) {
        setTracks(response.data.tracks);
        setTracksLoading(true);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      } else {
        setError(new Error('Не удалось найти треки в ответе от сервера.'));
        setTracksLoading(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      setError(new Error('Произошла ошибка при обработке файла: ' + error.message));
      setTracksLoading(false);
    } finally {
      setLoading(false);
      setQueueStatus(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError(new Error('Пожалуйста, выберите файл для обработки.'));
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    setLoading(true);
    setError(null);
    setQueueStatus('queued');

    try {
      const queueResponse = await axios.get(`${API_BASE_URL}/api/check-queue/`);
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

  const handleGenerateSound = () => {
    setShowGenerateModal(true);
  };

  const initializeWaveSurfer = useCallback((track, index) => {
    const trackId = `track-${index}`;
    const filePath = track.filename.includes('generated')
      ? `${API_BASE_URL}/media/${track.filename}`
      : `${API_BASE_URL}/output/${track.filename.replace('.mp3', '.wav')}`;

    setTimeout(() => {
      const container = document.querySelector(`#waveform-${trackId}`);
      if (!wavesurferRefs.current[trackId] && container) {
        const wavesurfer = WaveSurfer.create({
          container: `#waveform-${trackId}`,
          waveColor: 'violet',
          progressColor: 'purple',
          cursorColor: 'white',
          barWidth: 2,
          height: 80,
          responsive: true,
          interact: true,
          normalize: true,
        });
        wavesurfer.load(filePath);

        wavesurfer.on('ready', () => {
          if (wavesurfer.backend?.ac?.state === 'suspended') {
            wavesurfer.backend.ac.resume();
          }
        });
        wavesurfer.on('play', () => setIsPlaying((prev) => ({ ...prev, [trackId]: true })));
        wavesurfer.on('pause', () => setIsPlaying((prev) => ({ ...prev, [trackId]: false })));
        wavesurfer.on('finish', () => setIsPlaying((prev) => ({ ...prev, [trackId]: false })));

        wavesurferRefs.current[trackId] = wavesurfer;
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (tracks.length > 0 && tracksLoading) {
      const loadedTracks = new Set();
      tracks.forEach((track, index) => {
        if (!wavesurferRefs.current[`track-${index}`]) {
          initializeWaveSurfer(track, index);
          loadedTracks.add(`track-${index}`);
        }
      });
      if (loadedTracks.size === tracks.length) {
        setTracksLoading(false);
      }
    }
  }, [tracks, tracksLoading, initializeWaveSurfer]);

  const handlePlayStop = (trackId) => {
    const wavesurfer = wavesurferRefs.current[trackId];
    if (wavesurfer) {
      if (isPlaying[trackId]) {
        wavesurfer.stop();
      } else {
        wavesurfer.play().catch((err) => {
          console.error(`Ошибка воспроизведения для ${trackId}:`, err);
        });
      }
    }
  };

  const handleVolumeChange = useCallback((trackId, value) => {
    const wavesurfer = wavesurferRefs.current[trackId];
    if (wavesurfer) {
      const volume = parseFloat(value) / 100;
      wavesurfer.setVolume(volume);
      if (wavesurfer.backend?.ac?.state === 'suspended') {
        wavesurfer.backend.ac.resume().then(() => {
          wavesurfer.setVolume(volume);
        });
      }
      if (wavesurfer.isPlaying()) {
        wavesurfer.play();
      }
    }
  }, []);

  const handleSwitchMode = (newMode) => {
    if (activeMode && (tracks.length > 0 || error || file)) {
      setNextMode(newMode);
      setShowSwitchModal(true);
    } else {
      cleanupResources();
      setTracks([]);
      setIsPlaying({});
      setQueueStatus(null);
      if (newMode === 'separation' && error?.message.includes('сгенерировать')) {
        setError(null);
      }
      setFile(null);
      setActiveMode(newMode);
      setTracksLoading(false);
    }
  };

  const confirmSwitchMode = () => {
    cleanupResources();
    setTracks([]);
    setIsPlaying({});
    setQueueStatus(null);
    if (nextMode === 'separation' && error?.message.includes('сгенерировать')) {
      setError(null);
    }
    setFile(null);
    setActiveMode(nextMode);
    setShowSwitchModal(false);
    setNextMode(null);
    setTracksLoading(false);
  };

  const cancelSwitchMode = () => {
    setShowSwitchModal(false);
    setNextMode(null);
  };

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
  };

  return (
    <div className="container">
      <LoadingModal show={loading || (tracks.length > 0 && tracksLoading)} queueStatus={queueStatus} />
      <Notification show={showNotification} />

      <Modal
        show={showSwitchModal}
        onHide={cancelSwitchMode}
        centered
        dialogClassName="neon-modal"
      >
        <Modal.Header>
          <Modal.Title>Подтверждение переключения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Вы уверены, что хотите переключиться на "
            {nextMode === 'separation' ? 'Разделение' : 'Генерацию'} "? Все текущие треки и загруженный файл будут сброшены.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelSwitchMode}>
            Отмена
          </Button>
          <Button variant="primary" className="neon-button" onClick={confirmSwitchMode}>
            Переключить
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showGenerateModal}
        onHide={closeGenerateModal}
        centered
        dialogClassName="neon-modal"
      >
        <Modal.Header>
          <Modal.Title>Функция в разработке</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Генерация звука пока в разработке. Поддержите проект на Boosty, чтобы ускорить её запуск!</p>
          <a
            href="https://boosty.to/teftelya05"
            target="_blank"
            rel="noopener noreferrer"
            className="boosty-link"
          >
            <img src={boostyIcon} alt="Boosty" className="boosty-icon" />
            Перейти на Boosty
          </a>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeGenerateModal}>
            Закрыть
          </Button>
        </Modal.Footer>
      </Modal>

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
          {error && <p className="error">{error.message}</p>}
        </section>
      )}

      {activeMode && (
        <section className={`librarySection ${tracks.length > 0 ? 'visible' : 'hidden'}`}>
          <h2>{activeMode === 'separation' ? 'Обработанные треки' : 'Сгенерированные звуки'}</h2>
          <p>Прослушайте и настройте треки</p>
          {tracks.length === 0 && !loading && !tracksLoading ? (
            <p>Треки не найдены</p>
          ) : (
            tracks.length > 0 &&
            tracks.map((track, index) => {
              const trackId = `track-${index}`;
              const filePath = track.filename.includes('generated')
                ? `${API_BASE_URL}/media/${track.filename}`
                : `${API_BASE_URL}/output/${track.filename.replace('.mp3', '.wav')}`;
              return (
                <div
                  key={trackId}
                  className={`trackItem ${tracksLoading ? 'hidden' : 'visible'}`}
                >
                  <h4>{track.name}</h4>
                  <div id={`waveform-${trackId}`} className="waveform"></div>
                  <div className="trackControls">
                    <button
                      onClick={() => handlePlayStop(trackId)}
                      className="playButton"
                      disabled={tracksLoading}
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
                        fetch(filePath)
                          .then((res) => {
                            if (!res.ok) {
                              e.preventDefault();
                              alert('Не удалось скачать трек');
                            }
                          })
                          .catch((err) => {
                            e.preventDefault();
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
      )}

      <section className="featuresSection">
        <h2>Возможности</h2>
        <p>Разделяйте аудиофайлы на дорожки с помощью Spleeter или генерируйте новые звуки с WaveGAN.</p>
        <p>Управляйте воспроизведением и громкостью прямо в интерфейсе.</p>
      </section>
    </div>
  );
};

export default TrackSeparation;