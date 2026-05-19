import mongoose from "mongoose";
import CategoryModel from "../Models/Category.js";
import ProductModel from "../Models/Products.js";

const MAX_HOMEPAGE_FEATURED = 5;
const MAX_CATEGORY_IMAGE_LENGTH = 6 * 1024 * 1024;

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizeCategoryImage(raw) {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const value = raw.trim();
  if (value.length > MAX_CATEGORY_IMAGE_LENGTH) return null;
  return value;
}

export const createCategory = async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const description = req.body?.description?.trim();
    const isOccasional = parseBoolean(req.body?.isOccasional);
    const imageUrl = normalizeCategoryImage(req.body?.imageUrl);
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }
    if (imageUrl === null) {
      return res.status(400).json({ message: "Category image is too large (max ~4 MB)" });
    }
    const category = await CategoryModel.create({
      name,
      description,
      isOccasional: isOccasional ?? false,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    });
    return res.status(201).json(category);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.find()
      .sort({ homepageOrder: 1, name: 1 })
      .lean();
    return res.status(200).json(categories);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getFeaturedHomepageCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.find({
      homepageOrder: { $gte: 1, $lte: MAX_HOMEPAGE_FEATURED },
    })
      .sort({ homepageOrder: 1 })
      .lean();
    return res.status(200).json(categories);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const setFeaturedHomepageCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body;
    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({ message: "categoryIds must be an array" });
    }
    if (categoryIds.length > MAX_HOMEPAGE_FEATURED) {
      return res.status(400).json({
        message: `At most ${MAX_HOMEPAGE_FEATURED} categories can be featured on the homepage`,
      });
    }

    const ids = categoryIds
      .map((id) => (id != null ? String(id).trim() : ""))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const uniqueIds = [...new Map(ids.map((id) => [id.toString(), id])).values()];
    if (uniqueIds.length !== categoryIds.length) {
      return res.status(400).json({ message: "One or more category ids are invalid" });
    }

    if (uniqueIds.length) {
      const found = await CategoryModel.countDocuments({ _id: { $in: uniqueIds } });
      if (found !== uniqueIds.length) {
        return res.status(400).json({ message: "One or more categories were not found" });
      }
    }

    await CategoryModel.updateMany({}, { $unset: { homepageOrder: "" } });
    await Promise.all(
      uniqueIds.map((id, index) =>
        CategoryModel.updateOne({ _id: id }, { homepageOrder: index + 1 })
      )
    );

    const categories = await CategoryModel.find({
      homepageOrder: { $gte: 1, $lte: MAX_HOMEPAGE_FEATURED },
    })
      .sort({ homepageOrder: 1 })
      .lean();

    return res.status(200).json(categories);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }
    const category = await CategoryModel.findById(id).lean();
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json(category);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }
    const name = req.body?.name?.trim();
    const description = req.body?.description?.trim();
    const isOccasional = parseBoolean(req.body?.isOccasional);
    const imageUrl = normalizeCategoryImage(req.body?.imageUrl);
    const update = {};
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (typeof isOccasional === "boolean") update.isOccasional = isOccasional;
    if (imageUrl !== undefined) {
      if (imageUrl === null) {
        return res.status(400).json({ message: "Category image is too large (max ~4 MB)" });
      }
      update.imageUrl = imageUrl;
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const category = await CategoryModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json(category);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    console.log(error);
    return res.status(500).json(error);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category id" });
    }
    const categoryObjectId = new mongoose.Types.ObjectId(id);
    const productCount = await ProductModel.countDocuments({ category: categoryObjectId });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${productCount} product(s) are assigned to this category`,
      });
    }
    const deleted = await CategoryModel.findByIdAndDelete(id).lean();
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json({ message: "Category deleted", category: deleted });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};
