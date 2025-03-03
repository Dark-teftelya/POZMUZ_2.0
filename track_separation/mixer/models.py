from django.db import models

class Track(models.Model):
    #user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='tracks/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Track {self.id}"
    
    def delete(self, *args, **kwargs):
        # Удаляем файл перед удалением записи из базы данных
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)