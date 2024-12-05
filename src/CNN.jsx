import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const CNN = () => {
  const webcamRef = useRef(null);
  const [rollnumber, setRollNumber] = useState("");
  const [message, setMessage] = useState("");
  const [process, setProcess] = useState(false);
  const [reco, setReco] = useState(null);

  // Function to capture image and verify it
  const captureAndVerify = async () => {
    setProcess(true);
    setMessage(""); // Clear any previous messages
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setMessage("Failed to capture image. Please try again.");
      setProcess(false);
      return;
    }

    const responseData = imageSrc.split(",")[1]; // Get base64 data
    const blob = await fetch(`data:image/jpeg;base64,${responseData}`).then(
      (res) => res.blob()
    );

    const formData = new FormData();
    formData.append("image", blob, "captured_image.jpg"); // Append blob
    formData.append("rollnumber", rollnumber);

    try {
      const response = await axios.post(
        "http://localhost:5000/login",
        formData
      );
      const result = response.data;
      console.log(result);

      if (result.probability > 0.5) {
        setReco(`Welcome, ${rollnumber}!`);
      } else {
        setReco("Face not recognized. Please try again.");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      if (error.response) {
        // Server responded with a status other than 200
        setMessage("Server error: " + error.response.data.error);
      } else {
        setMessage("Network error. Please check your connection.");
      }
    } finally {
      setProcess(false);
    }
  };

  return (
    <div
      className="text-center"
      style={{
        maxWidth: "600px",
        margin: "auto",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
        padding: "20px",
        borderRadius: "8px",
      }}
    >
      <h2 className="my-4">Login with CNN model (custom made)</h2>

      <div style={{ width: "80%", margin: "0 auto" }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          style={{ width: "100%", maxWidth: "800px", height: "auto" }}
          className="mb-3"
        />
      </div>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Enter Roll Number"
        value={rollnumber}
        onChange={(e) => setRollNumber(e.target.value)}
      />
      <button
        onClick={captureAndVerify}
        className="btn btn-primary"
        disabled={process}
      >
        {process ? "Processing..." : "Capture and Verify"}
      </button>
      {reco && <p className="mt-3 text-success">{reco}</p>}
      {message && <p className="mt-2 text-danger">{message}</p>}
    </div>
  );
};

export default CNN;
