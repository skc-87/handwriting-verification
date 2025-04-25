# face_recognition_system.py
import cv2
import numpy as np
import csv
import os
import sys
import jwt
import json
from datetime import datetime
from deepface import DeepFace

JWT_SECRET = "4349ef690de9a0fa8704f4d8ec9238e01a8446000d6d4cbc494dfa397468772b"

class ArcFaceSystem:
    def __init__(self):
        self.registered_students = []
        self.load_registered_students()

        # Model configuration
        self.detector_backend = 'mtcnn'
        self.embedding_model = 'ArcFace'
        self.threshold = 0.6  # Updated threshold
        self.distance_metric = 'cosine'

    def load_registered_students(self):
        """Load registered students from CSV"""
        if os.path.exists('registered_students.csv'):
            with open('registered_students.csv', 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.registered_students.append({
                        'id': row['id'],
                        'name': row['name'],
                        'embedding': np.array(eval(row['embedding']))
                    })

    def register_student(self, student_id: str, name: str, image_path: str) -> tuple:
        """Register a new student using face embedding"""
        try:
            # Input validation
            if not student_id.isalnum():
                return False, "Invalid student ID format"

            img = cv2.imread(image_path)
            if img is None:
                return False, "Invalid image path"

            # Extract face embedding
            embedding_obj = DeepFace.represent(
                img_path=image_path,
                model_name=self.embedding_model,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )

            if not embedding_obj:
                return False, "No face detected"
            if len(embedding_obj) > 1:
                return False, "Multiple faces detected"

            embedding = embedding_obj[0]['embedding']

            # Save to CSV
            file_exists = os.path.exists('registered_students.csv') and os.path.getsize('registered_students.csv') > 0
            with open('registered_students.csv', 'a', newline='') as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(['id', 'name', 'embedding'])
                writer.writerow([student_id, name, list(embedding)])  # Store as list

            self.registered_students.append({
                'id': student_id,
                'name': name,
                'embedding': np.array(embedding)
            })

            return True, "Student registered successfully"

        except Exception as e:
            return False, f"Registration error: {str(e)}"

    def take_attendance(self, subject: str, image_path: str) -> tuple:
        """Take attendance using face recognition"""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return False, "Invalid image path"

            current_time = datetime.now().strftime("%H:%M:%S")
            current_date = datetime.now().strftime("%Y-%m-%d")

            # Get embedding of incoming face
            embedding_obj = DeepFace.represent(
                img_path=image_path,
                model_name=self.embedding_model,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )

            if not embedding_obj:
                return False, "No face detected"
            if len(embedding_obj) > 1:
                return False, "Multiple faces detected"

            test_embedding = np.array(embedding_obj[0]['embedding'])
            matched_students = []

            # Compare with registered students
            for student in self.registered_students:
                ref_embedding = student['embedding']
                similarity = np.dot(test_embedding, ref_embedding) / (
                    np.linalg.norm(test_embedding) * np.linalg.norm(ref_embedding)
                )

                if similarity > self.threshold:  # Corrected comparison
                    matched_students.append({
                        'student_id': student['id'],
                        'name': student['name'],
                        'date': current_date,
                        'time': current_time,
                        'subject': subject,
                        'status': 'Present'
                    })

            # Save attendance
            if matched_students:
                file_exists = os.path.exists('attendance.csv') and os.path.getsize('attendance.csv') > 0
                with open('attendance.csv', 'a', newline='') as f:
                    fieldnames = ['student_id', 'name', 'date', 'time', 'subject', 'status']
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    if not file_exists:
                        writer.writeheader()
                    for record in matched_students:
                        writer.writerow(record)

                return True, f"Attendance recorded for {len(matched_students)} students"

            return False, "No recognized students"

        except Exception as e:
            return False, f"Attendance error: {str(e)}"

def validate_token(token):
    """Validate JWT token from Node.js backend"""
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return True
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return False
    except jwt.InvalidTokenError:
        print("Invalid token")
        return False

def main():
    try:
        if len(sys.argv) < 5:
            raise ValueError("Insufficient arguments provided")

        operation = sys.argv[1]
        auth_token = sys.argv[-1]

        if not validate_token(auth_token):
            print(json.dumps({
                "success": False,
                "message": "Unauthorized",
                "error": "Invalid authentication token"
            }))
            return

        system = ArcFaceSystem()

        if operation == "register":
            if len(sys.argv) != 6:
                raise ValueError("Invalid number of arguments for registration")

            student_id = sys.argv[2]
            name = sys.argv[3]
            image_path = sys.argv[4]

            success, message = system.register_student(student_id, name, image_path)
            print(json.dumps({
                "success": success,
                "message": message,
                "student_id": student_id,
                "name": name
            }))

        elif operation == "attendance":
            if len(sys.argv) != 5:
                raise ValueError("Invalid number of arguments for attendance")

            subject = sys.argv[2]
            image_path = sys.argv[3]

            success, message = system.take_attendance(subject, image_path)
            print(json.dumps({
                "success": success,
                "message": message,
                "subject": subject,
                "timestamp": datetime.now().isoformat()
            }))
        else:
            raise ValueError(f"Invalid operation: {operation}")

    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": "System error occurred",
            "error": str(e),
            "error_type": type(e).__name__
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
