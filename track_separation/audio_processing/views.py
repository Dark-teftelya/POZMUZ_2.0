# audio_processing/views.py
from django.http import JsonResponse  # Добавьте этот импорт
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from spleeter.separator import Separator
import os
import logging
import tensorflow as tf 

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TrackSeparationView(APIView):
    parser_classes = (MultiPartParser,)

    def post(self, request):
        try:
            tf.config.run_functions_eagerly(True)
            file = request.FILES.get('file')
            if not file:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

            if not file.name.endswith(('.mp3', '.wav')):
                return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)

            file_path = os.path.join('uploads', file.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            separator = Separator('spleeter:2stems')
            output_dir = os.path.join('output', file.name.split('.')[0])
            os.makedirs(output_dir, exist_ok=True)

            separator.separate_to_file(file_path, output_dir)
            output_file_info = []

            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    if file.endswith('.wav'):
                        relative_path = os.path.relpath(os.path.join(root, file), 'output')
                        output_file_info.append({
                            'name': file,
                            'filename': relative_path
                        })

            return JsonResponse({'tracks': output_file_info})
        except Exception as e:
            logger.exception('Error processing file: %s', e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetOutputFilesView(APIView):
    def get(self, request):
        try:
            output_dir = 'output'
            # Получаем список файлов в директории output
            files = os.listdir(output_dir)
            output_files = [f for f in files if f.endswith(('.mp3', '.wav'))]
            return Response(output_files, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error retrieving output files: %s', e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
