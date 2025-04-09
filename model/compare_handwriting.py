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
from resnet_embedder import ResNetEmbedder
from sklearn.metrics.pairwise import cosine_similarity as cos_sim
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
# ✅ Compare two images using ResNet
# -------------------------------
def compare_images(img1, img2, embedder):
    emb1 = embedder.get_embedding_from_array(img1)
    emb2 = embedder.get_embedding_from_array(img2)
    similarity = cos_sim([emb1], [emb2])[0][0]
    return round(similarity * 100, 2)

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

    # Convert to image(s)
    sample_img = convert_to_image(sample_path)[0]  # Only one image for sample
    assignment_imgs = convert_to_image(assignment_path, num_pages=3)

    print(f"[✅ Python] Converted {len(assignment_imgs)} assignment pages to images", file=sys.stderr)

    # Initialize embedder
    device = "cuda" if torch.cuda.is_available() else "cpu"
    embedder = ResNetEmbedder(device=device)

    # Add array method to embedder
    def get_embedding_from_array(self, img_array):
        image = Image.fromarray(img_array).convert("RGB")
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            features = self.feature_extractor(image_tensor)
            features = features.view(features.size(0), -1)
        return features.squeeze().cpu().numpy()

    setattr(embedder, "get_embedding_from_array", get_embedding_from_array.__get__(embedder))

    similarities = []
    failed_pages = []

    for idx, assignment_img in enumerate(assignment_imgs):
        sim = compare_images(sample_img, assignment_img, embedder)
        similarities.append(sim)
        print(f"[🔍 Page {idx+1}] Similarity: {sim}", file=sys.stderr)
        if sim < 80:
            failed_pages.append(idx + 1)

    all_match = len(failed_pages) == 0

    similarity_score = similarities[1] if len(similarities) >= 2 else similarities[0]

    result = {
        "status": "success",
        "similarity": similarity_score,
        "similarities": similarities,
        "matched": all_match,
        "failed_pages": failed_pages
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
