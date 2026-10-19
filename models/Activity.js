import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    // Which user this event belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // What kind of event it is. Only these values are allowed.
    type: {
      type: String,
      enum: ['login', 'password_changed', 'new_device', 'two_factor_changed'],
      required: true,
    },

    // The text shown on the dashboard, e.g. "Login from Chrome"
    description: {
      type: String,
      required: true,
    },

    // "success" shows a ✓ and "warning" shows a ⚠ on the dashboard
    status: {
      type: String,
      enum: ['success', 'warning'],
      default: 'success',
    },

    // Where the request came from (useful for security checks later)
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true } // createdAt is the time shown next to each activity
);

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;