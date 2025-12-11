import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    // throw an error so signup/login handlers can return a 5xx with a clear message
    throw new Error("JWT_SECRET not set in environment");
  }

  // only include necessary fields in token payload
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username
  };

  return jwt.sign(payload, secret, { expiresIn: "7d" });
};


// ------------------------------------------------------
// SIGNUP (email + username + password)
// ------------------------------------------------------
export const signup = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: "Email, username, and password are required" });
    }

    // Check if user exists
    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users (email, username, password)
       VALUES ($1, $2, $3)
       RETURNING id, email, username`,
      [email, username, hashedPassword]
    );

    const user = newUser.rows[0];
    const token = generateToken(user);

    return res.status(201).json({
      message: "Signup successful",
      user,
      token,
    });

  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------------------------------------------
// LOGIN (email + password)
// ------------------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = userResult.rows[0];

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      token
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ------------------------------------------------------
// GET LOGGED-IN USER
// ------------------------------------------------------
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      "SELECT id, email, username FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    res.json(result.rows[0]);

  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
