import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // ----- Account basics (already working) -----
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true, // stores the HASHED password, never the real one
    },

    // ----- Security info for the dashboard -----

    // Has the user turned on two-factor authentication? Starts as false.
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    // The secret key shared with the user's authenticator app.
    // select: false means it is NOT returned in normal queries,
    // so it can't leak by accident.
    twoFactorSecret: {
      type: String,
      select: false,
    },

    // When was the password last set or changed? Starts as the sign-up time.
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    // When did the user last sign in? Empty until their first sign-in.
    lastLoginAt: {
      type: Date,
    },

    // Goes up by 1 whenever we want to sign the user out everywhere
    // (for example when the password changes)
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

const User = mongoose.model('User', userSchema);

export default User;