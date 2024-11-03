import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Login = () => {
  const webcamRef = useRef(null);
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  // Function to capture image and verify it
  const captureAndVerify = async () => {
    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      setMessage("Failed to capture image. Please try again.");
      return;
    }

    const responseData = imageSrc.split(",")[1]; // Get base64 data
    const blob = await fetch(`data:image/jpeg;base64,${responseData}`).then(
      (res) => res.blob()
    );

    const formData = new FormData();
    formData.append("image", blob, "captured_image.jpg"); // Append blob

    try {
      const response = await axios.post(
        "http://localhost:5000/recognize",
        formData
      );
      const result = response.data;

      // Check for recognized faces
      if (result.length && result[0].name !== "Unknown") {
        navigate("/home", { state: { username: result[0].name } });
      } else {
        setMessage("Face not recognized.");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      if (error.response) {
        // Server responded with a status other than 200
        setMessage("Server error: " + error.response.data.error);
      } else {
        setMessage("Network error. Please check your connection.");
      }
    }
  };

  return (
    <div
      className="text-center"
      style={{
        maxWidth: "400px",
        margin: "auto",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
        padding: "20px",
        borderRadius: "8px",
      }}
    >
      <h2 className="my-4">Login with Face Recognition</h2>
      <div style={{ width: "80%", margin: "0 auto" }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          style={{ width: "100%", maxWidth: "500px", height: "auto" }}
          className="mb-3"
        />
      </div>
      <button onClick={captureAndVerify} className="btn btn-primary">
        Capture and Verify
      </button>
      <p className="mt-2 text-danger">{message}</p>
    </div>
  );
};

export default Login;
