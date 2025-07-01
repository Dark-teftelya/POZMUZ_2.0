import React, { useState, useRef, useEffect } from 'react';
import '../style/Wave.css';

const Wave = ({ wavesurfers, isPlaying, modalWavesurfers, modalPlaying }) => {
  const [isAnyPlaying, setIsAnyPlaying] = useState(false);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourcesRef = useRef([]);

  const drawWave = () => {
    if (!canvasRef.current || !analyserRef.current) {
      console.warn('Canvas или Analyser не инициализированы');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barWidth = width / bufferLength;

    const animate = () => {
      const anyPlaying =
        Object.values(isPlaying).some((playing) => playing) ||
        Object.values(modalPlaying).some((playing) => playing);

      if (!anyPlaying) {
        ctx.clearRect(0, 0, width, height);
        setIsAnyPlaying(false);
        console.log('Анимация остановлена: нет активных треков');
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#ff00aa'); // Фиолетовый
      gradient.addColorStop(1, '#00aaff'); // Голубой неон
      ctx.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    console.log('Wave useEffect:', {
      wavesurfers: Object.keys(wavesurfers),
      isPlaying,
      modalWavesurfers: Object.keys(modalWavesurfers),
      modalPlaying,
    });

    const anyPlaying =
      Object.values(isPlaying).some((playing) => playing) ||
      Object.values(modalPlaying).some((playing) => playing);
    setIsAnyPlaying(anyPlaying);
    console.log('isAnyPlaying:', anyPlaying);

    if (!anyPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      console.log('Очистка: нет воспроизведения');
      return;
    }

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.8;
        console.log('AudioContext и Analyser созданы');
      } catch (err) {
        console.error('Ошибка создания AudioContext:', err);
        return;
      }
    }

    sourcesRef.current.forEach((source) => {
      try {
        source.disconnect();
      } catch (err) {
        console.warn('Ошибка отключения источника:', err);
      }
    });
    sourcesRef.current = [];

    Object.entries(wavesurfers).forEach(([id, wavesurfer]) => {
      if (isPlaying[id] && wavesurfer && wavesurfer.backend && wavesurfer.backend.media) {
        try {
          const source = audioContextRef.current.createMediaElementSource(wavesurfer.backend.media);
          source.connect(analyserRef.current);
          sourcesRef.current.push(source);
          console.log(`Подключён источник для трека: ${id}`);
        } catch (err) {
          console.error(`Ошибка подключения источника для трека ${id}:`, err);
        }
      }
    });

    Object.entries(modalWavesurfers).forEach(([name, wavesurfer]) => {
      if (modalPlaying[name] && wavesurfer && wavesurfer.backend && wavesurfer.backend.media) {
        try {
          const source = audioContextRef.current.createMediaElementSource(wavesurfer.backend.media);
          source.connect(analyserRef.current);
          sourcesRef.current.push(source);
          console.log(`Подключён модальный источник: ${name}`);
        } catch (err) {
          console.error(`Ошибка подключения модального источника ${name}:`, err);
        }
      }
    });

    analyserRef.current.connect(audioContextRef.current.destination);

    drawWave();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      sourcesRef.current.forEach((source) => {
        try {
          source.disconnect();
        } catch (err) {
          console.warn('Ошибка отключения источника при очистке:', err);
        }
      });
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((err) => {
          console.warn('Ошибка закрытия AudioContext:', err);
        });
        audioContextRef.current = null;
      }
      console.log('Очистка Wave useEffect');
    };
  }, [isPlaying, wavesurfers, modalWavesurfers, modalPlaying]);

  return (
    <div className={`wave-visualizer ${isAnyPlaying ? 'visible' : ''}`}>
      <canvas ref={canvasRef} className="wave-visualizer-canvas" />
    </div>
  );
};

export default Wave;
