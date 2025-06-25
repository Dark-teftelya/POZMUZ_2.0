from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_out
from .models import Track
from django.core.files.storage import default_storage

@receiver(user_logged_out)
def clear_user_files_and_tracks(sender, request, user, **kwargs):
    try:
        # Находим все треки, связанные с этим пользователем
        user_tracks = Track.objects.filter(user=user)  # предположим, что у вас есть связь с пользователем
        
        # Удаляем файлы, ассоциированные с этими треками
        for track in user_tracks:
            if track.file:
                default_storage.delete(track.file.name)
                
        # Удаляем записи о треках в базе данных
        user_tracks.delete()

        print(f"Треки и файлы пользователя {user.username} удалены.")
    except Exception as e:
        print(f"Ошибка при удалении файлов пользователя: {e}")
