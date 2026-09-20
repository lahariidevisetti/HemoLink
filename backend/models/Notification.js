// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
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
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['request', 'response', 'system'],
      default: 'system',
    },
    is_read: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
