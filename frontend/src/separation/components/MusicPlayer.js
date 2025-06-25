import React, { useEffect, useState, useRef } from "react";
import { AiFillPlayCircle, AiFillPauseCircle } from "react-icons/ai";
import { BiSkipNext, BiSkipPrevious } from "react-icons/bi";
import { IconContext } from "react-icons";
import { Howl } from "howler";
import "./style.css";

export default function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState("Unknown Title");
  const [audioCover, setAudioCover] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currTime, setCurrTime] = useState(0);

  const soundRef = useRef(null); // Храним Howl в useRef

  // Эффект, чтобы обновить плеер, когда изменяется файл
  useEffect(() => {
    if (audioFile) {
      // Очищаем старый экземпляр Howl, если он был
      if (soundRef.current) {
        soundRef.current.unload();
        console.log("Old Howl unloaded");
      }

      // Создаем новый экземпляр Howl
      soundRef.current = new Howl({
        src: [audioFile],
        format: ["mp3", "wav"],
        html5: false,
        onload: function () {
          console.log("Howler loaded successfully!", soundRef.current.duration());
          setDuration(soundRef.current.duration());
        },
        onplay: function () {
          console.log("Track started playing at actual:", soundRef.current.seek());
          setIsPlaying(true);
        },
        onpause: function () {
          console.log("Track paused");
          setIsPlaying(false);
        },
        onend: function () {
          console.log("Track ended");
          setIsPlaying(false);
          setCurrTime(0);
        },
      });

      console.log("New Howl created");
    }
  }, [audioFile]); // Запускаем useEffect только когда меняется сам файл

  // Эффект для обновления текущего времени, когда трек играет
  useEffect(() => {
    if (soundRef.current && isPlaying) {
      const interval = setInterval(() => {
        setCurrTime(soundRef.current.seek());
      }, 1000);
      return () => clearInterval(interval); // Очищаем интервал при остановке
    }
  }, [isPlaying]);

  // Функция для загрузки файла
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return alert("No file selected.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/upload/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const audioUrl = `http://localhost:8000${data.file_url}`;
        setAudioFile(audioUrl);
        setAudioName(data.file_name || "Unknown Title");
        setAudioCover(data.cover_url || "https://picsum.photos/200/200"); // Устанавливаем обложку
        console.log("Uploaded file URL:", audioUrl);
      } else {
        console.error("Upload failed:", data.message);
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  // Функция для переключения воспроизведения
  const togglePlay = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
      console.log("Paused at:", soundRef.current.seek());
    } else {
      const lastSeek = soundRef.current.seek();
      soundRef.current.seek(lastSeek);  // Принудительно устанавливаем seek()
      console.log("Playing from:", lastSeek);

      setTimeout(() => {
        soundRef.current.play();
        console.log("Track should now be playing from:", soundRef.current.seek());
      }, 50);  // Даем Howler время обновиться
    }
  };

  // Функция для перемотки трека
  const handleSeek = (e) => {
    if (soundRef.current) {
      soundRef.current.seek(parseFloat(e.target.value));
      setCurrTime(parseFloat(e.target.value));
    }
  };

  return (
    <div className="component">
      <h2>Playing Now</h2>
      <img
        className="musicCover"
        src={audioCover || "https://picsum.photos/200/200"}
        alt="Music Cover"
      />
      <div>
        <h3 className="title">{audioName}</h3>
        <p className="subTitle">Uploaded File</p>
      </div>
      <input type="file" accept="audio/*" onChange={handleFileUpload} />
      {audioFile ? (
        <>
          <div className="time">
            <p>{Math.floor(currTime / 60)}:{Math.floor(currTime % 60)}</p>
            <p>{Math.floor(duration / 60)}:{Math.floor(duration % 60)}</p>
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currTime || 0}
            className="timeline"
            onChange={handleSeek}
          />
          <div className="controls">
            <button className="playButton">
              <IconContext.Provider value={{ size: "3em", color: "#27AE60" }}>
                <BiSkipPrevious />
              </IconContext.Provider>
            </button>
            <button className="playButton" onClick={togglePlay}>
              <IconContext.Provider value={{ size: "3em", color: "#27AE60" }}>
                {isPlaying ? <AiFillPauseCircle /> : <AiFillPlayCircle />}
              </IconContext.Provider>
            </button>
            <button className="playButton">
              <IconContext.Provider value={{ size: "3em", color: "#27AE60" }}>
                <BiSkipNext />
              </IconContext.Provider>
            </button>
          </div>
        </>
      ) : (
        <p>Please upload a file to start playing!</p>
      )}
    </div>
  );
}
