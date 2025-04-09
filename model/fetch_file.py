import sys
import os
import json
import shutil  # <-- NEW: For deleting existing folders
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()

if len(sys.argv) != 4:
    print(json.dumps({"status": "error", "message": "Invalid number of arguments"}))
    sys.exit()

student_id = sys.argv[1]
token = sys.argv[3]  # Reserved for future use like auth

# Connect to MongoDB
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    print(json.dumps({"status": "error", "message": "MONGO_URI not set in .env"}))
    sys.exit()

client = MongoClient(MONGO_URI)
db = client["test"]
collection = db["files"]

output_dir = os.path.join(os.path.dirname(__file__), "fetched_files")

if os.path.exists(output_dir):
    shutil.rmtree(output_dir)
os.makedirs(output_dir)

# output_dir = os.path.join(os.path.dirname(__file__), "fetched_files")
# os.makedirs(output_dir, exist_ok=True)

result_files = []

def save_file(document, label):
    content_type = document["contentType"]
    extension = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg"
    }.get(content_type)

    if not extension:
        print(json.dumps({"status": "error", "message": f"Unsupported content type: {content_type}"}))
        sys.exit()

    filename = f"{label}_{student_id}{extension}"
    file_path = os.path.join(output_dir, filename)

    with open(file_path, "wb") as f:
        f.write(document["fileData"])

    return file_path

# --- Step 1: Fetch handwriting sample ---
sample_doc = collection.find_one({
    "studentId": student_id,
    "fileCategory": "handwriting_sample"
})

if not sample_doc:
    print(json.dumps({"status": "error", "message": "No handwriting sample found"}))
    sys.exit()

sample_path = save_file(sample_doc, "handwriting_sample")
result_files.append(sample_path)

# --- Step 2: Fetch latest assignment (by uploadDate descending) ---
assignment_doc = collection.find_one(
    {"studentId": student_id, "fileCategory": "assignment"},
    sort=[("uploadDate", -1)]
)

if not assignment_doc:
    print(json.dumps({"status": "error", "message": "No assignment found"}))
    sys.exit()

assignment_path = save_file(assignment_doc, "latest_assignment")
result_files.append(assignment_path)

# Final Output
print(json.dumps({
    "status": "success",
    "files": result_files
}))
client.close()