// models/DonorProfile.js
const mongoose = require('mongoose');

const donorProfileSchema = new mongoose.Schema(
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
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    weight_kg: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    house_no: {
      type: String,
      default: null,
    },
    street: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    last_donation_date: {
      type: Date,
      default: null,
    },
    is_first_time: {
      type: Boolean,
      default: true,
    },
    has_chronic_illness: {
      type: Boolean,
      default: false,
    },
    on_medication: {
      type: Boolean,
      default: false,
    },
    tattoo_recent: {
      type: Boolean,
      default: false,
    },
    is_available: {
      type: Boolean,
      default: true,
      index: true,
    },
    total_donations: {
      type: Number,
      default: 0,
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

module.exports = mongoose.models.DonorProfile || mongoose.model('DonorProfile', donorProfileSchema);
