# Plant / Bacteria / Fungi Classification Training Pipeline

This is a complete production-ready training setup using PyTorch + EfficientNet-B0 to train custom models for the AgriCosmo Bio-Intelligence system.

You only need to:
1. Download dataset images
2. Place them into folders
3. Run the training script
4. Get trained model file (`best_model.pth`)

---

## 1. Install Requirements

Navigate to this directory and install the ML requirements:

```bash
pip install torch torchvision torchaudio scikit-learn pillow matplotlib tqdm
```

---

## 2. Dataset Structure

Create this exact folder structure inside `training_pipeline/`:

```txt
dataset/
 ├── train/
 │    ├── plant/
 │    ├── bacteria/
 │    └── fungi/
 │
 └── val/
       ├── plant/
       ├── bacteria/
       └── fungi/
```

---

## 3. Recommended Dataset Sources

### Plant Images
* medicinal plants, leaves, herbs, roots, natural plant compounds

### Bacteria Images
* bacterial colonies, petri dish images, microscope images

### Fungi Images
* fungal cultures, mushroom samples, fungal microscopy images

**You can collect from:**
* Kaggle
* NCBI
* PubMed
* Bioimage repositories

**Recommended:**
* 1000+ images per class
* Diverse backgrounds
* Mobile camera images
* Different lighting conditions

---

## 4. Run Training

Once your dataset is structured correctly, run:

```bash
python train.py
```

After training completes, it will output a `best_model.pth` file.

---

## 5. Inference

To test your trained model on a new image, replace `sample.jpg` with your image path in `predict.py` and run:

```bash
python predict.py
```

## Expected Accuracy

With a good dataset:

| Dataset Quality | Expected Accuracy |
| --------------- | ----------------- |
| Small           | 70–80%            |
| Medium          | 80–90%            |
| Good            | 90–95%            |
