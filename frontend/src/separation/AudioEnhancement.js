import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import "../style/MixTrack.css";
import { API_BASE_URL } from "../config";

// Динамическое подгружение всех MP3 и WAV файлов из /public/media с помощью Webpack require.context
let localBeats = [];
try {
  const requireContext = require.context('/media', false, /\.(mp3|wav)$/);
  localBeats = requireContext.keys().map((path) => {
    const name = path.replace('./', '');
    return {
      name,
      path: requireContext(path), // Прямой URL из Webpack
    };
  });
  console.log('localBeats:', localBeats);
} catch (error) {
  console.error('Ошибка загрузки битов из /public/media:', error);
  localBeats = [];
}

const MixTrack = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState({});
  const [isAllPlaying, setIsAllPlaying] = useState(false);
  const [format, setFormat] = useState("MP3");
  const [mixedAudio, setMixedAudio] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPlaying, setModalPlaying] = useState({});
  const wavesurferRefs = useRef({});
  const modalWavesurferRefs = useRef({});
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const sanitizeFileName = (name) => {
    return name
      .replace(/[<>"';&]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 100);
  };

  const validateAudioFile = (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE) {
        console.error('Ошибка: Файл слишком большой', { size: file.size });
        reject(new Error('Файл слишком большой. Максимальный размер: 100 МБ.'));
        return;
      }

      const validMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'application/octet-stream'];
      const validExtensions = ['.mp3', '.wav'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      const isMimeValid = validMimeTypes.includes(file.type) || file.type === '';
      const isExtensionValid = validExtensions.includes(fileExtension);

      if (!isExtensionValid) {
        console.error('Ошибка: Неподдерживаемое расширение', { extension: fileExtension });
        reject(new Error('Неподдерживаемый формат файла. Используйте WAV или MP3.'));
        return;
      }

      // Проверяем заголовки файла
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const view = new DataView(buffer);

        console.log('File validation:', {
          name: file.name,
          mimeType: file.type,
          extension: fileExtension,
          firstBytes: Array.from(new Uint8Array(buffer).slice(0, 4)),
        });

        const isWav =
          view.getUint8(0) === 0x52 &&
          view.getUint8(1) === 0x49 &&
          view.getUint8(2) === 0x46 &&
          view.getUint8(3) === 0x46;

        const isMp3 =
          (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) ||
          (view.getUint8(0) === 0xFF && (view.getUint8(1) & 0xE0) === 0xE0);

        if ((isWav && fileExtension === '.wav') || (isMp3 && fileExtension === '.mp3')) {
          console.log(`Файл подтверждён как ${isWav ? 'WAV' : 'MP3'}`);
          resolve(true);
        } else if (isExtensionValid && !isMimeValid) {
          // Fallback: доверяем расширению, если MIME неопределён
          console.warn('MIME-тип неопределён, доверяем расширению:', fileExtension);
          resolve(true);
        } else {
          console.error('Ошибка: Файл не является WAV или MP3', {
            firstBytes: Array.from(new Uint8Array(buffer).slice(0, 4)),
            extension: fileExtension,
          });
          reject(new Error('Файл не является валидным аудиофайлом.'));
        }
      };
      reader.onerror = () => {
        console.error('Ошибка чтения файла:', reader.error);
        reject(new Error('Ошибка чтения файла.'));
      };
      reader.readAsArrayBuffer(file.slice(0, 128));
    });
  };

  const handleUploadTrack = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setError("Выберите файл");
      console.warn("Файл не выбран");
      return;
    }

    try {
      await validateAudioFile(file);
      const sanitizedName = sanitizeFileName(file.name);
      console.log('Загрузка файла:', { name: sanitizedName, type: file.type, size: file.size });

      const newTrack = { file, id: Date.now(), name: sanitizedName };
      setTracks((prev) => [...prev, newTrack]);
      setIsPlaying((prev) => ({ ...prev, [newTrack.id]: false }));
      setShowLibrary(true);
      setError("");
    } catch (err) {
      setError(err.message);
      console.error('Ошибка валидации файла:', err);
    } finally {
      event.target.value = null;
    }
  };

  const handleAddBeat = async (beat) => {
    try {
      console.log('Добавление бита:', beat);
      const response = await fetch(beat.path);
      if (!response.ok) throw new Error(`Не удалось загрузить бит: ${beat.name}`);
      const blob = await response.blob();

      const file = new File([blob], beat.name, {
        type: blob.type || (beat.name.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'),
      });
      await validateAudioFile(file);

      const sanitizedName = sanitizeFileName(beat.name);
      const newTrack = { file, id: Date.now(), name: sanitizedName };
      setTracks((prev) => [...prev, newTrack]);
      setIsPlaying((prev) => ({ ...prev, [newTrack.id]: false }));
      setShowLibrary(true);
      setIsModalOpen(false);
      setError("");
    } catch (err) {
      setError(err.message);
      console.error('Ошибка добавления бита:', err);
    }
  };

  const handlePlayPauseModal = async (beat) => {
    if (!modalWavesurferRefs.current[beat.name]) {
      try {
        const response = await fetch(beat.path);
        if (!response.ok) throw new Error(`Не удалось загрузить бит для воспроизведения: ${beat.name}`);
        const blob = await response.blob();
        const file = new File([blob], beat.name, {
          type: blob.type || (beat.name.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'),
        });

        await validateAudioFile(file);

        const wavesurfer = WaveSurfer.create({
          container: `#modal-waveform-${beat.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
          waveColor: "violet",
          progressColor: "purple",
          cursorColor: "white",
          barWidth: 2,
          height: 40,
          responsive: true,
        });
        wavesurfer.loadBlob(file);
        wavesurfer.on("ready", () => {
          wavesurfer.play();
        });
        wavesurfer.on("play", () => setModalPlaying((prev) => ({ ...prev, [beat.name]: true })));
        wavesurfer.on("pause", () => setModalPlaying((prev) => ({ ...prev, [beat.name]: false })));
        modalWavesurferRefs.current[beat.name] = wavesurfer;
      } catch (err) {
        console.error('Ошибка воспроизведения бита:', err);
        setError("Ошибка воспроизведения бита");
      }
    } else {
      modalWavesurferRefs.current[beat.name].playPause();
    }
  };

  useEffect(() => {
    tracks.forEach((track) => {
      if (!wavesurferRefs.current[track.id]) {
        try {
          const wavesurfer = WaveSurfer.create({
            container: `#waveform-${track.id}`,
            waveColor: "violet",
            progressColor: "purple",
            cursorColor: "white",
            barWidth: 2,
            height: 80,
            responsive: true,
          });
          wavesurfer.loadBlob(track.file);
          wavesurfer.on("play", () => setIsPlaying((prev) => ({ ...prev, [track.id]: true })));
          wavesurfer.on("pause", () => setIsPlaying((prev) => ({ ...prev, [track.id]: false })));
          wavesurferRefs.current[track.id] = wavesurfer;
        } catch (err) {
          console.error('Ошибка инициализации WaveSurfer для трека:', track.id, err);
          setError("Ошибка отображения трека");
        }
      }
    });

    return () => {
      Object.values(wavesurferRefs.current).forEach((wavesurfer) => {
        try {
          wavesurfer.destroy();
        } catch (err) {
          console.error('Ошибка уничтожения WaveSurfer:', err);
        }
      });
      wavesurferRefs.current = {};
    };
  }, [tracks]);

  useEffect(() => {
    if (isModalOpen) {
      Object.values(modalWavesurferRefs.current).forEach((wavesurfer) => {
        try {
          wavesurfer.destroy();
        } catch (err) {
          console.error('Ошибка уничтожения WaveSurfer в модальном окне:', err);
        }
      });
      modalWavesurferRefs.current = {};
      setModalPlaying({});
    }

    return () => {
      Object.values(modalWavesurferRefs.current).forEach((wavesurfer) => {
        try {
          wavesurfer.destroy();
        } catch (err) {
          console.error('Ошибка уничтожения WaveSurfer в модальном окне:', err);
        }
      });
      modalWavesurferRefs.current = {};
    };
  }, [isModalOpen]);

  const handlePlayPause = (id) => {
    if (wavesurferRefs.current[id]) {
      try {
        wavesurferRefs.current[id].playPause();
      } catch (err) {
        console.error('Ошибка воспроизведения/паузы:', id, err);
        setError("Ошибка воспроизведения трека");
      }
    }
  };

  const handlePlayPauseAll = () => {
    const allWavesurfers = Object.values(wavesurferRefs.current);
    if (allWavesurfers.length === 0) return;
    try {
      if (isAllPlaying) {
        allWavesurfers.forEach((wavesurfer) => wavesurfer.pause());
        setIsAllPlaying(false);
        setIsPlaying((prev) => {
          const newState = { ...prev };
          Object.keys(newState).forEach((id) => (newState[id] = false));
          return newState;
        });
      } else {
        allWavesurfers.forEach((wavesurfer) => wavesurfer.play());
        setIsAllPlaying(true);
        setIsPlaying((prev) => {
          const newState = { ...prev };
          Object.keys(newState).forEach((id) => (newState[id] = true));
          return newState;
        });
      }
    } catch (err) {
      console.error('Ошибка воспроизведения/паузы всех треков:', err);
      setError("Ошибка воспроизведения всех треков");
    }
  };

  const handleRemoveTrack = (id) => {
    setTracks((prev) => prev.filter((track) => track.id !== id));
    if (wavesurferRefs.current[id]) {
      try {
        wavesurferRefs.current[id].destroy();
        delete wavesurferRefs.current[id];
      } catch (err) {
        console.error('Ошибка удаления трека:', id, err);
      }
    }
    setIsPlaying((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    if (tracks.length === 1) setShowLibrary(false);
  };

  const handleMixTracks = async () => {
    if (tracks.length < 1) {
      setError("Загрузите хотя бы один трек для сведения");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      tracks.forEach((track, index) => {
        formData.append(`track_${index}`, track.file);
      });
      formData.append("format", format.toLowerCase());

      const response = await fetch(`${API_BASE_URL}/api/mix-tracks/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ошибка сервера: ${response.status} - ${text}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Получен пустой файл от сервера");
      console.log("Blob type:", blob.type);
      setMixedAudio(blob);
      console.log("Сведение завершено на сервере");
    } catch (err) {
      setError("Ошибка при сведении: " + err.message);
      console.error('Ошибка сведения:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMix = () => {
    if (!mixedAudio) {
      setError("Сведенный результат отсутствует");
      return;
    }
    try {
      const url = window.URL.createObjectURL(mixedAudio);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mix.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Ошибка при сохранении: " + err.message);
      console.error('Ошибка сохранения:', err);
    }
  };

  const handleAddTrackClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="container">
      <section className="uploadSection">
        <h2>Попробуй свести трек</h2>
        <p>С легкостью упорядочивайте и микшируйте ваши звуковые дорожки</p>
        <label htmlFor="fileInput" className="neonButton">
          Загрузить
        </label>
        <input
          type="file"
          id="fileInput"
          accept="audio/mpeg,audio/wav"
          hidden
          onChange={handleUploadTrack}
        />
        {loading && <p>Обработка...</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className={`librarySection ${showLibrary ? "visible" : "hidden"}`}>
        <h2>Звуковая библиотека</h2>
        <p>Добавляйте биты в свой микс из нашей встроенной библиотеки</p>
        <div className="buttonGroup">
          <button className="neonButton" onClick={handleAddTrackClick}>
            Добавить трек
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/mpeg,audio/wav"
            hidden
            onChange={handleUploadTrack}
          />
          <button className="neonButton" onClick={() => setIsModalOpen(true)}>
            Добавить бит
          </button>
          <button className="neonButton" onClick={handlePlayPauseAll}>
            {isAllPlaying ? "Остановить все" : "Воспроизвести все"}
          </button>
          <button className="neonButton" onClick={handleMixTracks} disabled={loading}>
            Свести треки
          </button>
        </div>

        {tracks.map((track) => (
          <div key={track.id} className="trackItem">
            <h3 className="trackTitle">{track.name}</h3>
            <div id={`waveform-${track.id}`} className="waveform"></div>
            <div className="trackControls">
              <button onClick={() => handlePlayPause(track.id)} className="playButton">
                {isPlaying[track.id] ? "❚❚" : "▶"}
              </button>
              <span className="trackStatus">00:00 / 03:45</span>
              <button
                onClick={() => setFormat(format === "MP3" ? "WAV" : "MP3")}
                className="formatButton"
              >
                {format}
              </button>
              <button onClick={() => handleRemoveTrack(track.id)} className="deleteButton">
                🗑
              </button>
            </div>
          </div>
        ))}
        <button onClick={handleSaveMix} className="saveButton">
          Сохранить
        </button>
      </section>

      {isModalOpen && (
        <div className={`modalOverlay ${isModalOpen ? 'visible' : ''}`}>
          <div className="modalContent">
            <h2 className="modalTitle">Выберите бит</h2>
            <ul className="beatList">
              {localBeats.length > 0 ? (
                localBeats.map((beat) => (
                  <li
                    key={beat.name}
                    className="beatItem"
                    onClick={() => handleAddBeat(beat)}
                  >
                    <div className="beatItemContent">
                      <span className="beatName">{beat.name}</span>
                      <div className="beatControls">
                        <button
                          className="modalPlayButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPauseModal(beat);
                          }}
                        >
                          {modalPlaying[beat.name] ? "❚❚" : "▶"}
                        </button>
                        <button
                          className="neonButton modalSelectButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddBeat(beat);
                          }}
                        >
                          Выбрать
                        </button>
                      </div>
                    </div>
                    <div
                      id={`modal-waveform-${beat.name.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      className="modalWaveform"
                    ></div>
                  </li>
                ))
              ) : (
                <li className="beatItem">Биты не найдены</li>
              )}
            </ul>
            <div className="modalActions">
              <button className="neonButton" onClick={() => setIsModalOpen(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <section className={`featuresSection ${showLibrary ? "hidden" : ""}`}>
        <h2>Возможности страницы</h2>
        <p>Загружайте свои аудиофайлы в формате MP3 или WAV и создавайте уникальные миксы.</p>
        <p>Используйте встроенные инструменты для воспроизведения, удаления и сведения треков.</p>
        <p>Выбирайте формат итогового файла (MP3 или WAV) и сохраняйте результат на свое устройство.</p>
      </section>
    </div>
  );
};

export default MixTrack;