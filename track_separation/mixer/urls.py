# mixer/urls.py
from django.urls import path
from .views import TrackUploadView, MixTracksView

urlpatterns = [
    path('upload/', TrackUploadView.as_view(), name='track-upload'),
    path('mix/', MixTracksView.as_view(), name='mix-tracks'),
    
]
