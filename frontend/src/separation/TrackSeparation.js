import React, { useState } from 'react';
import axios from 'axios';
// import '../Home/home.css';

const TrackSeparation = () => {
    const [file, setFile] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setError(null);
        setTracks([]);
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

        try {
            const response = await axios.post('http://localhost:8000/api/separate/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Ответ от API:', response.data);
            if (response.data.tracks && response.data.tracks.length > 0) {
                setTracks(response.data.tracks);
            } else {
                setError(new Error('Не удалось найти треки в ответе от сервера.'));
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            setError(new Error('Произошла ошибка при обработке файла.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container track-separation-container">
            <h2>Разделение треков</h2>
            <form onSubmit={handleSubmit} className="form-group">
                <input type="file" onChange={handleFileChange} />
                <button type="submit">Разделить трек</button>
            </form>

            {loading && <p className="loading">Идет обработка...</p>}
            {error && <p className="error">{error.message}</p>}

            <div className="tracks">
                <h2>Обработанные треки</h2>
                {tracks.length === 0 && !loading ? (
                    <p>Треки не найдены</p>
                ) : (
                    tracks.map((track, index) => {
                        const filePath = `http://localhost:8000/output/${track.filename}`;

                        return (
                            <div key={index} className="track">
                                <h4>{track.name}</h4>
                                <audio id={`audio-${index}`} controls>
                                    <source src={filePath} type="audio/mpeg" />
                                    Ваш браузер не поддерживает воспроизведение аудио.
                                </audio>
                                <label htmlFor={`volume-${index}`}>Громкость:</label>
                                <input
                                    id={`volume-${index}`}
                                    className="range-slider"
                                    type="range"
                                    min="0"
                                    max="100"
                                    defaultValue="50"
                                    onChange={(e) => {
                                        const audio = document.querySelector(`#audio-${index}`);
                                        if (audio) {
                                            audio.volume = e.target.value / 100;
                                        }
                                    }}
                                />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TrackSeparation;