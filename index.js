// Load the .env file FIRST, so PORT and MONGO_URI are available
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import dashboardRoutes from './routes/dashboardRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import twoFactorRoutes from './routes/twoFactorRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Security middleware ----------

// Adds protective headers to every response (and hides "X-Powered-By: Express")
app.use(helmet());

// Only our React app may talk to this server, and it may send cookies.
// Set CLIENT_URL in .env when you deploy. Until then we use the Vite address.
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Limit how big a request can be (stops someone sending huge data)
app.use(express.json({ limit: '10kb' }));

app.use(cookieParser()); // lets us read cookies on incoming requests

// ---------- Rate limiting ----------

// Strict limit for sign-in: 10 failed tries per 15 minutes per visitor.
// Successful sign-ins are not counted.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait 15 minutes and try again.' },
});

// Gentle limit for everything else: 300 requests per 15 minutes per visitor
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);

// ---------- Routes ----------

// Test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Any URL starting with /api/auth goes to authRoutes
// '/api/auth' + '/register' = '/api/auth/register'
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/2fa', twoFactorRoutes);

// Connect to the database first, then start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});