import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import useUserStore from "../store/useUserStore";

export default function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const { setUser } = useUserStore();
  const navigate = useNavigate();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,}$/;

  const validate = () => {
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    } else if (!emailRegex.test(formData.email)) {
      toast.error("Enter a valid email address");
      return false;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return false;
    } else if (!passwordRegex.test(formData.password)) {
      toast.error(
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character"
      );
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = await fetch(
        "http://localhost:3000/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("token", data.token);
        toast.success("Signup successful!");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        fontFamily: "'Poppins', sans-serif",
        background:
          "linear-gradient(180deg,#021124 0%, #04182a 40%), url('https://images.unsplash.com/photo-1507842217343-583bb7270b66')",
        backgroundBlendMode: "overlay",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(2,9,23,0.6)",
          zIndex: 0,
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "min(560px, 92%)",
          padding: "36px",
          borderRadius: "16px",
          background: "linear-gradient(180deg, rgba(2,18,30,0.75), rgba(3,28,45,0.7))",
          boxShadow: "0 12px 40px rgba(2,12,30,0.6)",
          border: "1px solid rgba(77,163,255,0.06)",
          zIndex: 2,
          color: "#E6F6FF",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "22px",
            color: "#BEE9FF",
            fontWeight: 600,
            letterSpacing: "1px",
            fontSize: "26px",
          }}
        >
          Create Your Account
        </h2>

        {["username", "email", "password"].map((field) => (
          <div key={field} style={{ marginBottom: "16px", width: "100%" }}>
            <input
              type={field === "password" ? "password" : "text"}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={
                field === "username" ? "Username" : field.charAt(0).toUpperCase() + field.slice(1)
              }
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(180, 225, 255, 0.06)",
                background: "rgba(255,255,255,0.02)",
                color: "#E6F6FF",
                fontSize: "15px",
                outline: "none",
                transition: "all 0.18s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.background = "rgba(255,255,255,0.03)";
                e.target.style.borderColor = "rgba(77,163,255,0.35)";
              }}
              onBlur={(e) => {
                e.target.style.background = "rgba(255,255,255,0.02)";
                e.target.style.borderColor = "rgba(180, 225, 255, 0.06)";
              }}
            />
          </div>
        ))}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(90deg,#00c6ff,#0072ff)",
            color: "white",
            fontWeight: 600,
            fontSize: "16px",
            cursor: "pointer",
            transition: "transform 0.15s ease",
            marginTop: "6px",
            letterSpacing: "0.4px",
          }}
          onMouseOver={(e) => {
            e.target.style.transform = "scale(1.02)";
          }}
          onMouseOut={(e) => {
            e.target.style.transform = "scale(1)";
          }}
        >
          Sign Up
        </button>
      </form>

      <ToastContainer theme="dark" position="top-right" autoClose={4000} />
    </div>
  );
}
