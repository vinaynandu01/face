import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [prediction, setPrediction] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false); // New loading state
  const [userList, setUserList] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [userImage, setUserImage] = useState(null);
  const username = location.state?.username;
  const [storedImage, setStoredImage] = useState(null);

  useEffect(() => {
    const fetchStoredImage = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/users/${username}/images`
        );
        setStoredImage(response.data.stored_image); // Assuming the API returns a base64 image
      } catch (error) {
        console.error("Failed to fetch stored image:", error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/get_users");
        setUserList(response.data.users);
        setUserCount(response.data.count);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchStoredImage();
    fetchUsers();

    setUserImage(
      location.state?.userImage || "path/to/default/profile/image.jpg"
    );
  }, [username, location.state]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setIsUploading(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureAndPredict = async () => {
    const imageSrc = selectedImage
      ? selectedImage
      : webcamRef.current.getScreenshot();
    const response = await fetch(imageSrc);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("image", blob, "captured_image.jpg");

    setLoading(true); // Start loading

    try {
      const response = await axios.post(
        "http://localhost:5000/recognize",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setPrediction(response.data);
      setSelectedImage(null);
      setIsUploading(false);
    } catch (error) {
      console.error("Prediction failed:", error);
      setPrediction([{ name: "Error", probability: 0 }]);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const navigateToDisplayImages = () => {
    navigate("/display-images");
  };

  return (
    <div className="d-flex">
      <div className="text-center flex-grow-1">
        <h2>Welcome, {username}</h2>

        {/* Loading message during prediction */}
        {loading ? (
          <p
            className="text-primary font-weight-bold my-3"
            style={{ fontSize: "1.2em" }}
          >
            Loading... prediction is processing.
          </p>
        ) : (
          <>
            <div className="d-flex justify-content-center mb-3">
              {!isUploading && (
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="border p-2 rounded"
                  videoConstraints={{
                    width: 320,
                    height: 240,
                    facingMode: "user",
                  }}
                />
              )}
            </div>
            <div className="mb-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="form-control-file"
              />
            </div>
            <button
              onClick={captureAndPredict}
              className="btn btn-success me-2"
            >
              {isUploading ? "Predict" : "Capture and Predict"}
            </button>
            <button
              onClick={() => navigate("/register")}
              className="btn btn-primary ms-2"
            >
              Register New User
            </button>
            <button
              onClick={() => navigate("/login")}
              className="btn btn-danger ms-2"
            >
              Log Out
            </button>
            <button
              onClick={navigateToDisplayImages}
              className="btn btn-info ms-2"
            >
              View User Images
            </button>

            {prediction.length > 0 && (
              <div className="mt-3">
                <p>Number of faces detected: {prediction.length}</p>
                {prediction.map((result, index) => (
                  <p key={index}>
                    {result.name}: {(result.probability * 100).toFixed(2)}%
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border rounded p-3 ms-3" style={{ width: "250px" }}>
        {storedImage ? (
          <div
            className="d-flex justify-content-center p-3"
            style={{ width: "190px" }}
          >
            <img
              src={`data:image/jpeg;base64,${storedImage}`}
              alt="Stored User"
              className="img-fluid shadow rounded"
              style={{
                width: "126px",
                height: "155px",
              }}
            />
          </div>
        ) : (
          <p>No image found for this user.</p>
        )}

        <h4>Registered Users</h4>
        <p>Total Users: {userCount}</p>
        <ul className="list-group">
          {userList.map((user, index) => (
            <li key={index} className="list-group-item">
              {user}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home;
