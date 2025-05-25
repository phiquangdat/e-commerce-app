import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./AuthCallback.css";
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      await checkAuth();
      navigate("/");
    } else {
      navigate("/login");
    }
  } catch (error) {
    console.error("Error during authentication callback:", error);
    navigate("/login");
  }
};
  handleCallback();
  }
  , [navigate, location]);

  return (
    <div className="auth-callback">
     <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Completing authentication...</p>
     </div>
    </div>
  );
}
