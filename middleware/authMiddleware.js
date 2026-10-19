import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// This function runs BEFORE a protected route.
// If the user is signed in, it adds them to req.user and lets the request continue.
export async function protect(req, res, next) {
  try {
    // 1. Read the login ticket from the cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Not signed in.' });
    }

    // 2. Check the ticket is real and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user the ticket belongs to (without the password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    // 4. If the password was changed after this ticket was made, reject it.
    //    (Old tickets with no version count as version 0.)
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }

    // 5. Attach the user to the request so the next function can use it
    req.user = user;

    // 6. Let the request continue to the route
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}