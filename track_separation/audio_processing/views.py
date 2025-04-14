from django.http import FileResponse, HttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from spleeter.separator import Separator
import os
import logging
import tensorflow as tf
from scipy.io import wavfile
import numpy as np
import h5py
import threading

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Глобальная инициализация моделей
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
separator = Separator('spleeter:2stems')
wavegan_generator = None

# Глобальная переменная для очереди
is_processing = False
lock = threading.Lock()

try:
    model_path = os.path.join(BASE_DIR, 'pretrained_models/wavegan/generator.h5')
    logger.debug(f"Checking if WaveGAN model exists at: {model_path}")
    if os.path.exists(model_path):
        file_size = os.path.getsize(model_path)
        logger.debug(f"File size: {file_size} bytes")
        if file_size < 1024:
            raise ValueError("Model file is too small or corrupted")
        
        logger.debug(f"TensorFlow version: {tf.__version__}")
        logger.debug(f"NumPy version: {np.__version__}")
        logger.debug(f"h5py version: {h5py.__version__}")
        
        with h5py.File(model_path, 'r') as f:
            logger.debug(f"HDF5 file keys: {list(f.keys())}")
            if 'model_weights' not in f:
                logger.warning("Model file may not contain expected weights structure")
        
        logger.debug("Attempting to load WaveGAN model...")
        wavegan_generator = tf.keras.models.load_model(
            model_path,
            compile=False,
            custom_objects={
                'GlorotUniform': tf.keras.initializers.GlorotUniform,
                'InstanceNormalization': tf.keras.layers.BatchNormalization
            }
        )
        logger.info("WaveGAN model loaded successfully.")
        logger.debug(f"Model summary: {wavegan_generator.summary()}")
    else:
        logger.warning(f"WaveGAN model not found at {model_path}. Generation will be disabled.")
except Exception as e:
    logger.error(f"Failed to load WaveGAN model: {str(e)}")
    logger.debug(f"Full exception traceback: {repr(e)}")

class CheckQueueView(APIView):
    def get(self, request):
        global is_processing
        with lock:
            status = 'busy' if is_processing else 'free'
        logger.debug(f"Queue status checked: {status}")
        return JsonResponse({'status': status})

class TrackSeparationView(APIView):
    parser_classes = (MultiPartParser,)
    def post(self, request):
        global is_processing
        with lock:
            if is_processing:
                logger.debug("Queue is busy, rejecting request")
                return Response(
                    {'status': 'busy'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            is_processing = True
            logger.debug("Queue locked for processing")
        try:
            tf.config.run_functions_eagerly(True)
            file = request.FILES.get('file')
            if not file:
                logger.error("No file provided in request")
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            if not file.name.endswith(('.mp3', '.wav')):
                logger.error(f"Invalid file type: {file.name}")
                return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
            file_path = os.path.join('Uploads', file.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            logger.debug(f"File saved to {file_path}")
            output_dir = os.path.join('output', file.name.split('.')[0])
            os.makedirs(output_dir, exist_ok=True)
            logger.debug(f"Separating file to {output_dir}")
            separator.separate_to_file(file_path, output_dir)
            output_file_info = []
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    if file.endswith('.wav'):
                        relative_path = os.path.relpath(os.path.join(root, file), 'output')
                        output_file_info.append({
                            'name': file.replace('.wav', '').capitalize(),
                            'filename': relative_path
                        })
            logger.debug(f"Output files: {output_file_info}")
            os.remove(file_path)
            return JsonResponse({'tracks': output_file_info})
        except Exception as e:
            logger.exception('Error processing file: %s', e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            with lock:
                is_processing = False
                logger.debug("Queue unlocked")

class GetOutputFilesView(APIView):
    def get(self, request):
        try:
            output_dir = 'output'
            files = os.listdir(output_dir)
            output_files = [f for f in files if f.endswith(('.mp3', '.wav'))]
            logger.debug(f"Output files retrieved: {output_files}")
            return Response(output_files, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error retrieving output files: %s', e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateSoundView(APIView):
    def get(self, request):
        try:
            if wavegan_generator is None:
                logger.error("WaveGAN model is not loaded")
                return Response(
                    {'error': 'WaveGAN model not loaded. Please check server logs.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            logger.debug("Generating random noise vector...")
            z = np.random.uniform(-1, 1, size=(1, 100))
            logger.debug("Running WaveGAN prediction...")
            generated_audio = wavegan_generator.predict(z, verbose=0)[0]
            
            output_dir = os.path.join(BASE_DIR, 'media/generated')
            logger.debug(f"Ensuring output directory exists: {output_dir}")
            os.makedirs(output_dir, exist_ok=True)
            filename = f'generated_sound_{np.random.randint(1000)}.wav'
            output_path = os.path.join(output_dir, filename)
            
            logger.debug(f"Saving generated audio to {output_path}")
            wavfile.write(output_path, 16000, (generated_audio * 32767.0).astype(np.int16))
            
            if not os.path.exists(output_path):
                logger.error(f"Failed to save audio file at {output_path}")
                raise IOError(f"Failed to save generated audio at {output_path}")
            
            output_file_info = {
                'name': 'Сгенерированный звук',
                'filename': os.path.relpath(output_path, os.path.join(BASE_DIR, 'media'))
            }
            logger.debug(f"Returning response: {output_file_info}")
            return JsonResponse({'tracks': [output_file_info]})
        except Exception as e:
            logger.exception(f"Error generating sound: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
