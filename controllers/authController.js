import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import otplib from 'otplib';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Device from '../models/Device.js';
import Alert from '../models/Alert.js';
import getBrowserName from '../utils/getBrowserName.js';
import getOsName from '../utils/getOsName.js';
import validatePassword from '../utils/validatePassword.js';

const { authenticator } = otplib;

// Accept the code if it is from the current 30 seconds, or one step before/after.
authenticator.options = { window: 1 };

// Creates the login ticket and stores it in a cookie.
// We use this when signing in AND after changing the password.
function createLoginCookie(res, user) {
  // The ticket carries the user's id and their current tokenVersion
  const token = jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // httpOnly means JavaScript in the browser cannot read it, which keeps it safer
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
}

// ---------- SIGN UP ----------
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check the password rules (length, letter and number)
    const passwordProblem = validatePassword(password);
    if (passwordProblem) {
      return res.status(400).json({ message: passwordProblem });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already in use.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name,
      email: email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: 'Account created successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log('Register error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ---------- SIGN IN ----------
export async function login(req, res) {
  try {
    // 1. Get the data sent from React
    //    "code" is the 6-digit two-factor code (only sent when 2FA is on)
    const { email, password, code } = req.body;

    // 2. Check that nothing is missing
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 3. Find the user by email.
    //    The two-factor secret is hidden by default, so we ask for it on purpose.
    const user = await User.findOne({ email: email.toLowerCase() }).select('+twoFactorSecret');

    // 4. If no user, or the password is wrong, send the SAME message.
    //    This way nobody can use the form to find out which emails are registered.
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 5. Compare the typed password with the scrambled one in the database
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 5a. Two-factor check (only if the user turned it on)
    if (user.twoFactorEnabled) {
      // No code yet? Tell React to ask for one. We do NOT sign the user in.
      if (!code) {
        return res.status(200).json({ twoFactorRequired: true });
      }

      // A code was sent: check it against the secret
      const codeIsValid = authenticator.check(String(code).trim(), user.twoFactorSecret);
      if (!codeIsValid) {
        return res.status(401).json({ message: 'That code is not correct. Try again.' });
      }
    }

    // 5b. Remember when the user signed in
    user.lastLoginAt = new Date();
    await user.save();

    // 5c. Work out which browser and system this sign-in came from
    const userAgent = req.headers['user-agent'];
    const browser = getBrowserName(userAgent);
    const os = getOsName(userAgent);
    const deviceKey = `${browser} on ${os}`; // e.g. "Chrome on Windows"

    // 5d. Have we seen this device before?
    const knownDevice = await Device.findOne({ user: user._id, deviceKey: deviceKey });

    if (knownDevice) {
      // Yes: just update when and where it was last used
      knownDevice.lastActiveAt = new Date();
      knownDevice.ipAddress = req.ip;
      await knownDevice.save();
    } else {
      // No: this is a new device. First, how many devices does the user have?
      const deviceCount = await Device.countDocuments({ user: user._id });

      // Save the new device. The very first one is trusted automatically.
      await Device.create({
        user: user._id,
        deviceKey: deviceKey,
        browser: browser,
        os: os,
        ipAddress: req.ip,
        isTrusted: deviceCount === 0,
      });

      // Only warn if the user already had other devices
      if (deviceCount > 0) {
        await Activity.create({
          user: user._id,
          type: 'new_device',
          description: `New device detected: ${deviceKey}`,
          status: 'warning',
          ipAddress: req.ip,
        });

        await Alert.create({
          user: user._id,
          type: 'new_device',
          title: 'New device detected',
          message: `Your account was accessed from ${deviceKey}. If this was not you, change your password.`,
          severity: 'medium',
        });
      }
    }

    // 5e. Record the sign-in itself as an activity
    await Activity.create({
      user: user._id,
      type: 'login',
      description: `Login from ${browser}`,
      status: 'success',
      ipAddress: req.ip,
    });

    // 6. Create the login ticket and store it in a cookie
    createLoginCookie(res, user);

    // 7. Reply to React (never send the password back!)
    res.status(200).json({
      message: 'Signed in successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log('Login error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ---------- WHO AM I ----------
// Runs after "protect", so req.user is already filled in
export async function getMe(req, res) {
  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      twoFactorEnabled: req.user.twoFactorEnabled,
      lastLoginAt: req.user.lastLoginAt,
    },
  });
}

// ---------- SIGN OUT ----------
export async function logout(req, res) {
  // Delete the cookie. These options must match the ones used when we set it.
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({ message: 'Signed out successfully.' });
}

// ---------- CHANGE PASSWORD ----------
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Check that nothing is missing
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required.' });
    }

    // 2. Check the new password is acceptable
    const passwordProblem = validatePassword(newPassword);
    if (passwordProblem) {
      return res.status(400).json({ message: passwordProblem });
    }

    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({ message: 'New password must be different from your current password.' });
    }

    // 3. Load the user again WITH the password
    //    (req.user was loaded without it, so we cannot use that one)
    const user = await User.findById(req.user._id);

    // 4. Check the current password is correct.
    //    We use status 400 here, not 401, so the page does not think the user was signed out.
    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // 5. Hash the new password and save it, with the time it was changed
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    user.tokenVersion += 1; // every older ticket stops working
    await user.save();

    // 6. Give THIS device a fresh ticket, so the user stays signed in here
    createLoginCookie(res, user);

    // 7. Record it as an activity for the dashboard
    await Activity.create({
      user: user._id,
      type: 'password_changed',
      description: 'Password changed',
      status: 'success',
      ipAddress: req.ip,
    });

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.log('Change password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}