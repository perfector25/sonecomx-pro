const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGODB_URL;
  const conn = await mongoose.connect(uri);
  console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
};

module.exports = connectDB;
