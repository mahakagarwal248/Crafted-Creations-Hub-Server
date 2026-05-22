import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import userModel from "../Models/Users.js";
import { signAuthToken } from "../Utils/jwt.js";

const BCRYPT_ROUNDS = 10;

function stripPassword(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.password;
  return o;
}

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value);
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(String(plain), stored);
  }
  // Backward compatibility for accounts created before hashing.
  return String(plain) === String(stored);
}

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, password, shippingAddress } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "Incomplete data." });
    }

    const existing = await userModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashed = await hashPassword(password);
    const user = await userModel.create({
      name,
      email,
      phone: Number(phone),
      password: hashed,
      shippingAddress,
    });

    const safe = stripPassword(user);
    const token = signAuthToken(user);
    return res.status(201).json({ ...safe, token });
  } catch (error) {
    console.error("addUser:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }
    const { name, phone, shippingAddress } = req.body;
    const updates = {};
    if (name != null && String(name).trim()) updates.name = String(name).trim();
    if (phone != null && String(phone).trim() !== "") {
      const n = Number(phone);
      if (!Number.isNaN(n)) updates.phone = n;
    }
    if (shippingAddress && typeof shippingAddress === "object") {
      updates.shippingAddress = {
        address: shippingAddress.address != null ? String(shippingAddress.address).trim() : undefined,
        city: shippingAddress.city != null ? String(shippingAddress.city).trim() : undefined,
        state: shippingAddress.state != null ? String(shippingAddress.state).trim() : undefined,
        zip: shippingAddress.zip != null ? String(shippingAddress.zip).trim() : undefined,
      };
    }
    const updated = await userModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ message: "User not found." });
    return res.status(200).json(stripPassword(updated));
  } catch (error) {
    console.error("updateUserProfile:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Upgrade legacy plaintext password silently on successful login.
    if (!isBcryptHash(user.password)) {
      try {
        user.password = await hashPassword(password);
        await user.save();
      } catch (err) {
        console.warn("Password upgrade failed:", err?.message);
      }
    }

    const safe = stripPassword(user);
    const token = signAuthToken(user);
    return res.status(200).json({ ...safe, token });
  } catch (error) {
    console.error("login:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
