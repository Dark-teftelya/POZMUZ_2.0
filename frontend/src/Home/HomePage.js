// src/Homepage.js
import React, { useRef } from 'react'; // Импортируем useRef
import { Link } from 'react-router-dom';
import './home.css';
import myImage from '../assets/Headphones.gif';
import myImage2 from '../assets/Music note.gif';
import myImage3 from '../assets/Vinyl record.gif';
import myImage4 from '../assets/Эквалайзеры.gif';

function Features({ trackSeparationRef, equalizerRef }) {
    const scrollToSection = (ref) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="features-container">
            <div className="feature-block fade-in">
                <h1>Добро пожаловать на сайт по обработке аудио!</h1>
                <div>
                    <img src={myImage4} alt="Описание изображения" style={{ width: '160px', height: 'auto' }} />
                </div>
            </div>
            <div className="feature-block fade-in" onClick={() => scrollToSection(trackSeparationRef)}>
                <h3>Обработка трека</h3>
                <div>
                    <img src={myImage} alt="Описание изображения" />
                </div>
                <p>Загружайте свои аудиофайлы и позволяйте нашему инструменту эффективно обрабатывать их для лучшего звука.</p>
            </div>
            <div className="feature-block fade-in" style={{ animationDelay: '0.5s' }} onClick={() => scrollToSection(trackSeparationRef)}>
                <h3>Разделение на партии</h3>
                <div>
                    <img src={myImage2} alt="Описание изображения" />
                </div>
                <p>Наш сервис разделяет ваши треки на вокал и аккомпанемент, позволяя более детально работать с каждой частью.</p>
            </div>
            <div className="feature-block fade-in" style={{ animationDelay: '1s' }} onClick={() => scrollToSection(equalizerRef)}>
                <h3>Эквалайзер</h3>
                <div>
                    <img src={myImage3} alt="Описание изображения" />
                </div>
                <p>Настраивайте уровни громкости и частот для каждой партии, чтобы добиться идеального звучания.</p>
            </div>
        </div>
    );
}

function Homepage() {
    const audioEnhancementRef = useRef(null);
    const trackSeparationRef = useRef(null);
    const equalizerRef = useRef(null);

    return (
        <div>
            <Features 
                trackSeparationRef={trackSeparationRef}
                equalizerRef={equalizerRef}
            />

            <div className="header-container" ref={audioEnhancementRef}>
                <h3>Обработка трека</h3>
                <p>Используйте наш инструмент для повышения качества звука ваших аудиофайлов. Наши алгоритмы помогут убрать шумы и сделать звук более чистым.</p>
                <Link to="/audio-enhancement" className="cta-button">Перейти к обработке</Link>
            </div>

            <div className="header-container" ref={trackSeparationRef}>
                <h3>Разделение на партии</h3>
                <p>Используйте наш инструмент для разделения вокала и аккомпанемента из ваших аудиофайлов. Просто загрузите трек, и начнем!</p>
                <Link to="/track-separation" className="cta-button">Начать разделение</Link>
            </div>

            <div className="header-container" ref={equalizerRef}>
                <h3>Эквалайзер</h3>
                <p>Перейдите к эквалайзеру, чтобы настроить звук вашего трека под ваши предпочтения. Улучшите качество звука, добавляя фильтры и подстраивая частоты.</p>
                <Link to="/equalizer" className="cta-button">Перейти к эквалайзеру</Link>
            </div>
        </div>
    );
}

export default Homepage;
