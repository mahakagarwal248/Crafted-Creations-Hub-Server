import express from "express";
import { addUser, login, updateUserProfile } from "../Controller/Users.js";
const router = express.Router();

router.post("/", addUser);
router.post("/login", login);
router.patch("/:id", updateUserProfile);

export default router;
