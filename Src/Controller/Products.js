import mongoose from "mongoose";
import ProductModel from "../Models/Products.js";
import CategoryModel from "../Models/Category.js";
import { syncProductIdCounterFromProducts } from "../Utils/syncProductIdCounter.js";
import { attachPopulatedCategories, isCategoryObjectId } from "../Utils/productCategories.js";

async function sortCategoriesByHomepageOrder(productsByCategory) {
  const featured = await CategoryModel.find({
    homepageOrder: { $gte: 1, $lte: 5 },
  })
    .select("_id homepageOrder")
    .lean();
  const orderMap = new Map(featured.map((c) => [c._id.toString(), c.homepageOrder]));
  return productsByCategory.sort((a, b) => {
    const orderA = orderMap.get(String(a._id)) ?? 999;
    const orderB = orderMap.get(String(b._id)) ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "");
  });
}

async function createProductWithSequenceRetry(obj) {
  try {
    return await ProductModel.create(obj);
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.productId) {
      await syncProductIdCounterFromProducts();
      return await ProductModel.create(obj);
    }
    throw err;
  }
}

const MAX_PHOTOS = 8;
const MAX_PHOTO_STRING_LENGTH = 6 * 1024 * 1024;

function normalizePhotos(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((p) => typeof p === "string" && p.length > 0 && p.length <= MAX_PHOTO_STRING_LENGTH)
    .slice(0, MAX_PHOTOS);
}

function normalizeCategoryIds(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const ids = arr
    .map((id) => (id != null ? String(id).trim() : ""))
    .filter((id) => isCategoryObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  return [...new Map(ids.map((id) => [id.toString(), id])).values()];
}

async function validateCategoryIds(categoryIds) {
  if (!categoryIds.length) return false;
  const found = await CategoryModel.countDocuments({ _id: { $in: categoryIds } });
  return found === categoryIds.length;
}

function activeProductFilter() {
  return { isActive: { $ne: false } };
}

function includeInactiveRequested(req) {
  return req.query.includeInactive === "true";
}

export const addProduct = async (req, res) => {
  try {
    let { name, description, category, price, minDaysToDispatch, photos, isActive } = req.body;
    const categoryIds = normalizeCategoryIds(category);
    if (!name || !categoryIds.length || !price || !minDaysToDispatch) {
      return res.status(400).json({ message: "Required fields are missing!" });
    }
    if (!(await validateCategoryIds(categoryIds))) {
      return res.status(400).json({ message: "One or more categories are invalid" });
    }

    let obj = {
      name,
      description,
      category: categoryIds,
      price,
      minDaysToDispatch,
      photos: normalizePhotos(photos),
      isActive: typeof isActive === "boolean" ? isActive : true,
    };

    const addedProduct = await createProductWithSequenceRetry(obj);
    if (!addedProduct) return res.status(500).json("Something Went Wrong!");

    const created = await ProductModel.findById(addedProduct._id).lean();
    const populated = await attachPopulatedCategories(created);
    return res.status(200).json(populated);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const product = await ProductModel.findOne({ productId }).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.isActive === false && !includeInactiveRequested(req)) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json(await attachPopulatedCategories(product));
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

function parseListPagination(req, defaultLimit = 10) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const listProducts = async (req, res) => {
  try {
    const { category: categoryId } = req.query;
    const { page, limit, skip } = parseListPagination(req);

    const query = {};
    if (!includeInactiveRequested(req)) {
      Object.assign(query, activeProductFilter());
    }
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.category = new mongoose.Types.ObjectId(categoryId);
    }

    const totalCount = await ProductModel.countDocuments(query);
    const products = await ProductModel.find(query)
      .sort({ productId: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const withCategories = await attachPopulatedCategories(products);

    return res.status(200).json({
      products: withCategories,
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const getProducts = async (req, res) => {
  try {
    const { category: categoryId } = req.query;

    let match = {};
    if (!includeInactiveRequested(req)) {
      Object.assign(match, activeProductFilter());
    }
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      match.category = new mongoose.Types.ObjectId(categoryId);
    }

    const productsByCategory = await ProductModel.aggregate([
      { $match: { ...match, category: { $exists: true, $ne: [] } } },
      { $unwind: "$category" },
      { $match: { category: { $type: "objectId" } } },
      ...(categoryId && mongoose.Types.ObjectId.isValid(categoryId)
        ? [{ $match: { category: new mongoose.Types.ObjectId(categoryId) } }]
        : []),
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category",
          name: { $first: "$categoryInfo.name" },
          products: {
            $push: {
              _id: "$_id",
              productId: "$productId",
              name: "$name",
              description: "$description",
              price: "$price",
              photos: "$photos",
              imageUrl: "$imageUrl",
              minDaysToDispatch: "$minDaysToDispatch",
              isActive: "$isActive",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const sortedCategories = await sortCategoriesByHomepageOrder(productsByCategory);
    const totalCount = sortedCategories.reduce((sum, cat) => sum + cat.count, 0);

    return res.status(200).json({
      totalCount,
      categories: sortedCategories,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await ProductModel.findOne({ productId }).lean();
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, description, category, price, minDaysToDispatch, photos, isActive } = req.body;
    const update = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ message: "Name is required" });
      update.name = trimmed;
    }
    if (description !== undefined) {
      update.description = description ? String(description).trim() : "";
    }
    if (price !== undefined) {
      const numPrice = Number(price);
      if (!Number.isFinite(numPrice) || numPrice < 0) {
        return res.status(400).json({ message: "Price must be a number ≥ 0" });
      }
      update.price = numPrice;
    }
    if (minDaysToDispatch !== undefined) {
      const days = Number(minDaysToDispatch);
      if (!Number.isFinite(days) || days < 0) {
        return res.status(400).json({ message: "minDaysToDispatch must be a number ≥ 0" });
      }
      update.minDaysToDispatch = days;
    }
    if (category !== undefined) {
      const categoryIds = normalizeCategoryIds(category);
      if (!categoryIds.length) {
        return res.status(400).json({ message: "At least one category is required" });
      }
      if (!(await validateCategoryIds(categoryIds))) {
        return res.status(400).json({ message: "One or more categories are invalid" });
      }
      update.category = categoryIds;
    }
    if (photos !== undefined) {
      update.photos = normalizePhotos(photos);
    }
    if (typeof isActive === "boolean") {
      update.isActive = isActive;
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const product = await ProductModel.findOneAndUpdate({ productId }, update, {
      new: true,
    }).lean();
    return res.status(200).json(await attachPopulatedCategories(product));
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const updateProductActive = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ message: "Invalid product id" });
    }
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    const product = await ProductModel.findOneAndUpdate(
      { productId },
      { isActive },
      { new: true }
    ).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json(await attachPopulatedCategories(product));
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};
