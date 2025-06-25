import tensorflow as tf
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, 'pretrained_models/wavegan/generator.h5')

print(f"Checking file: {model_path}")
if os.path.exists(model_path):
    print(f"File size: {os.path.getsize(model_path)} bytes")
    try:
        model = tf.keras.models.load_model(
            model_path,
            compile=False,
            custom_objects={'GlorotUniform': tf.keras.initializers.GlorotUniform}
        )
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {str(e)}")
else:
    print("File not found!")