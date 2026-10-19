import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    // Which user this alert is for
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // What happened
    type: {
      type: String,
      enum: ['new_device', 'weak_password', 'two_factor_off', 'suspicious_login'],
      required: true,
    },

    // Short title and a longer explanation shown on the dashboard
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },

    // How serious it is
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // false = still needs attention (counted on the dashboard)
    // true  = the user has dealt with it
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;