
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import io
import json
import zipfile
import tempfile
import os
import keras

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "smart_recycling_model.keras"
)

CLASS_NAMES = [
    "battery",
    "biological",
    "brown-glass",
    "cardboard",
    "clothes",
    "green-glass",
    "metal",
    "paper",
    "plastic",
    "shoes",
    "trash",
    "white-glass"
]


def load_compatible_model(model_path):
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_model = os.path.join(
            temp_dir, "compatible_model.keras"
        )

        with zipfile.ZipFile(model_path, "r") as source:
            with zipfile.ZipFile(
                temp_model, "w", zipfile.ZIP_DEFLATED
            ) as target:

                for item in source.infolist():
                    data = source.read(item.filename)

                    if item.filename == "config.json":
                        config = json.loads(data.decode("utf-8"))

                        def clean_config(obj):
                            if isinstance(obj, dict):
                                obj.pop("quantization_config", None)
                                for value in obj.values():
                                    clean_config(value)
                            elif isinstance(obj, list):
                                for value in obj:
                                    clean_config(value)

                        clean_config(config)
                        data = json.dumps(config).encode("utf-8")

                    target.writestr(item, data)

        return keras.models.load_model(
            temp_model, compile=False
        )


print("Loading AI model...")

model = load_compatible_model(MODEL_PATH)

print("AI model loaded successfully!")


@app.route("/")
def home():
    return jsonify({
        "message": "Smart Recycling Assistant API is running!"
    })


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({
            "error": "Please upload an image using the 'image' field."
        }), 400

    file = request.files["image"]

    try:
        image = Image.open(
            io.BytesIO(file.read())
        ).convert("RGB")

        image = image.resize((224, 224))

        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)

        predictions = model.predict(
            image_array, verbose=0
        )[0]

        index = int(np.argmax(predictions))
        category = CLASS_NAMES[index]
        confidence = float(predictions[index]) * 100

        return jsonify({
            "category": category,
            "confidence": round(confidence, 2),
            "message": "Waste image classified successfully!"
        })

    except Exception as error:
        return jsonify({
            "error": "Unable to process the image.",
            "details": str(error)
        }), 400


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )
