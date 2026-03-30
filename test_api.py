import requests
import io
from PIL import Image
import json

# Create a small dummy image
img = Image.new('RGB', (224, 224), color = (73, 109, 137))
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_byte_arr.seek(0)

# Send to API
response = requests.post(
    'http://127.0.0.1:8000/predict',
    files={'file': ('dummy.jpg', img_byte_arr, 'image/jpeg')}
)

print(json.dumps(response.json(), indent=2))
