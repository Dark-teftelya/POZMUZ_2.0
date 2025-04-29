from rest_framework import serializers

class AudioProcessingSerializer(serializers.Serializer):
    audio_file = serializers.FileField()
    eq_values = serializers.ListField(
        child=serializers.FloatField(min_value=-30, max_value=30),
        min_length=10,
        max_length=10
    )
    trim_start = serializers.FloatField(min_value=0, max_value=1)
    trim_end = serializers.FloatField(min_value=0, max_value=1)
    volume = serializers.FloatField(min_value=-60, max_value=0)
    playback_rate = serializers.FloatField(min_value=0.5, max_value=2)
    pitch = serializers.FloatField(min_value=-12, max_value=12)