import React, { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import "../style/MixTrack.css";
import { API_BASE_URL } from "../config";

const MixTrack = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState({});
  const [isAllPlaying, setIsAllPlaying] = useState(false);
  const [format, setFormat] = useState("MP3");
  const [mixedAudio, setMixedAudio] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const wavesurferRefs = useRef({});
  const fileInputRef = useRef(null);

  // Максимальный размер файла (100 МБ)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB in bytes

  // Функция для санирования имени файла (защита от XSS)
  const sanitizeFileName = (name) => {
    return name
      .replace(/[<>"';&]/g, '') // Удаляем потенциально опасные символы
      .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
      .slice(0, 100); // Ограничиваем длину имени
  };

  // Проверка аудиофайла
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

      // Проверка заголовков файла
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
        console.error('Ошибка чтения файла:', reader.error);
        reject(new Error('Ошибка чтения файла.'));
      };
      reader.readAsArrayBuffer(file.slice(0, 128)); // Читаем первые 128 байт
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
      // Проверка файла
      await validateAudioFile(file);

      // Санируем имя файла
      const sanitizedName = sanitizeFileName(file.name);
      console.log('Загрузка файла:', { name: sanitizedName, type: file.type, size: file.size });

      // Создаём новый трек
      const newTrack = { file, id: Date.now(), name: sanitizedName };
      setTracks((prev) => [...prev, newTrack]);
      setIsPlaying((prev) => ({ ...prev, [newTrack.id]: false }));
      setShowLibrary(true); // Показываем librarySection
      setError("");
    } catch (err) {
      setError(err.message);
      console.error('Ошибка валидации файла:', err);
    } finally {
      event.target.value = null;
    }
  };

  useEffect(() => {
    tracks.forEach((track) => {
      if (!wavesurferRefs.current[track.id]) {
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
      }
    });
    return () => {
      Object.values(wavesurferRefs.current).forEach((wavesurfer) => wavesurfer.destroy());
      wavesurferRefs.current = {};
    };
  }, [tracks]);

  const handlePlayPause = (id) => {
    if (wavesurferRefs.current[id]) wavesurferRefs.current[id].playPause();
  };

  const handlePlayPauseAll = () => {
    const allWavesurfers = Object.values(wavesurferRefs.current);
    if (allWavesurfers.length === 0) return;
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
  };

  const handleRemoveTrack = (id) => {
    setTracks((prev) => prev.filter((track) => track.id !== id));
    if (wavesurferRefs.current[id]) {
      wavesurferRefs.current[id].destroy();
      delete wavesurferRefs.current[id];
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
      console.error(err);
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
      console.error(err);
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
          <button className="neonButton">Добавить бит</button>
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