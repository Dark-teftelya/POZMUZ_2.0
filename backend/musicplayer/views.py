from venv import logger
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.text import slugify
from django.conf import settings
import os

import logging

logger = logging.getLogger(__name__)

@csrf_exempt
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        try:
            # Обрабатываем файл
            file_path = handle_uploaded_file(file)

            # Генерируем URL для доступа к файлу
            file_url = f"{settings.MEDIA_URL}{os.path.basename(file_path)}"
            return JsonResponse({'file_url': file_url, 'message': 'File uploaded successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request'}, status=400)


def handle_uploaded_file(file):
    try:
        logger.info(f"Processing file: {file.name}")
        # Создаем безопасное имя файла
        file_name, file_ext = os.path.splitext(file.name)
        safe_name = slugify(file_name)
        if not safe_name:
            safe_name = "uploaded_file"
        new_name = f"{safe_name}{file_ext}"

        # Проверяем расширение файла
        ALLOWED_EXTENSIONS = ['.mp3', '.wav']
        if file_ext.lower() not in ALLOWED_EXTENSIONS:
            raise ValueError("Unsupported file type")

        # Убедимся, что MEDIA_ROOT существует
        media_dir = settings.MEDIA_ROOT
        if not os.path.exists(media_dir):
            os.makedirs(media_dir)

        # Определяем путь к сохранению
        file_path = os.path.join(media_dir, new_name)

        # Убеждаемся, что путь находится в пределах MEDIA_ROOT
        if not file_path.startswith(media_dir):
            raise ValueError(f"Detected path traversal attempt in '{file_path}'")

        # Сохраняем файл
        with default_storage.open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        return file_path
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        raise Exception(f"Error processing file: {str(e)}")
    

def clear_media():
    media_path = os.path.join(settings.MEDIA_ROOT)
    for file in os.listdir(media_path):
        file_path = os.path.join(media_path, file)
        if os.path.isfile(file_path):
            os.remove(file_path)