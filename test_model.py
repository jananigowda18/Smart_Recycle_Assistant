
import json
import zipfile
import tempfile
import os
import keras

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "smart_recycling_model.keras"
)

print("Preparing compatible model...")

with tempfile.TemporaryDirectory() as temp_dir:
    temp_model = os.path.join(temp_dir, "compatible_model.keras")

    with zipfile.ZipFile(MODEL_PATH, "r") as source:
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

    print("Loading model...")
    model = keras.models.load_model(
        temp_model,
        compile=False
    )

    print("MODEL LOADED SUCCESSFULLY!")
    model.summary()