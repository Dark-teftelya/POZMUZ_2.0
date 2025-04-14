# audio_processing/urls.py
from django.urls import path
from .views import TrackSeparationView, GetOutputFilesView, GenerateSoundView, CheckQueueView

urlpatterns = [
    path('separate/', TrackSeparationView.as_view(), name='track-separation'),
    path('check-queue/', CheckQueueView.as_view(), name='check_queue'),
    path('output-files/', GetOutputFilesView.as_view(), name='get-output-files'),
    path('generate/', GenerateSoundView.as_view(), name='generate-sound'),  # Новый маршрут
    # path('output/<path:path>', DownloadTrackView.as_view(), name='download-track'),
]