import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    // Which user this device belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // A short label to tell devices apart, like "Chrome on Windows".
    // We'll use it to decide if a sign-in is from a device we already know.
    deviceKey: {
      type: String,
      required: true,
    },

    // Friendly details shown on the dashboard
    browser: {
      type: String,
      default: 'Unknown browser',
    },
    os: {
      type: String,
      default: 'Unknown system',
    },

    // Where it last signed in from
    ipAddress: {
      type: String,
    },

    // Last time this device was used to sign in
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    // Has the user confirmed "yes, this is my device"?
    isTrusted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// A user can only have one record per device label.
// This stops the same device from being saved twice.
deviceSchema.index({ user: 1, deviceKey: 1 }, { unique: true });

const Device = mongoose.model('Device', deviceSchema);

export default Device;