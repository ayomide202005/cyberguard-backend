import mongoose from 'mongoose';

// This function connects our app to MongoDB
async function connectDB() {
  try {
    // process.env.MONGO_URI is the connection string from your .env file
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.log('MongoDB connection failed:', error.message);
    process.exit(1); // stop the app, because it cannot work without a database
  }
}

export default connectDB;