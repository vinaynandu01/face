import base64
import os
import cv2
import numpy as np
from flask import Flask, request, jsonify
from mtcnn.mtcnn import MTCNN
from keras_facenet import FaceNet
from sklearn.metrics.pairwise import cosine_similarity
from flask_cors import CORS
from flask_pymongo import PyMongo
from ultralytics import YOLO
from bson.objectid import ObjectId  # Import ObjectId for MongoDB
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense
from sklearn.preprocessing import LabelEncoder
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Initialize MTCNN detector and FaceNet model
detector = MTCNN()
embedder = FaceNet()

# Configure MongoDB
app.config["MONGO_URI"] = "mongodb://localhost:27017/facedb"  # Update with your MongoDB URI
mongo = PyMongo(app)
def create_cnn_embedding_model():
    model = Sequential([
        Conv2D(32, (3, 3), activation='relu', input_shape=(160, 160, 1)),
        MaxPooling2D(2, 2),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(512, activation='relu'),
        Dense(512, activation='linear')  # Final dense layer to produce a 512-dimensional embedding
    ])
    return model
cnn_model = create_cnn_embedding_model()
cnn_model.compile(optimizer='adam', loss='mse')  # Using MSE loss as we are not training for classification


@app.route('/login', methods=['POST'])
def login():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    file = request.files['image']
    image_data = file.read()
    image_array = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        return jsonify({"error": "Invalid image"}), 400

    # Detect the face using MTCNN
    faces = detector.detect_faces(image)
    if not faces:
        return jsonify({"error": "No face detected"}), 400

    # Process the first detected face
    x, y, w, h = faces[0]['box']
    cropped_face = cv2.resize(image[y:y+h, x:x+w], (160, 160))
    
    # Convert cropped face to grayscale for CNN model
    gray_face = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2GRAY).reshape(160, 160, 1)
    normalized_face = gray_face / 255.0  # Normalize pixel values to [0, 1]

    # Generate embedding using the CNN model
    cnn_embedding = cnn_model.predict(np.expand_dims(normalized_face, axis=0)).flatten()

    # Compare the embedding with stored embeddings in MongoDB
    if len(face_data) == 0:
        return jsonify({"message": "No registered faces", "probability": 0.0}), 200
    similarities = cosine_similarity([cnn_embedding], face_data)
    idx = np.argmax(similarities)
    best_match = similarities[0][idx]
    print(best_match)
    # Assuming 0.7 as the threshold for recognition
    recognized_id = labels[idx]  # ObjectId from the labels list
    recognized_name = names[recognized_id]  # Username from the names dict
    print(recognized_name)
    return jsonify({"name": recognized_name, "probability": float(best_match)}), 200
    
@app.route('/register', methods=['POST'])
def register():
    rollnumber = request.form["RollNumber"]
    username = request.form['Username']
    fathername = request.form["FatherName"]
    phoneno = request.form["phoneNumber"]
    embeddings = []
    stored_image = None  # To store the first grayscale image

    for i in range(5):  # Assume 5 images are uploaded
        image_file = request.files[f'image{i}']
        image_data = image_file.read()

        # Convert to numpy array
        image_array = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        # Detect face in image
        faces = detector.detect_faces(image)
        if faces:
            x, y, w, h = faces[0]['box']  # Using the first detected face
            x, y = max(0, x), max(0, y)  # Ensure box coordinates are positive
            cropped_face = cv2.resize(image[y:y+h, x:x+w], (160, 160))
            
            # Convert cropped face to RGB
            rgb_face = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
            embedding = embedder.embeddings(np.expand_dims(rgb_face, axis=0)).flatten()
            embeddings.append(embedding)

            # Save the first grayscale face as base64 for later retrieval
            if stored_image is None:
                _, buffer = cv2.imencode('.jpg', cv2.cvtColor(cropped_face, cv2.COLOR_BGR2GRAY))
                stored_image = base64.b64encode(buffer).decode('utf-8')
        else:
            return jsonify({"error": f"No face detected in image {i}"}), 400

    if not embeddings:
        return jsonify({"error": "No valid faces detected in the uploaded images"}), 400

    # Calculate the mean embedding from the 5 images
    mean_embedding = np.mean(np.array(embeddings), axis=0).astype(float).tolist()


    # Create the user data structure
    id = len(face_data)+1
    user_data = {
        'RollNumber':rollnumber,
        'username': username,
        'FatherName':fathername,
        'phoneNumber':phoneno,
        'embeddings': mean_embedding,  # Store the mean of 5 embeddings
        'stored_image': stored_image,  
        'id':id# Base64 of the first grayscale image
    }

    # Insert into MongoDB
    mongo.db.data.insert_one(user_data)
    mongo.db.attendance.insert_one({"username":username,"id":id})

    # Reload embeddings after new user registration
    reload_embeddings()
    return jsonify({"message": "User registered successfully!"}), 201

# Load embeddings from MongoDB for recognition
@app.route('/get_users', methods=['GET'])
def get_users():
    users = list(mongo.db.data.find({}, {"id": 1, "username": 1}))  # Fetch only _id and username
    user_count = len(users)
    return jsonify({"users": [user['username'] for user in users], "count": user_count})

def load_embeddings_from_db():
    users = list(mongo.db.data.find())
    face_data = []
    labels = []
    names = {}

    for user in users:
        face_data.append(user["embeddings"])
        labels.append(user['id'])  # Keep the ObjectId
        names[user['id']] = user['username']  # Use ObjectId as key

    return (face_data, labels, names) if face_data else ([], [], {})

# Load face embeddings from MongoDB initially
face_data, labels, names = load_embeddings_from_db()

# Reload embeddings to update after a new registration
def reload_embeddings():
    global face_data, labels, names
    face_data, labels, names = load_embeddings_from_db()

# Recognize faces using MongoDB-stored embeddings
model = YOLO('yolov5s.pt')  # Replace with your YOLO model path


@app.route('/crowd', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    # Read the image from the request
    file = request.files['image']
    img_array = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    # Perform YOLO detection
    results = model.predict(source=img, conf=0.5)  # Confidence threshold
    detections = results[0].boxes.xyxy  # Bounding boxes
    labels = results[0].boxes.cls.cpu().numpy()  # Class labels
    human_boxes = [box for box, label in zip(detections, labels) if int(label) == 0]  # Filter humans

    # Draw bounding boxes for humans only
    human_count = 0
    for box in human_boxes:
        x1, y1, x2, y2 = map(int, box[:4])
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        human_count += 1

    # Convert the processed image to Base64
    _, buffer = cv2.imencode('.jpg', img)
    encoded_image = base64.b64encode(buffer).decode('utf-8')

    return jsonify({'count': human_count, 'image': encoded_image})

def recognize_faces_in_image(image):
    if len(face_data) == 0:
        return [{"name": "No registered faces", "probability": 0.0}]

    faces = detector.detect_faces(image)
    results = []
    for face in faces:
        x, y, width, height = face['box']
        cropped_face = cv2.resize(image[y:y+height, x:x+width], (160, 160))
        
        # Convert cropped face to RGB
        rgb_face = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
        embedding = embedder.embeddings(np.expand_dims(rgb_face, axis=0)).flatten()  # Use RGB face here

        # Compare with stored embeddings in MongoDB
        similarities = cosine_similarity([embedding], face_data)
        idx = np.argmax(similarities)
        best_match = similarities[0][idx]

        if best_match > 0.7:
            recognized_id = labels[idx] # Get the ObjectId
            recognized_name = names[recognized_id]  # Use ObjectId to get the username
            results.append({"name": recognized_name, "probability": float(best_match)})
        else:
            results.append({"name": "Unknown", "probability": float(best_match)})
    return results

@app.route('/users/<username>/images', methods=['GET'])
def get_user_images(username):
    user = mongo.db.data.find_one({"username": username})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Retrieve the stored image in base64 format
    return jsonify({"stored_image": user['stored_image']})


@app.route('/recognize', methods=['POST'])
def recognize():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    image_data = file.read()
    image_array = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({"error": "Invalid image"}), 400

    results = recognize_faces_in_image(image)
    today = datetime.now().strftime("%Y-%m-%d")
    for result in results:
        if result['name'] != "Unknown":  # Only log attendance for recognized users
            mongo.db.attendance.update_one(
                {'username': result['name']},
                {'$set': {today: True}},  # Mark as present for today
                upsert=True
            )
    return jsonify(results)

@app.route('/user_recognize', methods=['POST'])
def user_recognize():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"},), 400

    file = request.files['image']
    image_data = file.read()
    image_array = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({"error": "Invalid image"}), 400

    results = recognize_faces_in_image(image)
    return jsonify(results)

@app.route('/user_attendance/<username>', methods=['GET'])
def get_user_attendance(username):
    # Check if the user exists in the database
    user = mongo.db.data.find_one({'username': username})
    if user is None:
        return jsonify({"error": "User not found"}), 404

    # Fetch the attendance data for the user
    attendance = mongo.db.attendance.find_one({'username': username}, {'_id': 0, 'username': 0,"id":0})
    if attendance is None:
        return jsonify({"error": "No attendance data found"}), 404

    # Return the attendance data
    return jsonify(attendance)

    

@app.route('/reload_embeddings', methods=['POST'])
def reload_embeddings_route():
    reload_embeddings()
    return jsonify({"message": "Embeddings reloaded successfully"}), 200

@app.route('/attendance',methods=['GET'])
def get_attendance():
    records = list(mongo.db.attendance.find({}, {"_id": 0}))
    return jsonify({"attendance": records})


if __name__ == '__main__':
    app.run(debug=True)
