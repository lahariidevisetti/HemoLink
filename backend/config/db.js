// config/db.js
// MongoDB Atlas connection via Mongoose ODM

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables.');
}

let connPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!connPromise) {
    connPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    }).then(conn => {
      console.log(`✅ MongoDB Atlas connected → ${conn.connection.name} database (${conn.connection.host})`);
      return conn;
    }).catch(err => {
      connPromise = null;
      console.error('❌ MongoDB Atlas connection failed:', err.message);
      throw err;
    });
  }
  return connPromise;
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Atlas disconnected. Retrying...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Atlas error:', err.message);
});

module.exports = {
  connectDB,
  testConnection: connectDB, // backwards compatibility with server.js
  mongoose,
};
