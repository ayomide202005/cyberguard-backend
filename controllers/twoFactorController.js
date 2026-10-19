import bcrypt from 'bcryptjs';
import otplib from 'otplib';
import QRCode from 'qrcode';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Alert from '../models/Alert.js';

const { authenticator } = otplib;

// Accept the code if it is from the current 30 seconds, or one step before/after.
// This avoids failures when the phone clock is slightly off.
authenticator.options = { window: 1 };

// Step 1 of turning 2FA on: make a secret and a QR code.
export async function setupTwoFactor(req, res) {
  try {
    if (req.user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is already on.' });
    }

    // Make a new random secret
    const secret = authenticator.generateSecret();

    // Save it, but do NOT turn 2FA on yet (the user must confirm a code first)
    await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret });

    // Build the link the authenticator app understands, then turn it into a QR image
    const otpauthUrl = authenticator.keyuri(req.user.email, 'CyberGuard', secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // "secret" is sent too, so the user can type it by hand if scanning fails
    res.json({ qrCode, secret });
  } catch (error) {
    console.error('setupTwoFactor error:', error);
    res.status(500).json({ message: 'Could not start two-factor setup.' });
  }
}

// Step 2: the user types the 6-digit code from their app to prove it works.
export async function enableTwoFactor(req, res) {
  try {
    const code = String(req.body.code || '').trim();

    if (!code) {
      return res.status(400).json({ message: 'Please enter the 6-digit code.' });
    }

    // The secret is hidden by default, so we ask for it on purpose here
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'Start the setup first.' });
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);

    if (!isValid) {
      return res.status(400).json({ message: 'That code is not correct. Try again.' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    // The "turn on two-factor" warning is no longer needed
    await Alert.updateMany(
      { user: user._id, type: 'two_factor_off', isResolved: false },
      { isResolved: true }
    );

    await Activity.create({
      user: user._id,
      type: 'two_factor_changed',
      description: 'Two-factor authentication turned on',
      status: 'success',
      ipAddress: req.ip,
    });

    res.json({ message: 'Two-factor authentication is now on.' });
  } catch (error) {
    console.error('enableTwoFactor error:', error);
    res.status(500).json({ message: 'Could not turn on two-factor authentication.' });
  }
}

// Turn 2FA off. The user must type their password to prove it is really them.
export async function disableTwoFactor(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please enter your password.' });
    }

    const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      // 400 (not 401) so the frontend does not think the user was signed out
      return res.status(400).json({ message: 'Your password is not correct.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined; // delete the secret
    await user.save();

    await Activity.create({
      user: user._id,
      type: 'two_factor_changed',
      description: 'Two-factor authentication turned off',
      status: 'warning',
      ipAddress: req.ip,
    });

    res.json({ message: 'Two-factor authentication is now off.' });
  } catch (error) {
    console.error('disableTwoFactor error:', error);
    res.status(500).json({ message: 'Could not turn off two-factor authentication.' });
  }
}