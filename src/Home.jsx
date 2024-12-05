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
  const [userList, setUserList] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [storedImage, setStoredImage] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);

  const username = location.state?.admin;
  console.log(username);
  const isLoggedIn = localStorage.getItem("userLoggedIn");

  useEffect(() => {
    if (!isLoggedIn || isLoggedIn === "false") {
      navigate("/");
    }
    const fetchStoredImage = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/users/${username}/images`
        );
        setStoredImage(response.data["details"]["stored_image"]);
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
  }, [username, navigate, isLoggedIn]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setIsUploading(!isUploading);
      };
      reader.readAsDataURL(file);
    }
  };

  const predictFromImage = async (imageSrc) => {
    setIsRunning(true);
    setPrediction(!prediction);
    const response = await fetch(imageSrc);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("image", blob, "uploaded_image.jpg");

    try {
      const response = await axios.post(
        "http://localhost:5000/recognize",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const results = response.data;

      setPrediction(results);

      results.forEach((result) => {
        if (
          !attendanceList.some(
            (attendedUser) => attendedUser.name === result.name
          )
        ) {
          setAttendanceList((prev) => [...prev, result]);
        }
      });
    } catch (error) {
      console.error("Prediction failed:", error);
      setPrediction([{ name: "Error", probability: 0 }]);
    } finally {
      setIsRunning(false);
      setSelectedImage(null);
      setIsUploading(false);
    }
  };

  const captureAndPredict = async () => {
    if (!webcamRef.current) {
      console.error("Webcam is not available");
      return;
    }
    const imageSrc = webcamRef.current.getScreenshot();
    await predictFromImage(imageSrc);
  };

  const handlePredictButton = () => {
    if (selectedImage) {
      predictFromImage(selectedImage);
    } else {
      console.error("No image uploaded");
    }
  };

  const handleToggleCamera = () => {
    if (isCameraOn) {
      clearInterval(intervalId);
      setIsCameraOn(!isCameraOn);
    } else {
      setIsCameraOn(true);
      const id = setInterval(() => {
        captureAndPredict();
      }, 2000);
      setIntervalId(id);
    }
  };

  const navigateToDisplayImages = () => {
    navigate("/display-images");
  };

  const logoutfun = () => {
    localStorage.setItem("userLoggedIn", "false");
    localStorage.removeItem("username");
    navigate("/QRscanner");
  };

  if (!isLoggedIn) {
    navigate("/"); // Redirect if the user is not logged in
    return null; // Prevent rendering the home page if not logged in
  }

  return (
    <div className="d-flex">
      <div className="text-center flex-grow-1">
        <h2>Welcome, vinay</h2>
        <div className="d-flex justify-content-center mb-3">
          {isCameraOn && (
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

        <button onClick={handlePredictButton} className="btn btn-success me-2">
          {selectedImage ? "Predict" : "upload image"}
        </button>

        <button onClick={handleToggleCamera} className="btn btn-primary ms-2">
          {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
        </button>

        <button onClick={logoutfun} className="btn btn-danger ms-2">
          Log Out
        </button>
        <button onClick={navigateToDisplayImages} className="btn btn-info ms-2">
          View User details
        </button>
        <h4>{isRunning ? "processing may take a minute..." : " "}</h4>
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

        <div className="mt-3">
          <h4>Attendance</h4>
          {attendanceList.length > 0 ? (
            <ul className="list-group">
              {attendanceList.map((user, index) => (
                <li key={index} className="list-group-item">
                  {user.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>No users marked as present yet.</p>
          )}
        </div>
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
