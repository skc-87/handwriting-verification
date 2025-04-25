import sys
import io
import os
import cv2
import numpy as np
from PIL import Image
import fitz  # PyMuPDF
import torch
import json
import argparse
import random
from siamese_network import SiameseNetwork  # Custom Siamese model
from torchvision import transforms
# from resnet_embedder import ResNetEmbedder  # ❌ Commented: ResNet Embedder (not used)
import torch.nn.functional as F
from sklearn.metrics.pairwise import cosine_similarity
import warnings
warnings.filterwarnings("ignore")

# UTF-8 logs
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# -------------------------------
# ✅ Convert file to grayscale image (PDF or Image)
# -------------------------------
def convert_to_image(path, num_pages=3):
    if path.lower().endswith(".pdf"):
        doc = fitz.open(path)
        total_pages = len(doc)
        selected_pages = sorted(random.sample(range(total_pages), min(num_pages, total_pages)))
        images = []
        for page_num in selected_pages:
            page = doc.load_page(page_num)
            pix = page.get_pixmap()
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            images.append(img)
        return images
    else:
        return [cv2.imread(path, cv2.IMREAD_GRAYSCALE)]

# -------------------------------
# ✅ Find file in folder by prefix
# -------------------------------
def find_file_with_prefix(folder, prefix, allowed_extensions):
    for ext in allowed_extensions:
        file_path = os.path.join(folder, f"{prefix}.{ext}")
        if os.path.exists(file_path):
            return file_path
        else:
            print(f"[❌ DEBUG] File not found: {file_path}", file=sys.stderr)
    return None

# -------------------------------
# ✅ Preprocess image for Siamese model
# -------------------------------
def preprocess_image(img_array):
    if len(img_array.shape) == 2:  # Grayscale image (H x W)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)

    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),  # Converts to [0,1] and [C x H x W]
    ])
    tensor = transform(img_array)
    return tensor.unsqueeze(0)  # Shape: [1, 3, 224, 224]


# -------------------------------
# ✅ Compare two images using Siamese model
# -------------------------------
def compare_images_siamese(img1, img2, model, device):
    t1 = preprocess_image(img1).to(device)
    t2 = preprocess_image(img2).to(device)

    with torch.no_grad():
        emb1 = model.forward_once(t1)
        emb2 = model.forward_once(t2)
        distance = F.pairwise_distance(emb1, emb2).item()
        similarity = 1 / (1 + distance)

    return round(similarity * 100, 2)

# -------------------------------
# ❌ [Commented] Compare using ResNet Embedder
# -------------------------------
# def compare_images_resnet(img1, img2, embedder):
#     emb1 = embedder.get_embedding_from_array(img1)
#     emb2 = embedder.get_embedding_from_array(img2)
#     similarity = cosine_similarity([emb1], [emb2])[0][0]
#     return round(similarity * 100, 2)

# -------------------------------
# ✅ Main Function
# -------------------------------
def main(student_id):
    print(f"[🟡 Python] Starting handwriting comparison for student: {student_id}", file=sys.stderr)

    folder = os.path.join(os.path.dirname(__file__), "fetched_files")

    sample_path = find_file_with_prefix(folder, f"handwriting_sample_{student_id}", ["png", "jpg", "jpeg"])
    assignment_path = find_file_with_prefix(folder, f"latest_assignment_{student_id}", ["pdf", "png", "jpg", "jpeg"])

    print(f"[📂 Python] Sample Path: {sample_path}", file=sys.stderr)
    print(f"[📂 Python] Assignment Path: {assignment_path}", file=sys.stderr)

    if not sample_path or not assignment_path:
        result = {
            "status": "error",
            "message": "One or both required files are missing."
        }
        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
        return

    sample_img = convert_to_image(sample_path)[0]
    assignment_imgs = convert_to_image(assignment_path, num_pages=10)

    print(f"[✅ Python] Converted {len(assignment_imgs)} assignment pages to images", file=sys.stderr)

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # ❌ Commented: Load ResNet Embedder
    # embedder = ResNetEmbedder(device=device)

    siamese_model_path = os.path.join(os.path.dirname(__file__), "siamese_model_contrastive.pth")
    siamese_model = SiameseNetwork().to(device)
    siamese_model.load_state_dict(torch.load(siamese_model_path, map_location=device))
    siamese_model.eval()

    # similarities_resnet = []  # ❌ Commented: ResNet
    similarities_siamese = []

    for idx, assignment_img in enumerate(assignment_imgs):
        # sim_resnet = compare_images_resnet(sample_img, assignment_img, embedder)  # ❌ Commented
        sim_siamese = compare_images_siamese(sample_img, assignment_img, siamese_model, device)

        # similarities_resnet.append(sim_resnet)  # ❌
        similarities_siamese.append(sim_siamese)

        # print(f"[🔍 Page {idx+1}] ResNet Similarity: {sim_resnet}", file=sys.stderr)
        print(f"[🔍 Page {idx+1}] Siamese Similarity: {sim_siamese}", file=sys.stderr)

    # average_resnet_similarity = round(sum(similarities_resnet) / len(similarities_resnet), 2)  # ❌
    average_siamese_similarity = round(sum(similarities_siamese) / len(similarities_siamese), 2)

    # Strict condition: All individual similarities >= 70 AND average >= 70
    matched = average_siamese_similarity >= 70 and all(score >= 70 for score in similarities_siamese)

    result = {
        "status": "success",
        "siamese_similarity": average_siamese_similarity,
        "matched": matched,
        "siamese_similarities": similarities_siamese
        # "resnet_similarity": average_resnet_similarity,  # ❌
        # "resnet_similarities": similarities_resnet  # ❌
    }

    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()

# -------------------------------
# ✅ Entry point
# -------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--student_id", required=True)
    args = parser.parse_args()
    try:
        main(args.student_id)
    except Exception as e:
        result = {
            "status": "error",
            "message": str(e)
        }
        sys.stdout.write(json.dumps(result))
        sys.exit(1)
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)
