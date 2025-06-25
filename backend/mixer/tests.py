from django.test import TestCase
from .models import Track

class TrackModelTest(TestCase):
    def test_create_track(self):
        track = Track.objects.create(file='example.mp3')
        self.assertEqual(track.file, 'example.mp3')
