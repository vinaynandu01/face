import React, { useState, useRef } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import { Navigate } from "react-router-dom";

function Crowd() {
  const [image, setImage] = useState(null); // Stores captured image
  const [processedImage, setProcessedImage] = useState(null); // Stores processed image from backend
  const [humanCount, setHumanCount] = useState(null); // Number of humans detected
  const [isCameraOpen, setIsCameraOpen] = useState(false); // Toggle for webcam
  const [isLoading, setIsLoading] = useState(false); // Loading state for submission
  const webcamRef = useRef(null); // Reference to Webcam component
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user", // Use "environment" for back camera on mobile
  };
  const isLoggedIn = localStorage.getItem("userLoggedIn");
  if (!isLoggedIn || isLoggedIn === "false") {
    Navigate("/");
  }
  const handleOpenCamera = () => {
    setIsCameraOpen(!isCameraOpen); // Open the camera
  };

  const captureImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot(); // Capture image from webcam
      if (imageSrc) {
        // Convert base64 to file
        const byteString = atob(imageSrc.split(",")[1]);
        const mimeString = imageSrc.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], "captured_image.jpg", {
          type: "image/jpeg",
        });
        setImage(file);
        alert("Image captured successfully!");
      } else {
        alert("Failed to capture image.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      alert("Please upload or capture an image.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await axios.post(
        "http://localhost:5000/crowd", // Backend URL
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setProcessedImage(`data:image/jpeg;base64,${response.data.image}`);
      setHumanCount(response.data.count);
    } catch (error) {
      console.error("Error processing the image:", error);
      alert("Error processing the image.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">Crowd Analysis</h1>

      {/* File Upload */}
      <div className="mb-4">
        <input
          type="file"
          className="form-control mb-3"
          style={{ width: "50%" }}
          onChange={(e) => setImage(e.target.files[0])}
        />
        <button className="btn btn-primary me-2" onClick={handleOpenCamera}>
          Open Camera
        </button>
        <button className="btn btn-primary me-2" onClick={captureImage}>
          Capture Image
        </button>
      </div>

      {/* Live Camera Feed */}
      {isCameraOpen && (
        <div className="camera-container mb-4">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="w-50"
            style={{
              height: "auto",
              border: "2px solid #ccc",
              borderRadius: "10px",
            }}
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="mb-4">
        <button
          className="btn btn-success"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Submit"}
        </button>
      </div>

      {/* Display Processed Image and Human Count */}
      {processedImage && (
        <div className="mt-4">
          {humanCount !== null && (
            <div className="mt-3">
              <h3>Number of Humans Detected: {humanCount}</h3>
            </div>
          )}
          <h5>Processed Image:</h5>
          <img
            src={processedImage}
            alt="Processed"
            className="img-fluid mt-3"
          />
        </div>
      )}
    </div>
  );
}

export default Crowd;
