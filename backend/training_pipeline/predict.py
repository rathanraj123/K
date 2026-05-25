import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image

CLASSES = ['bacteria', 'fungi', 'plant']

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Load model
model = models.efficientnet_b0(weights=None)

in_features = model.classifier[1].in_features
model.classifier[1] = nn.Linear(in_features, 3)

model.load_state_dict(torch.load('best_model.pth', map_location=DEVICE))

model = model.to(DEVICE)
model.eval()

# Transforms
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# Load image
image = Image.open('sample.jpg').convert('RGB')
image = transform(image).unsqueeze(0).to(DEVICE)

# Predict
with torch.no_grad():
    outputs = model(image)
    probs = torch.softmax(outputs, dim=1)

    confidence, predicted = torch.max(probs, 1)

print('Prediction :', CLASSES[predicted.item()])
print('Confidence :', round(confidence.item() * 100, 2), '%')
