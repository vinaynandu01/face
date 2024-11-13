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
from bson.objectid import ObjectId  # Import ObjectId for MongoDB

app = Flask(__name__)
CORS(app)

# Initialize MTCNN detector and FaceNet model
detector = MTCNN()
embedder = FaceNet()

# Configure MongoDB
app.config["MONGO_URI"] = "mongodb://localhost:27017/facedb"  # Update with your MongoDB URI
mongo = PyMongo(app)

@app.route('/register', methods=['POST'])
def register():
    username = request.form['username']
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
            cropped_face = cv2.resize(image[y:y+h, x:x+w], (160, 160))
            
            # Convert cropped face to RGB
            rgb_face = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2RGB)
            embedding = embedder.embeddings(np.expand_dims(rgb_face, axis=0)).flatten()
            embeddings.append(embedding.tolist())

            # Save the first grayscale face as base64 for later retrieval
            if stored_image is None:
                _, buffer = cv2.imencode('.jpg', cv2.cvtColor(cropped_face, cv2.COLOR_BGR2GRAY))
                stored_image = base64.b64encode(buffer).decode('utf-8')
        else:
            return jsonify({"error": f"No face detected in image {i}"}), 400

    # Store user data with embeddings and one image in MongoDB
    user_data = {
        'username': username,
        'embeddings': embeddings,
        'stored_image': stored_image  # Store one image in base64 format
    }
    mongo.db.users.insert_one(user_data)

    # Reload embeddings after new user registration
    reload_embeddings()
    return jsonify({"message": "User registered successfully!"}), 201

# Load embeddings from MongoDB for recognition
@app.route('/get_users', methods=['GET'])
def get_users():
    users = list(mongo.db.users.find({}, {"_id": 1, "username": 1}))  # Fetch only _id and username
    user_count = len(users)
    return jsonify({"users": [user['username'] for user in users], "count": user_count})

def load_embeddings_from_db():
    users = list(mongo.db.users.find())
    face_data = []
    labels = []
    names = {}

    for user in users:
        for embedding in user['embeddings']:
            face_data.append(np.array(embedding))
            labels.append(user['_id'])  # Keep the ObjectId
        names[user['_id']] = user['username']  # Use ObjectId as key

    return (np.array(face_data), labels, names) if face_data else ([], [], {})

# Load face embeddings from MongoDB initially
face_data, labels, names = load_embeddings_from_db()

# Reload embeddings to update after a new registration
def reload_embeddings():
    global face_data, labels, names
    face_data, labels, names = load_embeddings_from_db()

# Recognize faces using MongoDB-stored embeddings
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
            recognized_id = labels[idx]  # Get the ObjectId
            recognized_name = names[recognized_id]  # Use ObjectId to get the username
            results.append({"name": recognized_name, "probability": float(best_match)})
        else:
            results.append({"name": "Unknown", "probability": float(best_match)})

    return results

@app.route('/users/<username>/images', methods=['GET'])
def get_user_images(username):
    user = mongo.db.users.find_one({"username": username})
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
    return jsonify(results)

@app.route('/reload_embeddings', methods=['POST'])
def reload_embeddings_route():
    reload_embeddings()
    return jsonify({"message": "Embeddings reloaded successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)
