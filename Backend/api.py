from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import io

CLASSES = ['akiec','bcc','bkl','df','mel','nv','vasc']
IMG_SIZE = (224, 224)

app = FastAPI()

# Allow React to call API (local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

@app.on_event("startup")
async def load_model():
    global model
    model = tf.keras.models.load_model("skin_disease_mobilenetv2.keras")
    print("Model loaded successfully")

def preprocess(image_bytes: bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE)
    arr = np.array(img).astype(np.float32)
    return np.expand_dims(arr, 0)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    x = preprocess(image_bytes)

    probs = model.predict(x, verbose=0)[0]
    pred_idx = int(np.argmax(probs))
    top3 = np.argsort(probs)[::-1][:3]

    return {
        "predicted_class": CLASSES[pred_idx],
        "confidence": float(probs[pred_idx]),
        "top3": [{"class": CLASSES[i], "prob": float(probs[i])} for i in top3],
        "all_probs": {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))}
    }