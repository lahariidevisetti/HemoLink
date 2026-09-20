// models/DonorResponse.js
const mongoose = require('mongoose');

const donorResponseSchema = new mongoose.Schema(
  {
    legacy_id: {
      type: Number,
      index: true,
      sparse: true,
    },
    request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
      index: true,
    },
    donor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
      default: 'Pending',
    },
    message: {
      type: String,
      default: null,
    },
    responded_at: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.models.DonorResponse || mongoose.model('DonorResponse', donorResponseSchema);
