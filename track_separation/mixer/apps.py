from django.apps import AppConfig

class MixerConfig(AppConfig):
    name = 'mixer'

    def ready(self):
        import mixer.signals  # подключаем сигнал из signals.py
