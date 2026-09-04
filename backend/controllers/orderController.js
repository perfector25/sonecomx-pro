const Order = require('../models/Order');
const Product = require('../models/Product');

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ success: false, message: 'Aucun article dans la commande' });

    let itemsPrice = 0;
    const orderItems = [];
    for (const item of items) {
      // Sécurité : empêcher les quantités négatives ou nulles
      const quantity = parseInt(item.quantity);
      if (!quantity || quantity < 1)
        return res.status(400).json({ success: false, message: 'La quantité doit être un entier positif' });

      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ success: false, message: `Produit ${item.product} introuvable` });
      if (product.stock < quantity)
        return res.status(400).json({ success: false, message: `Stock insuffisant pour ${product.name}` });
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity,
        price: product.price,
        thumbnail: product.thumbnail
      });
      itemsPrice += product.price * quantity;
    }

    const shippingPrice = itemsPrice >= 50000 ? 0 : 2500;
    const taxPrice = Math.round(itemsPrice * 0.1925);
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    const order = await Order.create({
      user: req.user ? req.user.id : undefined,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      notes,
      statusHistory: [{ status: 'pending', comment: 'Commande créée' }]
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity }
      });
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name thumbnail slug')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name thumbnail slug sku');
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) query.orderNumber = { $regex: req.query.search, $options: 'i' };

    const [orders, total] = await Promise.all([
      Order.find(query).populate('user','firstName lastName email').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(query)
    ]);
    res.status(200).json({ success: true, count: orders.length, total, pages: Math.ceil(total / limit), data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, comment, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === 'delivered') { order.isDelivered = true; order.deliveredAt = Date.now(); }
    if (status === 'confirmed' || status === 'processing') { order.isPaid = true; order.paidAt = Date.now(); }
    order.statusHistory.push({ status, comment: comment || '' });
    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
