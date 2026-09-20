// models/BloodRequest.js
const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    legacy_id: {
      type: Number,
      index: true,
      sparse: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    hospital_name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    urgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High',
      index: true,
    },
    units_needed: {
      type: Number,
      default: 1,
      min: 1,
    },
    additional_note: {
      type: String,
      default: null,
    },
    document_url: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Open', 'Fulfilled', 'Cancelled'],
      default: 'Open',
      index: true,
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

module.exports = mongoose.models.BloodRequest || mongoose.model('BloodRequest', bloodRequestSchema);
