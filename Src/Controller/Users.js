import mongoose from "mongoose";
import userModel from "../Models/Users.js";

function stripPassword(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.password;
  return o;
}

export const addUser = async (req, res) => {
    try {
        let { name, email, phone, password, shippingAddress} = req.body;

        if(!name || !email || !phone || !password) throw {Status: "Error", Message: "Incomplete Data!"}

        const user = await userModel.findOneAndUpdate({email},{
            name,
            email,
            phone: Number(phone),
            password,
            shippingAddress
        },{
            upsert: true,
            new: true
        })

        if(!user) return res.status(400).json({message: "Something Went Wring!"})
        
        return res.status(200).json(stripPassword(user))
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
}

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
    // Never promote/demote role via public profile API
    const updated = await userModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ message: "User not found." });
    return res.status(200).json(stripPassword(updated));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const user = await userModel.findOne({ email }).lean();
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
}