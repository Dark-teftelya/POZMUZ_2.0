from django.shortcuts import render

from django.http import HttpResponse, FileResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from pydub import AudioSegment
import os
import uuid
from django.conf import settings
from .serializers import AudioProcessingSerializer

class AudioProcessingView(APIView):
    def post(self, request):
        serializer = AudioProcessingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        audio_file = request.FILES['audio_file']
        eq_values = serializer.validated_data['eq_values']
        trim_start = serializer.validated_data['trim_start']
        trim_end = serializer.validated_data['trim_end']
        volume = serializer.validated_data['volume']
        playback_rate = serializer.validated_data['playback_rate']
        pitch = serializer.validated_data['pitch']

        # Сохраняем временный файл
        temp_input_path = os.path.join(settings.MEDIA_ROOT, f'temp_{uuid.uuid4()}.{audio_file.name.split(".")[-1]}')
        with open(temp_input_path, 'wb') as f:
            for chunk in audio_file.chunks():
                f.write(chunk)

        try:
            # Загружаем аудио
            audio = AudioSegment.from_file(temp_input_path)

            # Применяем обрезку
            start_ms = trim_start * len(audio)
            end_ms = trim_end * len(audio)
            audio = audio[start_ms:end_ms]

            # Применяем громкость
            audio = audio + volume

            # Применяем эквализацию (упрощённо, используем фильтры)
            frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
            for freq, gain in zip(frequencies, eq_values):
                if gain != 0:
                    # Пример: фильтр для частоты
                    audio = audio.low_pass_filter(freq).high_pass_filter(freq - 10) + gain

            # Изменение скорости (playback_rate)
            if playback_rate != 1:
                audio = audio._spawn(audio.raw_data, overrides={
                    'frame_rate': int(audio.frame_rate * playback_rate)
                })

            # Изменение тональности (упрощённо, pydub не поддерживает напрямую)
            # Для точной реализации потребуется librosa или sox
            if pitch != 0:
                # Пропускаем, так как требует дополнительных библиотек
                pass

            # Сохраняем обработанный файл
            temp_output_path = os.path.join(settings.MEDIA_ROOT, f'processed_{uuid.uuid4()}.wav')
            audio.export(temp_output_path, format='wav')

            # Возвращаем файл
            response = FileResponse(open(temp_output_path, 'rb'), content_type='audio/wav')
            response['Content-Disposition'] = f'attachment; filename="processed_audio.wav"'

            # Удаляем временные файлы
            os.remove(temp_input_path)
            os.remove(temp_output_path)

            return response
        except Exception as e:
            os.remove(temp_input_path)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)