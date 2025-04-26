# face_recognition_system.py
import cv2
import numpy as np
import csv
import os
import sys
import jwt
import json
import traceback
from datetime import datetime
from deepface import DeepFace

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

JWT_SECRET = "4349ef690de9a0fa8704f4d8ec9238e01a8446000d6d4cbc494dfa397468772b"

class ArcFaceSystem:
    def __init__(self):
        self.registered_students = []
        self.load_registered_students()
        self.detector_backend = 'mtcnn'
        self.embedding_model = 'ArcFace'
        self.threshold = 0.6
        self.distance_metric = 'cosine'

    def load_registered_students(self):
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
        try:
            if not student_id.isalnum():
                return False, "Invalid student ID format"
            img = cv2.imread(image_path)
            if img is None:
                return False, "Invalid image path"

            embedding_obj = DeepFace.represent(
                img_path=image_path,
                model_name=self.embedding_model,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )

            if not embedding_obj or len(embedding_obj) > 1:
                return False, "Face detection failed or multiple faces found"

            embedding = embedding_obj[0]['embedding']

            for student in self.registered_students:
                if student['id'] == student_id:
                    return False, "Student ID already registered"

            file_exists = os.path.exists('registered_students.csv') and os.path.getsize('registered_students.csv') > 0
            with open('registered_students.csv', 'a', newline='') as f:
                writer = csv.writer(f)
                if not file_exists:
                    writer.writerow(['id', 'name', 'embedding'])
                writer.writerow([student_id, name, list(embedding)])

            self.registered_students.append({
                'id': student_id,
                'name': name,
                'embedding': np.array(embedding)
            })

            return True, "Student registered successfully"

        except Exception as e:
            return False, f"Registration error: {str(e)}"

    def take_attendance_live(self, subject: str, image_path: str) -> tuple:
        try:
            if not os.path.exists(image_path):
                return False, "Image file not found"

            attendance_marked = set()
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

            # Read the input image
            frame = cv2.imread(image_path)
            if frame is None:
                return False, "Could not read image file"

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            if len(faces) == 0:
                self.mark_all_absent(subject)
                return False, {
                    "error_type": "no_faces_detected",
                    "message": "No faces found in the image",
                    "original_image_path": image_path
                }

            recognized_students = []
            for (x, y, w, h) in faces:
                face_img = frame[y:y+h, x:x+w]
                try:
                    embedding_obj = DeepFace.represent(
                        img_path=face_img,
                        model_name=self.embedding_model,
                        detector_backend=self.detector_backend,
                        enforce_detection=False
                    )
                except:
                    continue

                if not embedding_obj:
                    continue

                best_match = None
                max_similarity = 0

                for student in self.registered_students:
                    similarity = np.dot(embedding_obj[0]['embedding'], student['embedding']) / (
                        np.linalg.norm(embedding_obj[0]['embedding']) * np.linalg.norm(student['embedding'])
                    )

                    if similarity > self.threshold and similarity > max_similarity:
                        max_similarity = similarity
                        best_match = student

                if best_match:
                    color = (0, 255, 0) if best_match['id'] in attendance_marked else (255, 0, 0)
                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                    cv2.putText(frame, f"{best_match['name']} ({max_similarity:.2f})",
                                (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                    recognized_students.append(best_match)

            # Save the processed image with detections
            processed_image_path = os.path.join(os.path.dirname(image_path), 
                                            f"processed_{os.path.basename(image_path)}")
            cv2.imwrite(processed_image_path, frame)

            # Mark attendance for all recognized students
            for student in recognized_students:
                if student['id'] not in attendance_marked:
                    self.save_attendance(subject, student['id'], student['name'])
                    attendance_marked.add(student['id'])

            return True, {
                "status": "success",
                "message": f"Attendance complete. Total marked: {len(attendance_marked)}",
                "marked_count": len(attendance_marked),
                "recognized_students": [s['id'] for s in recognized_students],
                "processed_image_path": processed_image_path
            }

        except Exception as e:
            return False, {
            "error_type": "processing_error",
            "message": f"Attendance processing error: {str(e)}",
            "original_image_path": image_path
        }
    
    def mark_all_absent(self, subject):
        current_time = datetime.now().strftime("%H:%M:%S")
        current_date = datetime.now().strftime("%Y-%m-%d")
        file_path = 'attendance.csv'
        
        file_exists = os.path.exists(file_path) and os.path.getsize(file_path) > 0
        with open(file_path, 'a', newline='') as f:
            fieldnames = ['student_id', 'name', 'date', 'time', 'subject', 'status']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            
            for student in self.registered_students:
                writer.writerow({
                    'student_id': student['id'],
                    'name': student['name'],
                    'date': current_date,
                    'time': current_time,
                    'subject': subject,
                    'status': 'Absent'
                })

    def mark_unrecognized_absent(self, subject, present_students):
        current_time = datetime.now().strftime("%H:%M:%S")
        current_date = datetime.now().strftime("%Y-%m-%d")
        file_path = 'attendance.csv'
        
        file_exists = os.path.exists(file_path) and os.path.getsize(file_path) > 0
        with open(file_path, 'a', newline='') as f:
            fieldnames = ['student_id', 'name', 'date', 'time', 'subject', 'status']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            
            for student in self.registered_students:
                if student['id'] not in present_students:
                    writer.writerow({
                        'student_id': student['id'],
                        'name': student['name'],
                        'date': current_date,
                        'time': current_time,
                        'subject': subject,
                        'status': 'Absent'
                    })
    
    
    
    def save_attendance(self, subject, student_id, name, status='Present'):
        current_time = datetime.now().strftime("%H:%M:%S")
        current_date = datetime.now().strftime("%Y-%m-%d")
        file_path = 'attendance.csv'

        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row['student_id'] == student_id and row['date'] == current_date and row['subject'] == subject:
                        return

        file_exists = os.path.exists(file_path) and os.path.getsize(file_path) > 0
        with open(file_path, 'a', newline='') as f:
            fieldnames = ['student_id', 'name', 'date', 'time', 'subject', 'status']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerow({
                'student_id': student_id,
                'name': name,
                'date': current_date,
                'time': current_time,
                'subject': subject,
                'status': status
            })

def validate_token(token):
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return True
    except jwt.InvalidTokenError:
        return False

def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({
                "success": False,
                "message": "Insufficient arguments",
                "error": "Usage error",
                "expected_args": ["operation", "subject", "image_path", "auth_token"],
                "received_args": sys.argv[1:] if len(sys.argv) > 1 else []
            }))
            return

        operation = sys.argv[1]
        auth_token = sys.argv[-1]

        if not validate_token(auth_token):
            print(json.dumps({
                "success": False,
                "message": "Unauthorized",
                "error": "Invalid token"
            }))
            return

        system = ArcFaceSystem()

        if operation == "register":
            if len(sys.argv) != 6:
                print(json.dumps({
                    "success": False,
                    "message": "Invalid number of arguments for registration"
                }))
                return

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
                print(json.dumps({
                    "success": False,
                    "message": "Invalid number of arguments for attendance"
                }))
                return

            subject = sys.argv[2]
            image_path = sys.argv[3]
            success, result = system.take_attendance_live(subject, image_path)
            
            if success:
                if isinstance(result, dict):
                    # Successful response with data
                    output = {
                        "success": True,
                        "message": result.get("message", "Attendance recorded successfully"),
                        "marked_count": result.get("marked_count", 0),
                        "recognized_students": result.get("recognized_students", []),
                        "processed_image_path": result.get("processed_image_path"),
                        "confidenceThreshold": system.threshold  # Include the threshold used
                    }
                else:
                    # Successful but with simple message
                    output = {
                        "success": True,
                        "message": str(result),
                        "marked_count": 0,
                        "recognized_students": []
                    }
            else:
                # Error response
                output = {
                    "success": False,
                    "message": str(result),
                    "error": "attendance_failed",
                    "error_details": str(result) if not isinstance(result, str) else None
                }

            print(json.dumps(output))

        else:
            print(json.dumps({
                "success": False,
                "message": f"Invalid operation: {operation}"
            }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": "Unexpected error occurred",
            "error": str(e),
            "trace": traceback.format_exc()
        }))


if __name__ == "__main__":
    main()
