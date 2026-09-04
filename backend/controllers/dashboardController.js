const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Quote = require('../models/Quote');

exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders, monthOrders, lastMonthOrders,
      totalUsers, monthUsers,
      totalProducts, lowStock,
      totalQuotes, pendingQuotes,
      revenueData, lastMonthRevenue
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ stock: { $lte: 5 }, isActive: true }),
      Quote.countDocuments(),
      Quote.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ])
    ]);

    const monthRevenue = revenueData[0]?.total || 0;
    const prevRevenue = lastMonthRevenue[0]?.total || 0;

    // Monthly revenue for chart (last 6 months)
    const monthlyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, sold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { sold: -1 } },
      { $limit: 5 }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily traffic (last 30 days) — simulated from orders as proxy
    const dailyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$totalPrice' } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalOrders, monthOrders, lastMonthOrders,
          totalUsers, monthUsers,
          totalProducts, lowStock,
          totalQuotes, pendingQuotes,
          monthRevenue, prevRevenue
        },
        monthlyRevenue,
        topProducts,
        ordersByStatus,
        dailyOrders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const [recentOrders, recentUsers, recentQuotes] = await Promise.all([
      Order.find().populate('user','firstName lastName').sort({ createdAt: -1 }).limit(5).lean(),
      User.find().sort({ createdAt: -1 }).limit(5).lean(),
      Quote.find().populate('user','firstName lastName company').sort({ createdAt: -1 }).limit(5).lean()
    ]);
    res.status(200).json({ success: true, data: { recentOrders, recentUsers, recentQuotes } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
