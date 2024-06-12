const Product = require("../model/productModel");
const User = require("../model/userModel");
const Category = require("../model/categoryModel");
const { viewProductsByCategory } = require("./productController");

const get_searchedProducts = async (req, res) => {
  console.log("req:", req);

  console.log("req.query:", req.query);
  let Products = await Product.aggregate([
    {
      $match: {
        deleted: false,
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: "$category",
    },
  ]);

  console.log("products", Products);

  let query = req.query.search;
  console.log("sf", query);

  if (query) {
    Products = Products.filter((product) => {
      query = query.toLowerCase().replace(/\s/g, "");

      const name = product.name.toLowerCase().replace(/\s/g, "");
      if (name.includes(query)) {
        return true;
      } else if (query.includes(name)) {
        return true;
      }
      console.log("prtr", Products);

      const category = product.category.name.toLowerCase().replace(/\s/g, "");
      if (category.includes(query)) {
        return true;
      } else if (query.includes(category)) {
        return true;
      }
    });
  }

  let category = req.query.category;
  if (category) {
    Products = Products.filter((product) => {
      return category.includes(product.category.name);
    });
  }

  const sortQuery = req.query.sort;
  if (sortQuery === "low-high") {
    Products.sort((a, b) => {
      const sellingPriceA = parseFloat(a.price);
      const sellingPriceB = parseFloat(b.price);

      if (sellingPriceA < sellingPriceB) {
        return -1;
      } else if (sellingPriceA > sellingPriceB) {
        return 1;
      } else {
        return 0;
      }
    });
  } else if (sortQuery === "high-low") {
    Products.sort((a, b) => {
      const sellingPriceA = parseFloat(a.price);
      const sellingPriceB = parseFloat(b.price);

      if (sellingPriceA < sellingPriceB) {
        return 1;
      } else if (sellingPriceA > sellingPriceB) {
        return -1;
      } else {
        return 0;
      }
    });
  } else if (sortQuery === "new-first") {
    Products.sort((a, b) => {
      const createdAtA = new Date(a.createdAt);
      const createdAtB = new Date(b.createdAt);

      if (createdAtA > createdAtB) {
        return -1;
      } else if (createdAtA < createdAtB) {
        return 1;
      }
    });
  } else if (sortQuery === "a-z") {
    Products.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    });
  } else if (sortQuery === "z-a") {
    Products.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA > nameB) {
        return -1;
      }
      if (nameA < nameB) {
        return 1;
      }
      return 0;
    });
  }

  const userData = req.session.user;

  const categories = await Category.find({ isDeleted: false });
  console.log("car", categories);

  const isHomePage = false;
  res.render("user/products", { isHomePage, userData, categories, Products });
};

module.exports = {
  get_searchedProducts,
};
