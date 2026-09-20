// models/index.js
const mongoose = require('mongoose');
const User = require('./User');
const DonorProfile = require('./DonorProfile');
const ReceiverProfile = require('./ReceiverProfile');
const BloodRequest = require('./BloodRequest');
const DonorResponse = require('./DonorResponse');
const Notification = require('./Notification');
const PasswordReset = require('./PasswordReset');

/**
 * Builds a query condition matching either MongoDB ObjectId or legacy numeric ID
 */
function buildIdQuery(id) {
  if (!id) return { _id: null };
  const strId = id.toString().trim();
  const conditions = [];

  if (mongoose.Types.ObjectId.isValid(strId)) {
    conditions.push({ _id: new mongoose.Types.ObjectId(strId) });
  }

  const numId = Number(strId);
  if (!isNaN(numId) && numId > 0) {
    conditions.push({ legacy_id: numId });
  }

  if (conditions.length === 1) return conditions[0];
  if (conditions.length > 1) return { $or: conditions };
  return { _id: null };
}

module.exports = {
  User,
  DonorProfile,
  ReceiverProfile,
  BloodRequest,
  DonorResponse,
  Notification,
  PasswordReset,
  buildIdQuery,
};
