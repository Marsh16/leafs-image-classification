from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import requests
import base64
from PIL import Image
import io

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# IBM Watson ML credentials (you can load these from environment variables for security)
API_KEY = "BP99mfadlrhSUdGGg73bsRKZf-nDHGWO1J7OMGbsCBsD"
DEPLOYMENT_ID = "b7b56897-687b-41c3-aa44-f629813d2aa6"
WATSON_URL = f"https://jp-tok.ml.cloud.ibm.com/ml/v4/deployments/{DEPLOYMENT_ID}/predictions?version=2021-05-01"

# Class labels (edit as needed based on your model's output)
CLASS_NAMES = ['Anthracnose', 'Bacterial Canker', 'Cutting Weevil', 'Die Back', 
               'Gall Midge', 'Healthy', 'Powdery Mildew', 'Sooty Mould']

def get_token_header():
    """Get authentication token for IBM Watson ML API."""
    try:
        token_response = requests.post(
            'https://iam.cloud.ibm.com/identity/token',
            data={"apikey": API_KEY, "grant_type": 'urn:ibm:params:oauth:grant-type:apikey'}
        )
        token_response.raise_for_status()
        mltoken = token_response.json()["access_token"]
        return {'Content-Type': 'application/json', 'Authorization': f'Bearer {mltoken}'}
    except Exception as e:
        raise Exception(f"Failed to get token: {e}")

def preprocess_image(encoded_string):
    """Decodes base64 string and preprocesses the image."""
    try:
        image_bytes = base64.b64decode(encoded_string)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")  # Ensure 3 channels
        image = image.resize((227, 227))
        image_array = np.array(image)
        image_array = np.expand_dims(image_array, axis=0)
        image_array = image_array.astype(np.float32)
        return image_array.tolist()
    except Exception as e:
        raise Exception(f"Error during image preprocessing: {e}")

def predict_image(encoded_string):
    """Sends preprocessed image to Watson ML for prediction."""
    try:
        processed_image = preprocess_image(encoded_string)
        payload = {
            "input_data": [{
                "values": processed_image
            }]
        }

        headers = get_token_header()

        response = requests.post(
            WATSON_URL,
            json=payload,
            headers=headers
        )
        response.raise_for_status()

        predictions = response.json()["predictions"][0]["values"][0]
        predicted_class = CLASS_NAMES[np.argmax(predictions)]
        confidence = round(100 * np.max(predictions), 2)
        return predicted_class, confidence
    except Exception as e:
        return None, str(e)

@app.route('/api/python', methods=['GET'])
def hello():
    return "Hello from Flask server!"

@app.route('/api/predict', methods=['POST'])
def process_image():
    """Process the incoming image and return the prediction."""
    try:
        data = request.get_json()
        if not data or 'data' not in data:
            return jsonify({'error': 'No image data provided'}), 400

        encoded_image = data.get("data")

        predicted_class, confidence = predict_image(encoded_image)

        if predicted_class is None:
            return jsonify({'error': confidence}), 500

        return jsonify({
            "result": f"This image most likely belongs to {predicted_class} with a {confidence:.2f}% confidence.",
            "class": predicted_class,
            "confidence": confidence
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500