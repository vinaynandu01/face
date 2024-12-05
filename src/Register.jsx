import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Navigate } from "react-router-dom";

const Register = () => {
  const webcamRef = useRef(null);
  const [decodedText, setDecodedText] = useState(""); // Store QR-decoded text
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false); // Loading state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // Toggle QR scanner visibility

  // To parse the decoded QR data
  const parseQrData = (data) => {
    const parts = data.split(",");
    return {
      rollNumber: parts[0],
      username: parts[1],
      fatherName: parts[2] || "N/A", // Father name might be empty
      phoneNumber: parts[4] || "N/A",
    };
  };

  const handleScan = (data) => {
    if (data) {
      const parsedData = parseQrData(data.text);
      setDecodedText(parsedData);
      setError("");
      console.log(error);
      setIsScannerOpen(false); // Close the scanner once QR code is decoded
    }
  };

  const handleError = (err) => {
    setError("Error accessing the camera or scanning QR code.");
    console.error(err);
  };

  const captureImages = async () => {
    setIsCapturing(true);
    let images = [];
    for (let i = 0; i < 7; i++) {
      const imageSrc = webcamRef.current.getScreenshot();
      images.push(imageSrc);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay of 0.5 seconds
    }
    setCapturedImages(images);
    setIsCapturing(false);
  };

  const sendImagesToBackend = async () => {
    if (!decodedText || capturedImages.length === 0) {
      alert("Please scan a QR code and capture images.");
      return;
    }

    const formData = new FormData();
    formData.append("RollNumber", decodedText.rollNumber);
    formData.append("Username", decodedText.username); // Use decoded text as username
    formData.append("FatherName", decodedText.fatherName);
    formData.append("phoneNumber", decodedText.phoneNumber);
    // Append all images to FormData
    capturedImages.forEach((image, index) => {
      const byteString = atob(image.split(",")[1]);
      const mimeString = image.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const file = new Blob([ab], { type: mimeString });
      formData.append(`image${index}`, file, `captured_image_${index}.jpg`);
    });

    try {
      setSuccess(!success);
      await axios.post("http://localhost:5000/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccess(!success);
      alert("User registered successfully!");
      Navigate("/QRscanner");
    } catch (error) {
      console.error("Failed to register user:", error);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 position-relative">
      {/* Left side: Camera */}
      <div
        className="border rounded p-4"
        style={{
          width: "600px",
          zIndex: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
        }}
      >
        <h2 className="text-center mb-4">Register User</h2>
        <div className="d-flex justify-content-center mb-3">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="border p-2 rounded"
            width={450} // Increased camera size by 50%
            height={360} // Increased camera height accordingly
          />
        </div>

        {/* Capture button: Disable it only during capturing */}
        {!capturedImages.length && !isCapturing && (
          <button
            onClick={captureImages}
            className="btn btn-primary me-2"
            disabled={isCapturing}
          >
            {isCapturing ? "Capturing Images..." : "Capture 7 Images"}
          </button>
        )}

        {/* Register User button: Enable after capturing images and scanning QR */}
        <button
          onClick={sendImagesToBackend}
          className="btn btn-success"
          disabled={isCapturing || capturedImages.length === 0 || !decodedText}
        >
          {success ? "Register User" : "Process may take a minute"}
        </button>
        {isCapturing && (
          <div className="mt-3">Capturing images, please wait...</div>
        )}
      </div>

      {/* Right side: QR Scanner Details */}
      <div
        className="ms-5"
        style={{
          zIndex: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {/* Display decoded QR data */}
        {decodedText && (
          <div
            className="alert alert-info text-center mb-3"
            style={{ width: "400px" }}
          >
            <h4>Decoded QR Code Details:</h4>
            <p>
              <strong>Roll Number:</strong> {decodedText.rollNumber}
            </p>
            <p>
              <strong>Username:</strong> {decodedText.username}
            </p>
            <p>
              <strong>Father's Name:</strong> {decodedText.fatherName}
            </p>
            <p>
              <strong>Phone Number:</strong> {decodedText.phoneNumber}
            </p>
          </div>
        )}
      </div>

      {/* Full-screen QR Scanner */}
      {isScannerOpen && (
        <div
          className="position-fixed top-0 left-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75"
          style={{ zIndex: 1 }}
        >
          <div
            className="position-relative w-75 h-75"
            style={{ maxWidth: "600px", maxHeight: "600px" }}
          >
            {/* Close Button Outside Camera View */}
            <span
              className="position-absolute top-0 end-0 p-3 text-white cursor-pointer"
              style={{
                fontSize: "24px",
                zIndex: 2,
                pointerEvents: "auto", // Ensure the button can be clicked
                cursor: "pointer", // Add pointer hover effect
              }}
              onClick={() => setIsScannerOpen(false)}
              title="Close Scanner"
            >
              X
            </span>
            <QrScanner
              delay={200}
              onError={handleError}
              onScan={handleScan}
              style={{
                height: "100%",
                width: "100%",
                objectFit: "cover",
                borderRadius: "8px",
              }}
              facingMode="environment"
            />
          </div>
        </div>
      )}

      {/* QR Scanner Toggle Button */}
      {!isScannerOpen && (
        <div
          className="position-absolute top-0 end-0 p-3"
          style={{ zIndex: 2 }}
        >
          <button
            className="btn btn-secondary"
            onClick={() => setIsScannerOpen(true)}
          >
            Open QR Scanner
          </button>
        </div>
      )}
      {/* Instructions Section */}
      <div
        className="mt-5 text-center p-4 border-top"
        style={{
          position: "",
          bottom: "0px",
          height: "auto",
          width: "100%",
          marginTop: "4vh",
          color: "#ffff",
          background: "rgb(100, 100, 100)",
        }}
      >
        <h4>Instructions for Capturing Images</h4>
        <p>
          Please ensure that you are in a well-lit environment to capture clear
          images.please remain still during the process. After or before
          capturing images <b> besure to scan QR code</b> to proceed with the
          process.(as it is required for your details)
        </p>
        <p>
          After capturing the images, the system will automatically register the
          user and navigate to login page.
        </p>
      </div>
    </div>
  );
};

export default Register;
