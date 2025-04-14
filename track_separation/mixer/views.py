import subprocess
from django.http import FileResponse, HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import os
from django.conf import settings

class TrackUploadView(APIView):
    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.lower().endswith(('.mp3', '.wav')):
            return Response({"error": "Unsupported file format. Use MP3 or WAV"}, status=status.HTTP_400_BAD_REQUEST)

        file_name = file.name
        file_path = os.path.join(settings.MEDIA_ROOT, 'tracks', file_name)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        return Response({"file_path": file_path}, status=status.HTTP_201_CREATED)

class MixTracksView(APIView):
    def post(self, request, *args, **kwargs):
        tracks = [request.FILES.get(f"track_{i}") for i in range(len(request.FILES))]
        output_format = request.POST.get("format", "mp3")

        if not tracks or None in tracks:
            return Response({"error": "No tracks provided"}, status=status.HTTP_400_BAD_REQUEST)

        temp_files = []
        for i, track in enumerate(tracks):
            if not track.name.lower().endswith(('.mp3', '.wav')):
                return Response({"error": f"Track {i} has unsupported format"}, status=status.HTTP_400_BAD_REQUEST)
            temp_path = os.path.join(settings.MEDIA_ROOT, 'temp', f"temp_track_{i}.{track.name.split('.')[-1]}")
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            with open(temp_path, 'wb+') as f:
                for chunk in track.chunks():
                    f.write(chunk)
            temp_files.append(temp_path)

        output_extension = output_format.lower()
        if output_extension not in ['mp3', 'wav']:
            output_extension = 'mp3'
        output_file = os.path.join(settings.MEDIA_ROOT, 'mixed', f"mixed_output_{request.session.session_key or 'default'}.{output_extension}")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        command = ["ffmpeg"] + [arg for temp_file in temp_files for arg in ("-i", temp_file)]
        command += ["-filter_complex", f"amix=inputs={len(temp_files)}:duration=longest", "-f", output_extension, output_file, "-y"]

        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            print(f"Сведение успешно: {output_file}")  # Отладка
            response = FileResponse(open(output_file, 'rb'), as_attachment=True, filename=f"mix.{output_extension}")
            for temp_file in temp_files:
                os.remove(temp_file)
            os.remove(output_file)
            return response
        except subprocess.CalledProcessError as e:
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            return Response({"error": f"FFmpeg error: {e.stderr}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)