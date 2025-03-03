#track_separation/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from audio_processing.views import TrackSeparationView, GetOutputFilesView

from musicplayer.views import upload_file, clear_media, handle_uploaded_file

import os

clear_media()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('audio_processing.urls')),  # Подключаем маршруты приложения
    path('api/separate/', TrackSeparationView.as_view(), name='track-separation'),
    path('api/output_files/', GetOutputFilesView.as_view(), name='get-output-files'),
    path('api/mixer/', include('mixer.urls')),
    
    path('api/upload/', upload_file, name='upload_file'),
    # path('api/upload/', handle_uploaded_file, name='upload_file'),
]
# Добавляем настройку static для выдачи файлов из output директории
if settings.DEBUG:
    urlpatterns += static('/output/', document_root=os.path.join(settings.BASE_DIR, 'output'))

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
