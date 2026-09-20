// models/ReceiverProfile.js
const mongoose = require('mongoose');

const receiverProfileSchema = new mongoose.Schema(
  {
    legacy_id: {
      type: Number,
      index: true,
      sparse: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    date_of_birth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
      default: null,
    },
    phone: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    address: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

module.exports = mongoose.models.ReceiverProfile || mongoose.model('ReceiverProfile', receiverProfileSchema);
