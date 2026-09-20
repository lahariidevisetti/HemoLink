// middleware/auth.middleware.js
// Verifies JWT token on every protected route
// Automatically upgrades legacy numeric MySQL IDs to MongoDB ObjectIds

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('../models');

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, profileComplete }

    // If token has legacy numeric ID from MySQL, resolve to MongoDB ObjectId seamlessly
    if (decoded.id && !mongoose.Types.ObjectId.isValid(decoded.id)) {
      const user = await User.findOne({
        $or: [
          { legacy_id: Number(decoded.id) || -1 },
          { email: decoded.email?.toLowerCase() },
        ],
      }).select('_id');

      if (user) {
        req.user.id = user._id.toString();
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
}

// Role guard — pass 'donor' or 'receiver'
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. ${role} role required.` });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
