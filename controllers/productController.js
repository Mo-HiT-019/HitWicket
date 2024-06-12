const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const fs = require("fs");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");

const categoryController = require("./categoryController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/product");
  },
  filename: function (req, file, cb) {
    cb(null, "image-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

categoryController.getAllCategories = async () => {
  try {
    const categories = await Category.find();
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

const renderAddProduct = async (req, res) => {
  try {
    const categories = await categoryController.getAllCategories();

    res.render("admin/add-product", {
      categories,
      msg: req.flash("errorMessage"),
    });
  } catch (error) {
    console.error("Error rendering add-product page:", error);
    res.send("Internal Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      description,
      stock,
      discount,
      startDate,
      endDate,
    } = req.body;
    console.log("description", description);

    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
    const productImages = req.files
      .filter((file) => allowedImageTypes.includes(file.mimetype))
      .map((file) => file.filename);

    if (productImages.length === 0) {
      req.flash("errorMessage", "Invalid Image Format");
      return res.redirect("/product/add-product");
    }

    const remainingStock = stock - req.body.quantity;
    if (remainingStock < 0) {
      res.send({ message: "Insufficient stock for this product." });
      return;
    }

    const firstImage = productImages[0];

    const imagePath = path.join("public/images/product", firstImage);

    const newProduct = new Product({
      name,
      category,
      price,
      stock,
      description,
      productImages: [firstImage],
      offers: [
        {
          discount,
          startDate,
          endDate,
        },
      ],
    });

    const savedProduct = await newProduct.save();

    res.redirect("/admin/view-products");
  } catch (error) {
    console.error("Error in addProduct:", error);
    res.send({ message: "Internal Server Error" });
  }
};

const viewProducts = async (req, res) => {
  try {
    const PAGE_SIZE = 12;
    const page = parseInt(req.query.page) || 1;

    // Calculate total count without skipping and limiting
    const totalCount = await Product.countDocuments({ deleted: false });
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const products = await Product.find({ deleted: false })
      .populate("category")
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    res.render("admin/view-products", {
      products,
      page,
      PAGE_SIZE,
      totalCount,
      totalPages,
      msg: req.flash("errorMessage"),
    });
    console.log("Products:", products);
  } catch (error) {
    res.send(error);
  }
};

const editProduct = async (req, res) => {
  const productId = req.params.productId;

  try {
    // Use populate to get the category details
    const product = await Product.findById(productId);
    const category = await Category.find();
    console.log("sdfsdf", product);

    if (!product) {
      return res.send({ message: "Product not found" });
    }

    res.render("admin/edit-product", { product, category });
  } catch (error) {
    console.error(error);
    res.send({ message: "Internal Server Error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { name, price, description, category, stock } = req.body;
    const newImages = req.files.map((file) => file.filename);

    const product = await Product.findById(productId).populate(
      "category",
      "name"
    );

    if (!product) {
      return res.send({ message: "Product not found" });
    }

    if (price < 0) {
      req.flash("errorMessage", "Price cannot be less than 0");
      return res.redirect(`/admin/view-products`);
    }

    if (stock < 0) {
      req.flash("errorMessage", "Stock cannot be less than 0");
      return res.redirect(`/admin/view-products`);
    }

    const existingImages = product.productImages;
    const updatedImages = existingImages.filter(
      (image) => !req.body[`removeImage_${image}`]
    );

    updatedImages.push(...newImages);

    product.name = name;
    product.price = price;
    product.description = description;
    product.stock = stock;

    if (category !== undefined) {
      product.category = category;
    }

    product.productImages = updatedImages;

    await product.save();

    res.redirect(`/admin/view-products`);
  } catch (error) {
    console.error(error);
    res.send({ message: "Internal Server Error" });
  }
};

const deleteProduct = async (req, res) => {
  const productId = req.params.productId;

  try {
    const deletedProduct = await Product.findByIdAndUpdate(productId, {
      deleted: true,
    });
    if (!deletedProduct) {
      return res.send({ message: "Product not found" });
    }

    res.redirect("/admin/view-products");
  } catch (error) {
    console.error(error);
    res.send({ message: "Internal Server Error" });
  }
};

const viewProductsByCategory = async (req, res) => {
  try {
    const selectedCategory = req.query.category;

    const products = selectedCategory
      ? await Product.find({
          category: selectedCategory,
          deleted: false,
        }).populate("category", "name")
      : await Product.find({ deleted: false }).populate("category");

    const categories = await Category.find({ isDeleted: false });

    res.render("user/category-product", {
      products,
      categories,
      selectedCategory,
    });
  } catch (error) {
    console.error("Error rendering home:", error);
    req.flash("errorMessage", "An unexpected error occurred");
    res.redirect("/login");
  }
};

module.exports = {
  upload,
  renderAddProduct,
  addProduct,
  viewProducts,
  editProduct,
  updateProduct,
  deleteProduct,
  viewProductsByCategory,
};
