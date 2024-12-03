import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ element, ...rest }) => {
  // Check if the user is logged in (You can check this from localStorage, sessionStorage, or state)
  const isLoggedIn = localStorage.getItem("userLoggedIn"); // Replace with actual login check logic

  // If not logged in, redirect to login page
  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  // If logged in, render the protected route
  return element;
};

export default ProtectedRoute;
