import ProductModel from "../Models/Products.js";

export const addProduct = async (req, res) => {
  try {
    let { name, description, category, price, minDaysToDispatch } = req.body;
    if (!name || !category || !price || !minDaysToDispatch) {
      throw { Status: "Error", Message: "Required fields are missing!" };
    }

    let obj = {
      name,
      description,
      category,
      price,
      minDaysToDispatch,
    };

    const addedProduct = await ProductModel.create(obj);
    if (!addedProduct) return res.status(500).json("Something Went Wrong!");

    return res.status(200).json(addedProduct);
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
