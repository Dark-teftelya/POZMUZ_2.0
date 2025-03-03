
# mixer/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .serializers import TrackSerializer
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.shortcuts import render
from django.http import JsonResponse
from .models import Track
import os

class TrackUploadView(APIView):
    def post(self, request, *args, **kwargs):
        # Получаем файл из запроса
        file = request.FILES.get('file')
        if file:
            # Формируем путь для сохранения файла
            file_name = file.name
            file_path = os.path.join('tracks', file_name)  # Путь внутри папки 'tracks'

            # Сохраняем файл в хранилище
            with default_storage.open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            # Сохраняем информацию о файле в базе данных
            track = Track(file=file_path)  # Используем путь в базе данных
            track.save()

            # Отправляем ответ с URL файла
            return Response({"file_url": default_storage.url(file_path)}, status=status.HTTP_201_CREATED)

        return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
    
class MixTracksView(APIView):
    def post(self, request, *args, **kwargs):
        tracks = request.data.get('tracks', [])
        output_file = 'media/mixed_output.mp3'
        
        # Формируем команду FFmpeg для сведения
        inputs = [f"-i {Track.objects.get(id=track_id).file.path}" for track_id in tracks]
        command = [
            "ffmpeg",
            *[arg for track_id in tracks for arg in ("-i", Track.objects.get(id=track_id).file.path)],
            "-filter_complex", f"amix=inputs={len(tracks)}:duration=longest",
            output_file
        ]

        try:
            subprocess.run(command, check=True)
            return FileResponse(open(output_file, 'rb'), as_attachment=True)
        except subprocess.CalledProcessError as e:
            return Response({"error": f"FFmpeg error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
