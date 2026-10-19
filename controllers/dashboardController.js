import Device from '../models/Device.js';
import Alert from '../models/Alert.js';
import Activity from '../models/Activity.js';
import calculateSecurity from '../utils/securityScore.js';

export async function getDashboard(req, res) {
  try {
    // "protect" already found the signed-in user for us
    const user = req.user;

    // 1. Get this user's data from the database
    const devices = await Device.find({ user: user._id });
    const openAlertCount = await Alert.countDocuments({ user: user._id, isResolved: false });
    const activityCount = await Activity.countDocuments({ user: user._id });

    // The 5 newest activities (-1 means newest first)
    const recentActivity = await Activity.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // 2. Calculate the score, bars and recommendations
    const security = calculateSecurity({ user, devices, openAlertCount });

    // 3. Send everything the dashboard needs in one reply
    res.status(200).json({
      user: { name: user.name },
      score: { value: security.score, label: security.label },
      stats: {
        devices: devices.length,
        alerts: openAlertCount,
        activities: activityCount,
      },
      breakdown: security.breakdown,
      recentActivity: recentActivity.map((item) => ({
        id: item._id,
        description: item.description,
        status: item.status,
        createdAt: item.createdAt,
      })),
      recommendations: security.recommendations,
    });
  } catch (error) {
    console.log('Dashboard error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}