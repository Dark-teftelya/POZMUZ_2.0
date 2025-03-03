import React, { useState } from 'react';
import axios from 'axios';
import AudioPlayer from 'react-audio-player';

const TrackMixer = () => {
    const [files, setFiles] = useState([]);
    const [uploadedTracks, setUploadedTracks] = useState([]); // Массив для хранения URL загруженных треков
    const [mixedTrack, setMixedTrack] = useState(null);

    // Функция обработки изменения файлов
    const handleFileChange = (e) => {
        setFiles([...e.target.files]);
    };

    // Функция загрузки треков
    const uploadTracks = async () => {
        const formData = new FormData();
        files.forEach(file => formData.append('file', file));

        try {
            const response = await axios.post('http://localhost:8000/api/mixer/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Убедитесь, что response.data.file_url существует и добавьте его в массив uploadedTracks
            if (response.data.file_url) {
                setUploadedTracks([...uploadedTracks, response.data.file_url]); // Добавляем URL трека в массив
            }

            alert('Track uploaded successfully!');
        } catch (error) {
            console.error('Error uploading tracks:', error);
        }
    };

    // Функция смешивания треков (если необходимо)
    const mixTracks = async () => {
        // Создаем новую FormData для запроса mixTracks
        const formData = new FormData();
        uploadedTracks.forEach(trackUrl => formData.append('track_urls', trackUrl));

        try {
            const response = await axios.post('/api/mixer/mix/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            setMixedTrack(url);
        } catch (error) {
            console.error('Error mixing tracks:', error);
        }
    };

    return (
        <div>
            <h1>Track Mixer</h1>
            <input type="file" multiple onChange={handleFileChange} />
            <button onClick={uploadTracks}>Upload Tracks</button>
            <button onClick={mixTracks} disabled={uploadedTracks.length === 0}>
                Mix Tracks
            </button>

            {/* Блок для отображения загруженных треков */}
            <div>
                <h2>Uploaded Tracks</h2>
                {uploadedTracks.length > 0 ? (
                    uploadedTracks.map((trackUrl, index) => (
                        <div key={index}>
                            <h3>Track {index + 1}</h3>
                            <AudioPlayer src={trackUrl} controls />
                        </div>
                    ))
                ) : (
                    <p>No tracks uploaded yet.</p>
                )}
            </div>

            {/* Блок для отображения смешанного трека */}
            {mixedTrack && (
                <div>
                    <h2>Mixed Track</h2>
                    <AudioPlayer src={mixedTrack} controls />
                </div>
            )}
        </div>
    );
};

export default TrackMixer;
