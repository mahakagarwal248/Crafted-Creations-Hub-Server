import express from "express";
import { addUser, login, updateUserProfile } from "../Controller/Users.js";
import { requireSelfOrAdmin } from "../Middleware/auth.js";

const router = express.Router();

router.post("/", addUser);
router.post("/login", login);
router.patch("/:id", requireSelfOrAdmin("id"), updateUserProfile);

export default router;
