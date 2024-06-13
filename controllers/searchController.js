const Product = require("../model/productModel");
const User = require("../model/userModel");
const Category = require("../model/categoryModel");
const { viewProductsByCategory } = require("./productController");

const get_searchedProducts = async (req, res) => {
    try {
     
  
      const { search, category, sort } = req.query;
  
      const categoryArray = category ? (Array.isArray(category) ? category : [category]) : [];

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

      if (search) {
        const searchQuery = search.toLowerCase().replace(/\s/g, "");
        Products = Products.filter((product) => {
          const name = product.name.toLowerCase().replace(/\s/g, "");
          const categoryName = product.category.name.toLowerCase().replace(/\s/g, "");
          return name.includes(searchQuery) || categoryName.includes(searchQuery);
        });
        console.log("Searched products", Products);
      }
  
      if (categoryArray.length > 0) {
        Products = Products.filter((product) => {
          const productCategory = product.category.name.toLowerCase().replace(/\s/g, "");
          return categoryArray.some(cat => cat.toLowerCase().replace(/\s/g, "") === productCategory);
        });
      }
  
      if (sort) {
        if (sort === "low-high") {
          Products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        } else if (sort === "high-low") {
          Products.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        } else if (sort === "new-first") {
          Products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort === "a-z") {
          Products.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "z-a") {
          Products.sort((a, b) => b.name.localeCompare(a.name));
        }
      }

      const categories = await Category.find({ isDeleted: false });
      console.log("categories", categories);
  
      const userData = req.session.user;
      const isHomePage = false;
  
      res.render("user/products", { isHomePage, userData, categories, Products });
    } catch (error) {
      console.error("Error in get_searchedProducts:", error);
      res.status(500).send("Server Error");
    }
  };
  

module.exports = {
  get_searchedProducts,
};
