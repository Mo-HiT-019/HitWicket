const Coupen = require("../model/coupenModel");
const mongoose = require("mongoose");

const renderCoupen_page = async (req, res) => {
  const coupens = await Coupen.find({ is_delete: false });

  const formattedCoupens = coupens.map((data) => {
    const formattedStartDate = new Date(data.start_date).toLocaleDateString();
    const formattedExpDate = new Date(data.exp_date).toLocaleDateString();

    return {
      ...data.toObject(),
      start_date: formattedStartDate,
      exp_date: formattedExpDate,
    };
  });

  res.render("coupen/coupen", { formattedCoupens });
};

const renderNew_coupen = async (req, res) => {
  res.render("coupen/new-coupen");
};

const createNew_coupen = async (req, res) => {
  const coupen = new Coupen({
    coupon_code: req.body.coupon_code,
    discount: req.body.discount,
    start_date: req.body.start_date,
    exp_date: req.body.exp_date,
    max_count: req.body.max_count,
    min_amount: req.body.min_amount,
    used_count: req.body.used_count,
    discription: req.body.discription,
  });

  const createCoupen = await coupen.save();

  if (createCoupen) {
    res.json({ success: true });
  }
};

const editCoupen = async (req, res) => {
  let coupon = await Coupen.findById(req.params.id);
  coupon = coupon.toObject();

  //formatting the dates
  function formatDateToDDMMYYYY(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }
  coupon.start_date = formatDateToDDMMYYYY(coupon.start_date);
  coupon.exp_date = formatDateToDDMMYYYY(coupon.exp_date);
  res.render("coupen/edit-coupen", { admin: true, coupon });
};

const updateCoupen = async (req, res) => {
  let id = req.params.id;
  let data = req.body;
  let coupon = await Coupen.findByIdAndUpdate({ _id: id }, data, { new: true });
  if (coupon) {
    res.json({
      success: true,
    });
  }
};

const deleteCoupen = async (req, res) => {
  let id = new mongoose.Types.ObjectId(req.params.id);
  let coupon = await Coupen.updateOne({ _id: id }, { is_delete: true });
  if (coupon) {
    res.json({
      success: true,
    });
  }
};

module.exports = {
  renderCoupen_page,
  renderNew_coupen,
  createNew_coupen,
  editCoupen,
  updateCoupen,
  deleteCoupen,
};
