const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

exports.getProducts = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 100); // Plafond à 100 max (anti-DoS)
    const skip  = (page - 1) * limit;
    const query = { isActive: true };

    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) {
        query.category = req.query.category;
      } else {
        const cat = await Category.findOne({
          $or: [
            { name: req.query.category },
            { slug: req.query.category }
          ]
        });
        if (cat) {
          query.category = cat._id;
        } else {
          // Force empty list by using a dummy ObjectId if category not found
          query.category = new mongoose.Types.ObjectId();
        }
      }
    }
    if (req.query.brand)    query.brand = { $regex: req.query.brand, $options: 'i' };
    if (req.query.featured) query.isFeatured = true;
    if (req.query.isNew)    query.isNew = true;
    if (req.query.promo === 'true') query.discount = { $gt: 0 };
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    if (req.query.inStock === 'true') query.stock = { $gt: 0 };

    let sortObj = { createdAt: -1 };
    if (req.query.sort === 'price_asc')   sortObj = { price: 1 };
    if (req.query.sort === 'price_desc')  sortObj = { price: -1 };
    if (req.query.sort === 'rating')      sortObj = { rating: -1 };
    if (req.query.sort === 'bestseller')  sortObj = { sold: -1 };
    if (req.query.sort === 'newest')      sortObj = { createdAt: -1 };

    const [products, total] = await Promise.all([
      Product.find(query).populate('category','name slug icon').sort(sortObj).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: products
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isActive: true
    }).populate('category','name slug').populate('reviews.user','firstName lastName avatar');

    if (!product) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    product.views += 1;
    await product.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (req.body.category && !mongoose.Types.ObjectId.isValid(req.body.category)) {
      const cat = await Category.findOne({
        $or: [
          { name: req.body.category },
          { slug: req.body.category }
        ]
      });
      if (cat) {
        req.body.category = cat._id;
      } else {
        return res.status(400).json({ success: false, message: `Catégorie introuvable : ${req.body.category}` });
      }
    }
    const product = await Product.create(req.body);
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: 1 } });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (req.body.category && !mongoose.Types.ObjectId.isValid(req.body.category)) {
      const cat = await Category.findOne({
        $or: [
          { name: req.body.category },
          { slug: req.body.category }
        ]
      });
      if (cat) {
        req.body.category = cat._id;
      } else {
        return res.status(400).json({ success: false, message: `Catégorie introuvable : ${req.body.category}` });
      }
    }

    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) return res.status(404).json({ success: false, message: 'Produit introuvable' });

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (req.body.category && oldProduct.category && oldProduct.category.toString() !== req.body.category.toString()) {
      await Promise.all([
        Category.findByIdAndUpdate(oldProduct.category, { $inc: { productCount: -1 } }),
        Category.findByIdAndUpdate(req.body.category, { $inc: { productCount: 1 } })
      ]);
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    product.isActive = false;
    await product.save();
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
    }
    res.status(200).json({ success: true, message: 'Produit archivé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    const already = product.reviews.find(r => r.user.toString() === req.user.id);
    if (already) return res.status(400).json({ success: false, message: 'Vous avez déjà évalué ce produit' });
    product.reviews.push({ user: req.user.id, name: req.user.fullName || req.user.firstName, rating, comment });
    product.calcRating();
    await product.save();
    res.status(201).json({ success: true, data: product.reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate('category','name slug icon').limit(10).lean();
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRelated = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    }).limit(6).lean();
    res.status(200).json({ success: true, data: related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
