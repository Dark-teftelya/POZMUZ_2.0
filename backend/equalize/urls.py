from django.urls import path
from .views import AudioProcessingView

urlpatterns = [
    path('process-audio/', AudioProcessingView.as_view(), name='process-audio'),
]