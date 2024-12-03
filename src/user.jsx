import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const User = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [storedImage, setStoredImage] = useState(null);
  const [attendance, setAttendance] = useState(null);

  const details = location.state?.result;
  const isLoggedIn = localStorage.getItem("userLoggedIn");
  const username = details[0]["name"];

  useEffect(() => {
    if (!isLoggedIn || isLoggedIn === "false") {
      navigate("/");
    }

    const fetchStoredImage = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/users/${username}/images`
        );
        setStoredImage(response.data.stored_image);
      } catch (error) {
        console.error("Failed to fetch stored image:", error);
      }
    };

    const fetchAttendance = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/user_attendance/${username}`
        );
        setAttendance(response.data);
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
        setAttendance({ error: "No attendance data found." });
      }
    };

    fetchStoredImage();
    fetchAttendance();
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
    setPrediction([]);
    const response = await fetch(imageSrc);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("image", blob, "uploaded_image.jpg");

    try {
      const response = await axios.post(
        "http://localhost:5000/user_recognize",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const results = response.data;

      setPrediction(results);

      setSelectedImage(null);
      setIsUploading(false);
    } catch (error) {
      console.error("Prediction failed:", error);
      setPrediction([{ name: "Error", probability: 0 }]);
    }
  };

  const handlePredictButton = () => {
    if (selectedImage) {
      predictFromImage(selectedImage);
    } else {
      console.error("No image uploaded");
    }
  };

  const logoutfun = () => {
    localStorage.setItem("userLoggedIn", "false");
    localStorage.removeItem("username");
    navigate("/login");
  };

  if (!isLoggedIn) {
    navigate("/"); // Redirect if the user is not logged in
    return null; // Prevent rendering the home page if not logged in
  }

  return (
    <div className="container mt-5">
      <div className="text-center">
        <h2>Welcome, {username}</h2>

        <div className="d-flex justify-content-between mt-4">
          {/* Prediction Section */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="form-control-file mb-3"
            />
            <button
              onClick={selectedImage ? handlePredictButton : undefined}
              className="btn btn-success me-2"
              disabled={!selectedImage}
            >
              {selectedImage ? "Predict" : "Capture and Predict"}
            </button>
            <button onClick={logoutfun} className="btn btn-danger ms-2">
              Log Out
            </button>
            <button
              onClick={() => {
                navigate("/crowd");
              }}
              className="btn btn-primary ms-2"
            >
              Crowd Analysis
            </button>

            {prediction.length > 0 && (
              <div className="mt-3">
                <h4>Prediction Results:</h4>
                <p>Number of faces detected: {prediction.length}</p>
                {prediction.map((result, index) => (
                  <p key={index}>
                    {result.name}: {(result.probability * 100).toFixed(2)}%
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="border rounded p-3" style={{ width: "250px" }}>
            {storedImage ? (
              <img
                src={`data:image/jpeg;base64,${storedImage}`}
                alt="Stored User"
                className="img-fluid shadow rounded"
                style={{
                  width: "126px",
                  height: "155px",
                }}
              />
            ) : (
              <p>No image found for this user.</p>
            )}
            <h4 className="mt-3">Username: {username}</h4>
            {/* Attendance Section */}
            <div>
              {attendance && (
                <div>
                  <h4>Attendance:</h4>
                  {attendance.error ? (
                    <p>{attendance.error}</p>
                  ) : (
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(attendance).map(
                          ([date, present], index) => (
                            <tr key={index}>
                              <td>{date}</td>
                              <td style={{ color: present ? "green" : "red" }}>
                                {present ? "Present" : "Absent"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default User;
