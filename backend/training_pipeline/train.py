import os
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from tqdm import tqdm

# =========================
# CONFIG
# =========================

TRAIN_DIR = 'dataset/train'
VAL_DIR = 'dataset/val'

BATCH_SIZE = 32
EPOCHS = 15
LR = 0.0001
IMG_SIZE = 224

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

CLASSES = ['bacteria', 'fungi', 'plant']

# =========================
# AUGMENTATIONS
# =========================

train_transforms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(20),
    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2,
        hue=0.1
    ),
    transforms.RandomAffine(
        degrees=0,
        translate=(0.1, 0.1)
    ),
    transforms.GaussianBlur(kernel_size=3),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

val_transforms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# =========================
# DATASETS
# =========================

train_dataset = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transforms
)

val_dataset = datasets.ImageFolder(
    VAL_DIR,
    transform=val_transforms
)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=2
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=2
)

# =========================
# MODEL
# =========================

model = models.efficientnet_b0(weights='DEFAULT')

# Replace final layer
in_features = model.classifier[1].in_features
model.classifier[1] = nn.Linear(in_features, 3)

model = model.to(DEVICE)

# =========================
# LOSS + OPTIMIZER
# =========================

criterion = nn.CrossEntropyLoss()

optimizer = optim.Adam(
    model.parameters(),
    lr=LR
)

scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer,
    mode='min',
    patience=2,
    factor=0.5
)

# =========================
# TRAINING LOOP
# =========================

best_acc = 0.0
best_model = copy.deepcopy(model.state_dict())

for epoch in range(EPOCHS):

    print(f'\nEpoch {epoch+1}/{EPOCHS}')
    print('-' * 30)

    # =========================
    # TRAIN
    # =========================

    model.train()

    running_loss = 0.0
    running_corrects = 0

    for inputs, labels in tqdm(train_loader):

        inputs = inputs.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(inputs)
        _, preds = torch.max(outputs, 1)

        loss = criterion(outputs, labels)

        loss.backward()
        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
        running_corrects += torch.sum(preds == labels.data)

    train_loss = running_loss / len(train_dataset)
    train_acc = running_corrects.double() / len(train_dataset)

    # =========================
    # VALIDATION
    # =========================

    model.eval()

    val_loss = 0.0
    val_corrects = 0

    with torch.no_grad():

        for inputs, labels in tqdm(val_loader):

            inputs = inputs.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)

            loss = criterion(outputs, labels)

            val_loss += loss.item() * inputs.size(0)
            val_corrects += torch.sum(preds == labels.data)

    val_loss = val_loss / len(val_dataset)
    val_acc = val_corrects.double() / len(val_dataset)

    scheduler.step(val_loss)

    print(f'Train Loss: {train_loss:.4f}')
    print(f'Train Acc : {train_acc:.4f}')
    print(f'Val Loss  : {val_loss:.4f}')
    print(f'Val Acc   : {val_acc:.4f}')

    # Save best model
    if val_acc > best_acc:
        best_acc = val_acc
        best_model = copy.deepcopy(model.state_dict())

        torch.save(best_model, 'best_model.pth')

        print('\nBest model saved!')

print('\nTraining Complete!')
print(f'Best Validation Accuracy: {best_acc:.4f}')
