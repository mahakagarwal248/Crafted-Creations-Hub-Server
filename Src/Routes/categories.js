import express from "express";
import {
  createCategory,
  getCategories,
  getFeaturedHomepageCategories,
  setFeaturedHomepageCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../Controller/Category.js";

const router = express.Router();

router.get("/featured/homepage", getFeaturedHomepageCategories);
router.put("/featured/homepage", setFeaturedHomepageCategories);
router.post("/", createCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
