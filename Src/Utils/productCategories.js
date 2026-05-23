import mongoose from "mongoose";
import CategoryModel from "../Models/Category.js";
import ProductModel from "../Models/Products.js";

const OBJECT_ID_HEX = /^[a-fA-F0-9]{24}$/;

export function isCategoryObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return true;
  if (typeof value !== "string") return false;
  return OBJECT_ID_HEX.test(value) && String(new mongoose.Types.ObjectId(value)) === value;
}

export function categoryValuesFromProduct(product) {
  const raw = product?.category;
  if (raw == null) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function getCategoryObjectIds(product) {
  return categoryValuesFromProduct(product)
    .filter(isCategoryObjectId)
    .map((id) => new mongoose.Types.ObjectId(String(id)));
}

export function getLegacyCategoryNames(product) {
  return categoryValuesFromProduct(product)
    .filter((v) => v != null && !isCategoryObjectId(v))
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export async function attachPopulatedCategories(productOrList) {
  const list = Array.isArray(productOrList) ? productOrList : [productOrList];
  if (!list.length) return Array.isArray(productOrList) ? [] : null;

  const idStrings = [
    ...new Set(list.flatMap((p) => getCategoryObjectIds(p).map((id) => id.toString()))),
  ];
  const categories = idStrings.length
    ? await CategoryModel.find({
        _id: { $in: idStrings.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("name description isDynamicPriceCategory")
        .lean()
    : [];
  const byId = new Map(categories.map((c) => [c._id.toString(), c]));

  const enriched = list.map((product) => {
    const populated = getCategoryObjectIds(product)
      .map((id) => byId.get(id.toString()))
      .filter(Boolean);
    const legacy = getLegacyCategoryNames(product).map((name) => ({
      _id: null,
      name,
      legacy: true,
    }));
    return { ...product, category: [...populated, ...legacy] };
  });

  return Array.isArray(productOrList) ? enriched : enriched[0];
}

/** Convert legacy string categories on products into Category ObjectId refs. */
export async function migrateLegacyProductCategories() {
  const products = await ProductModel.find({
    $or: [{ category: { $type: "string" } }, { category: { $exists: true, $ne: [] } }],
  }).lean();
  let updated = 0;

  for (const product of products) {
    const values = categoryValuesFromProduct(product);
    if (!values.length) continue;

    const hasLegacy = values.some((v) => !isCategoryObjectId(v));
    if (!hasLegacy) continue;

    const nextIds = [];
    const seen = new Set();

    for (const value of values) {
      if (isCategoryObjectId(value)) {
        const idStr = String(value);
        if (!seen.has(idStr)) {
          seen.add(idStr);
          nextIds.push(new mongoose.Types.ObjectId(idStr));
        }
        continue;
      }

      const name = String(value).trim();
      if (!name) continue;

      let category = await CategoryModel.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      });
      if (!category) {
        category = await CategoryModel.create({ name });
      }

      const idStr = category._id.toString();
      if (!seen.has(idStr)) {
        seen.add(idStr);
        nextIds.push(category._id);
      }
    }

    await ProductModel.updateOne({ _id: product._id }, { $set: { category: nextIds } });
    updated += 1;
  }

  return updated;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
