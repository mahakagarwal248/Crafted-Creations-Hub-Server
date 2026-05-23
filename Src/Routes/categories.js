import express from "express";
import {
  createCategory,
  getCategories,
  getFeaturedHomepageCategories,
  setFeaturedHomepageCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  downloadCategoryCatalogue,
} from "../Controller/Category.js";
import { requireAdmin, requireAuth } from "../Middleware/auth.js";

const router = express.Router();

router.get("/featured/homepage", getFeaturedHomepageCategories);
router.get("/", getCategories);
router.get("/:id/catalogue.pdf", requireAuth, requireAdmin, downloadCategoryCatalogue);
router.get("/:id", getCategoryById);

router.put("/featured/homepage", requireAuth, requireAdmin, setFeaturedHomepageCategories);
router.post("/", requireAuth, requireAdmin, createCategory);
router.put("/:id", requireAuth, requireAdmin, updateCategory);
router.delete("/:id", requireAuth, requireAdmin, deleteCategory);

export default router;
