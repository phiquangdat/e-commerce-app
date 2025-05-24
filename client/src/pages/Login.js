import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      window.location.href = "/api/auth/google";
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Login</h2>
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="login-button">
            Login
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <div className="social-login">
          <button
            type="button"
            className="social-button-goggle"
            onClick={handleGoogleLogin}
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="social-icon"
            />
            Continue with Google
          </button>
        </div>

        <div className="social-login">
          <button
            type="button"
            className="social-button-goggle"
            onClick={handleGoogleLogin}
          >
            <img
              src="https://www.facebook.com/favicon.ico"
              alt="Facebook"
              className="social-icon"
            />
            Continue with Facebook
          </button>
        </div>

        <p className="register-link">
          Don't have an account ? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
