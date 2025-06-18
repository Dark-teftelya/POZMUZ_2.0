import React from 'react';
import { Link } from 'react-router-dom';
import '../style/home.css';
import myImage from '../assets/Headphones.gif';
import myImage2 from '../assets/Music note.gif';
import myImage3 from '../assets/Vinyl record.gif';
import pilImage from '../assets/plast.jpeg';
import pikImage from '../assets/kolonka.jpg';
import pikImage2 from '../assets/8914574.jpg';
import sec_last from '../assets/fast.jpg';
import sec_last2 from '../assets/higth_mus.jpg';
import sec_last3 from '../assets/mus_set.png';
// Импортируем видео (замените пути на реальные файлы)
import trackSeparationVideo from '../assets/video/sep.webm';
import equalizerVideo from '../assets/video/equal.webm';
import mixingVideo from '../assets/video/mix.webm';

const Homepage = () => {
  const handleBoxClick = (event) => {
    const box = event.currentTarget;
    box.classList.toggle('zoomed');
  };

  return (
    <div className="homepage-container">
      {/* Шапка */}
      <section className="hero-section">
        <div className="hero-text">
          <h1>Добро пожаловать на POZMUZ</h1>
          <p>Откройте для себя возможности искусственного интеллекта в редактировании музыки</p>
        </div>
        <div className="hero-image-container">
          <img src={pilImage} alt="Hero" className="image" />
        </div>
      </section>

      {/* Блок "Ключевые функции" */}
      <section className="features-section">
        <div className="features-image-container">
          <img src={pikImage} alt="Features" className="image2" />
          <h2 className="features-title">Ключевые функции</h2>
        </div>
        <div className="features-container">
          <div className="feature-pair">
            <div className="feature-box" onClick={handleBoxClick}>
              <video
                className="feature-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src={trackSeparationVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="description-container">
              <div className="feature-description">
                <h3>Track Separation</h3>
                <p>Разделяйте треки на вокал и инструментал за секунды.</p>
              </div>
              <div className="feature-description">
                <p>Функция позволяет при помощи AI технологии разделить на партии загруженный вами трек. После обработки вам вернутся дорожки с получившимся результатом. Вы сможете легко выделить вокал и инструментал, чтобы использовать их отдельно в своих проектах.</p>
              </div>
            </div>
          </div>
          <div className="feature-pair">
            <div className="feature-box" onClick={handleBoxClick}>
              <video
                className="feature-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src={equalizerVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="description-container">
              <div className="feature-description">
                <h3>Equalizer</h3>
                <p>Настройте звук под себя с помощью мощного эквалайзера.</p>
              </div>
              <div className="feature-description">
                <p>Функция позволяет с помощью встроенного аудио инструментария и технологии настроить звучание вашего трека. После обработки вы получите идеально сбалансированный звук, который можно адаптировать под любые предпочтения или жанры.</p>
              </div>
            </div>
          </div>
          <div className="feature-pair">
            <div className="feature-box" onClick={handleBoxClick}>
              <video
                className="feature-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src={mixingVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="description-container">
              <div className="feature-description">
                <h3>Mixing & Tracks</h3>
                <p>Создавайте идеальные миксы с лёгкостью.</p>
              </div>
              <div className="feature-description">
                <p>Функция позволяет с помощью современных аудио библиотек и технологий совместно с коллекцией битов создавать профессиональные миксы из ваших треков. После обработки вы получите готовый микс, который объединит все элементы в гармоничное звучание.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Блок "Get Started" */}
      <section className="get-started-section">
        <div className="get-started-image-container">
          <div className="get-started-text">
            <h2 className="get-started-title">Давай перейдем к функциям сервиса!</h2>
            <p>Узнайте, как POZMUZ может революционизировать ваш процесс редактирования музыки</p>
          </div>
          <img src={pikImage2} alt="Get Started" className="image2" />
        </div>

        <div className="get-started-container">
          <div className="get-started-box">
            <Link to="/equalizer" className="image-link visible-hint">
              <img src={myImage2} alt="note" className="image2" />
            </Link>
            <div className="text-container">
              <h3>Загружай треки</h3>
              <p>Начни с загрузки своей дорожки</p>
            </div>
          </div>
          <div className="get-started-box">
            <Link to="/track-separation" className="image-link visible-hint">
              <img src={myImage} alt="headphones" className="image2" />
            </Link>
            <div className="text-container">
              <h3>Разделяй треки</h3>
              <p>Глубокая обработка вокала</p>
            </div>
          </div>
          <div className="get-started-width">
            <Link to="/audio-enhancement" className="image-link visible-hint">
              <img src={myImage3} alt="vinyl" className="image2" />
            </Link>
            <div className="text-container-w">
              <h3>Своди и миксуй</h3>
              <p>Оптимизируй качество звука</p>
            </div>
          </div>
        </div>
      </section>

      <section className="extra-section">
        <h2 className="section-title">Что вы получите с POZMUZ?</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Быстрая обработка</h3>
            <img src={sec_last} alt="Feature 1" className="image3" />
            <p>Мгновенное разделение треков</p>
          </div>
          <div className="feature-card">
            <h3>Высокое качество</h3>
            <img src={sec_last2} alt="Feature 2" className="image3" />
            <p>Чистый звук без артефактов</p>
          </div>
          <div className="feature-card">
            <h3>Удобный интерфейс</h3>
            <img src={sec_last3} alt="Feature 3" className="image3" />
            <p>Простота использования</p>
          </div>
        </div>
      </section>

      <footer className="footer-section">
        <div className="footer-container">
          <p className="footer-text">© 2025 POZMUZ. Все права защищены.</p>
          <div className="social-block">
            <p className="social-title">Переходите в наши соцсети:</p>
            <div className="social-links">
              <a href="https://t.me/PozMUZZ" target="_blank" rel="noopener noreferrer" className="social-link">
                <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" alt="Telegram" className="social-icon" />
              </a>
              <a href="https://vk.com/pozmuza" target="_blank" rel="noopener noreferrer" className="social-link">
                <img src="https://cdn-icons-png.flaticon.com/512/145/145813.png" alt="VK" className="social-icon" />
              </a>
            </div>
          </div>
          <div className="support-block">
            <p className="support-title">Поддержите проект:</p>
            <a href="https://boosty.to/teftelya05" target="_blank" rel="noopener noreferrer" className="social-link">
              <img src="https://cdn-icons-png.flaticon.com/512/5968/5968854.png" alt="Boosty" className="social-icon" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;