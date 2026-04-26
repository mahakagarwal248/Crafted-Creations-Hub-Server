import ProductModel from "../Models/Products.js";
import { syncProductIdCounterFromProducts } from "../Utils/syncProductIdCounter.js";

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
const MAX_PHOTO_STRING_LENGTH = 6 * 1024 * 1024; // ~4.5MB base64 per image cap

function normalizePhotos(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((p) => typeof p === "string" && p.length > 0 && p.length <= MAX_PHOTO_STRING_LENGTH)
    .slice(0, MAX_PHOTOS);
}

export const addProduct = async (req, res) => {
  try {
    let { name, description, category, price, minDaysToDispatch, photos } = req.body;
    if (!name || !category || !price || !minDaysToDispatch) {
      throw { Status: "Error", Message: "Required fields are missing!" };
    }

    let obj = {
      name,
      description,
      category,
      price,
      minDaysToDispatch,
      photos: normalizePhotos(photos),
    };

    const addedProduct = await createProductWithSequenceRetry(obj);
    if (!addedProduct) return res.status(500).json("Something Went Wrong!");

    return res.status(200).json(addedProduct);
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
    return res.status(200).json(product);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

export const getProducts = async (req, res) => {
  try {
    let { category } = req.query;

    let query = {};
    if (category) query = { category };

    // const allProducts = await ProductModel.find(query);

    // const allProducts = await ProductModel.aggregate([
    //   {
    //     $match: query
    //   },
    //   {
    //     $group: {
    //       _id: "$category",               // group by category
    //       products: { $push: "$$ROOT" },  // push whole product docs
    //       count: { $sum: 1 }              // count per category
    //     }
    //   }
    // ]);

    // return res.status(200).json({numberOfProducts: allProducts.length, data: allProducts});
    const productsByCategory = await ProductModel.aggregate([
      { $match: query }, // filter if category is passed
      {
        $group: {
          _id: "$category",
          products: { $push: "$$ROOT" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } // optional: sort categories alphabetically
    ]);

    // overall count
    const totalCount = productsByCategory.reduce((sum, cat) => sum + cat.count, 0);

    return res.status(200).json({
      totalCount,
      categories: productsByCategory
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};
