import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import DisplayImages from "./DisplayImages";

function App() {
  return (
    <Router>
      <nav
        className="navbar navbar-expand-lg fixed-top"
        style={{ backgroundColor: "#007bff" }}
      >
        <div className="container">
          <a className="navbar-brand text-white" href="/">
            Face Recognition KMIT
          </a>
          <div className="navbar-nav ml-auto">
            <a className="nav-link text-white" href="/login">
              Login
            </a>
            <a className="nav-link text-white" href="/register">
              Register
            </a>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: "80px" }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="display-images" element={<DisplayImages />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
