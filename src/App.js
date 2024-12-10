import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import DisplayImages from "./DisplayImages";
import Crowd from "./crowd";
import Attendence from "./attendence";
import QrCodeScanner from "./QrCodeScanner";
import ProtectedRoute from "./ProtectedRoute"; // Import the ProtectedRoute component
import User from "./user";
import CNN from "./CNN";

function App() {
  const uname = localStorage.getItem("username");
  const Navbar = () => {
    if (uname === "23BD1A056D") {
      return (
        <nav
          className="navbar navbar-expand-lg fixed-top"
          style={{ backgroundColor: "#007bff" }}
        >
          <div className="container">
            <a className="navbar-brand text-white" href="/home">
              Face Recognition KMIT
            </a>
            <div className="navbar-nav ml-auto">
              <a className="nav-link text-white" href="/QRscanner">
                Login
              </a>
              <a className="nav-link text-white" href="/register">
                Register
              </a>
              <a className="nav-link text-white" href="/attendence">
                Attendence
              </a>
              <a className="nav-link text-white" href="/crowd-analysis">
                Crowd Count
              </a>
              <a className="nav-link text-white" href="/CNN-login">
                Custom CNN
              </a>
            </div>
          </div>
        </nav>
      );
    } else {
      return (
        <nav
          className="navbar navbar-expand-lg fixed-top"
          style={{ backgroundColor: "#007bff" }}
        >
          <div className="container">
            <a className="navbar-brand text-white" href="/user">
              Face Recognition KMIT
            </a>
            <div className="navbar-nav ml-auto">
              <a className="nav-link text-white" href="/login">
                Login
              </a>
              <a className="nav-link text-white" href="/register">
                Register
              </a>
              <a className="nav-link text-white" href="/CNN-Login">
                CNN login
              </a>
            </div>
          </div>
        </nav>
      );
    }
  };
  return (
    <Router>
      {<Navbar />}

      <div className="container" style={{ paddingTop: "80px" }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/CNN-login" element={<CNN />} />
          {/* Use ProtectedRoute for the routes that require login */}
          <Route path="/home" element={<ProtectedRoute element={<Home />} />} />
          <Route
            path="/display-images"
            element={<ProtectedRoute element={<DisplayImages />} />}
          />
          <Route
            path="/crowd-analysis"
            element={<ProtectedRoute element={<Crowd />} />}
          />
          <Route
            path="/attendence"
            element={<ProtectedRoute element={<Attendence />} />}
          />
          <Route path="/user" element={<ProtectedRoute element={<User />} />} />
          <Route path="/QRscanner" element={<QrCodeScanner />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
