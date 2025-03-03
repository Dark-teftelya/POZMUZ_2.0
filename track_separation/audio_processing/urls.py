# audio_processing/urls.py
from django.urls import path
from .views import TrackSeparationView, GetOutputFilesView

urlpatterns = [
    path('separate/', TrackSeparationView.as_view(), name='track-separation'),
    path('output-files/', GetOutputFilesView.as_view(), name='get-output-files'),  # Добавьте этот маршрут
]
