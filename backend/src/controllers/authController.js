import { validationResult } from "express-validator";
import User from "../models/User.js";
import { generateToken } from "../utils/token.js";

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, walletAddress } = req.body;

  if (!name || !email || !password || !walletAddress) {
    return res.status(400).json({ message: "name, email, password, and walletAddress are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedWallet = String(walletAddress).trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role,
    walletAddress: normalizedWallet,
  });
  const token = generateToken(user._id);
  return res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
    },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const match = await user.matchPassword(password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });
  const token = generateToken(user._id);
  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
    },
  });
};

export const profile = async (req, res) => {
  return res.json({ user: req.user });
};
