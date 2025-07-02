import React, { useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import "../style/Wave.css"
const SpectrumAnalyzer = ({ tracks, isPlaying, wavesurferRefs }) => {
  const containerRef = useRef(null);
  const audioMotionRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const lastTrackIdRef = useRef(null);

  // Find the active track outside useEffect
  const activeTrack = tracks.find(function(track) {
    return isPlaying[track.id] && !track.isBeat;
  });
  const activeTrackPlaying = activeTrack ? isPlaying[activeTrack.id] : false;

  useEffect(() => {
    if (!containerRef.current || !tracks.length) {
      console.log('SpectrumAnalyzer: No container or tracks, skipping setup');
      return;
    }

    if (!activeTrack || !wavesurferRefs.current[activeTrack.id]) {
      console.log('SpectrumAnalyzer: No active track or WaveSurfer instance, skipping setup');
      return;
    }

    // Get WaveSurfer instance for the active track
    const wavesurfer = wavesurferRefs.current[activeTrack.id];
    console.log('SpectrumAnalyzer: WaveSurfer instance for track', activeTrack.id, wavesurfer);

    // Clean up previous AudioMotionAnalyzer and canvas if track changed
    if (lastTrackIdRef.current !== activeTrack.id) {
      console.log('SpectrumAnalyzer: Active track changed, resetting analyzer');
      if (audioMotionRef.current) {
        audioMotionRef.current = null;
      }
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
        analyserNodeRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current !== wavesurfer.backend?.ac) {
        audioContextRef.current.close().catch((err) => console.error('Ошибка закрытия AudioContext:', err));
        audioContextRef.current = null;
      }
      // Clear existing canvas elements in the container
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        console.log('SpectrumAnalyzer: Cleared previous canvas elements from container');
      }
      lastTrackIdRef.current = activeTrack.id;
    }

    // Setup AudioContext and AudioMotionAnalyzer
    const setupAudioContext = () => {
      console.log('SpectrumAnalyzer: Setting up AudioContext for track', activeTrack.id);
      let audioContext;
      try {
        // Use AudioContext from WaveSurfer if available, otherwise create a new one
        audioContext = wavesurfer.backend && wavesurfer.backend.ac
          ? wavesurfer.backend.ac
          : new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
      } catch (err) {
        console.error('Ошибка создания AudioContext:', err);
        return;
      }

      // Prevent re-creating MediaElementSourceNode if it already exists
      if (!sourceNodeRef.current) {
        try {
          const mediaElement = wavesurfer.getMediaElement();
          if (!mediaElement) {
            console.error('SpectrumAnalyzer: MediaElement не доступен для трека', activeTrack.id);
            return;
          }
          console.log('SpectrumAnalyzer: MediaElement retrieved for track', activeTrack.id);
          sourceNodeRef.current = audioContext.createMediaElementSource(mediaElement);
          analyserNodeRef.current = audioContext.createAnalyser();
          sourceNodeRef.current.connect(analyserNodeRef.current);
          analyserNodeRef.current.connect(audioContext.destination);

          console.log('SpectrumAnalyzer: Initializing AudioMotionAnalyzer');
          audioMotionRef.current = new AudioMotionAnalyzer(containerRef.current, {
            source: analyserNodeRef.current,
            height: 460, // Match CSS container height
            ansiBands: false,
            showBgColor: false,
            bgAlpha: 0,
            overlay: true,
            mode: 3,
            freqMin: 20,
            freqMax: 20000,
            smoothing: 0.7,
            gradient: 'rainbow',
            showPeaks: true,
            showScaleX: true,
            showScaleY: true,
            splitGradient: false,
            lineWidth: 2,
            fillAlpha: 0.6,
            barSpace: 0.2,
            reflexRatio: 0.3,
            reflexAlpha: 0.15,
            reflexBright: 1,
          });
          console.log('SpectrumAnalyzer: AudioMotionAnalyzer initialized successfully');
        } catch (err) {
          console.error('Ошибка настройки AudioMotionAnalyzer:', err);
          return;
        }
      }
    };

    // Check if WaveSurfer is ready
    if (wavesurfer.isReady) {
      console.log('SpectrumAnalyzer: WaveSurfer is ready, setting up immediately');
      setupAudioContext();
    } else {
      console.log('SpectrumAnalyzer: WaveSurfer not ready, waiting for ready event');
      const onReady = () => {
        console.log('SpectrumAnalyzer: WaveSurfer ready event fired for track', activeTrack.id);
        setupAudioContext();
      };
      wavesurfer.on('ready', onReady);

      // Fallback: Retry multiple times if ready event doesn't fire
      let retries = 0;
      const maxRetries = 10;
      const retryInterval = setInterval(() => {
        if (audioMotionRef.current || retries >= maxRetries) {
          console.log('SpectrumAnalyzer: Stopping retries', { initialized: !!audioMotionRef.current, retries });
          clearInterval(retryInterval);
          return;
        }
        if (wavesurfer.getMediaElement()) {
          console.log('SpectrumAnalyzer: Fallback setup after retry', retries + 1);
          setupAudioContext();
          clearInterval(retryInterval);
        } else {
          console.log('SpectrumAnalyzer: MediaElement not ready on retry', retries + 1);
        }
        retries++;
      }, 1000);

      return () => {
        wavesurfer.un('ready', onReady);
        clearInterval(retryInterval);
      };
    }

    // Cleanup on component unmount or track change, not on pause
    return () => {
      if (!activeTrack || !activeTrackPlaying) {
        console.log('SpectrumAnalyzer: Skipping cleanup, track is paused');
        return;
      }
      console.log('SpectrumAnalyzer: Cleaning up resources for track', activeTrack.id);
      if (audioMotionRef.current) {
        audioMotionRef.current = null;
      }
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
        analyserNodeRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current !== wavesurfer.backend?.ac) {
        audioContextRef.current.close().catch((err) => console.error('Ошибка закрытия AudioContext:', err));
        audioContextRef.current = null;
      }
      // Clear canvas elements on cleanup
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        console.log('SpectrumAnalyzer: Cleared canvas elements on cleanup');
      }
    };
  }, [tracks, wavesurferRefs, isPlaying, activeTrackPlaying]);

  // Show analyzer only if there is a playing track
  const isAnyTrackPlaying = tracks.some(function(track) {
    return isPlaying[track.id] && !track.isBeat;
  });

  return (
    <div className={`spectrum-analyzer ${isAnyTrackPlaying ? 'visible' : 'hidden'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white neon-text">Спектральный анализатор</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Анализ в реальном времени</span>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full"
        style={{ height: '460px', width: '100%' }}
      />
      
      <div className="text-center text-sm text-gray-400 mt-2">
        Диапазон частот: 20Hz - 20kHz | Размер FFT: 8192 | Сглаживание: 0.7
      </div>
    </div>
  );
};

export default SpectrumAnalyzer;