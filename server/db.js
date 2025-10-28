const mongoose = require('mongoose');
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://itsdebrajdalai_db_user:QW92dY6xe9rq1pA7@cluster0.z5qziot.mongodb.net/';
  console.log(uri);
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
}

module.exports = { connectDB };
