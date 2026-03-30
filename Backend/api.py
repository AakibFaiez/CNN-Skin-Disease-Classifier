from fastapi import FastAPI, File, UploadFile,HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image,UnidentifiedImageError
import io

CLASSES = ['akiec','bcc','bkl','df','mel','nv','vasc']
IMG_SIZE = (224, 224)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# OOD / uncertainty thresholds
MIN_CONFIDENCE = 0.50
MAX_ENTROPY = 1.50
MIN_MARGIN = 0.15

app = FastAPI()

# Allow React to call API (local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
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
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        img = img.resize(IMG_SIZE)
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to process the uploaded image.")

    arr = np.array(img).astype(np.float32)
    return np.expand_dims(arr, 0)

def compute_entropy(probs: np.ndarray) -> float:
    probs = np.clip(probs, 1e-10, 1.0)
    return float(-np.sum(probs * np.log(probs)))


def assess_prediction_quality(probs: np.ndarray):
    sorted_probs = np.sort(probs)[::-1]
    top_conf = float(sorted_probs[0])
    second_conf = float(sorted_probs[1])
    margin = top_conf - second_conf
    entropy = compute_entropy(probs)

    uncertain = (
        top_conf < MIN_CONFIDENCE or
        entropy > MAX_ENTROPY or
        margin < MIN_MARGIN
    )

    reasons = []
    if top_conf < MIN_CONFIDENCE:
        reasons.append("low_confidence")
    if entropy > MAX_ENTROPY:
        reasons.append("high_entropy")
    if margin < MIN_MARGIN:
        reasons.append("small_top2_margin")

    return {
        "uncertain": uncertain,
        "top_confidence": top_conf,
        "second_confidence": second_conf,
        "margin": float(margin),
        "entropy": entropy,
        "reasons": reasons
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a JPG or PNG image."
        )

    image_bytes = await file.read()

    if not isinstance(image_bytes, bytes):
        raise HTTPException(status_code=400, detail="Valid image data expected.")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum allowed size is 5 MB."
        )

    x = preprocess(image_bytes)

    try:
        probs = model.predict(x, verbose=0)[0]
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed. Please try again.")

    pred_idx = int(np.argmax(probs))
    top3 = np.argsort(probs)[::-1][:3]

    quality = assess_prediction_quality(probs)

    if quality["uncertain"]:
        return {
            "status": "uncertain",
            "message": "The uploaded image is not suitable for reliable prediction. Please upload a clear image of the affected skin area.",
            "predicted_class": CLASSES[pred_idx],
            "confidence": float(probs[pred_idx]),
            "top3": [{"class": CLASSES[i], "prob": float(probs[i])} for i in top3],
            "all_probs": {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))},
            "ood_metrics": {
                "entropy": quality["entropy"],
                "margin": quality["margin"],
                "reasons": quality["reasons"]
            }
        }

    return {
        "status": "ok",
        "predicted_class": CLASSES[pred_idx],
        "confidence": float(probs[pred_idx]),
        "top3": [{"class": CLASSES[i], "prob": float(probs[i])} for i in top3],
        "all_probs": {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))},
        "ood_metrics": {
            "entropy": quality["entropy"],
            "margin": quality["margin"],
            "reasons": quality["reasons"]
        }
    }