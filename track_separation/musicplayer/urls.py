from django.urls import path # type: ignore
from .views import upload_file, clear_media, handle_uploaded_file

clear_media()

urlpatterns = [
    path('api/upload/', upload_file, name='upload_file'),

]

