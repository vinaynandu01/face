import React, { useState } from "react";
import axios from "axios";

const DisplayImages = () => {
  const [username, setUsername] = useState(""); // State for the input username
  const [storedImage, setStoredImage] = useState(null); // To hold the user's stored image
  const [error, setError] = useState(null); // To hold error messages
  const [data, setdata] = useState([]);
  const fetchStoredImage = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError(null); // Clear any previous errors
    setStoredImage(null); // Clear previous stored image

    try {
      const response = await axios.get(
        `http://localhost:5000/users/${username}/images`
      );
      const details = response.data["details"];
      console.log(details);
      setdata(details);
      const stored_image = details["stored_image"];
      // Get the stored image from the response
      setStoredImage(stored_image); // Set the stored image
    } catch (error) {
      console.error("Failed to fetch stored image:", error);
      setError("Failed to fetch stored image. Please try again later.");
    }
  };

  return (
    <div className="text-center">
      <h2>Display User details</h2>

      <form onSubmit={fetchStoredImage}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
        />
        <button type="submit">Fetch Image</button>
      </form>
      <h4> Stored image:</h4>
      {error && <p className="text-danger">{error}</p>}
      {storedImage ? (
        <img
          src={`data:image/jpeg;base64,${storedImage}`}
          alt="Stored User"
          style={{ width: "100px", height: "100px", margin: "5px" }}
        />
      ) : (
        <p>No image found for this user.</p>
      )}
      <h4>Roll Number : {data["RollNumber"]}</h4>
      <h4>Name : {data["username"]}</h4>
      <h4>Father Name : {data["FatherName"]}</h4>
    </div>
  );
};

export default DisplayImages;
