import mongoose from 'mongoose';
import Alert from '../models/Alert.js';

// ---------- LIST ALERTS ----------
export async function getAlerts(req, res) {
  try {
    // isResolved: 1 puts unresolved (false) first. createdAt: -1 puts newest first.
    const alerts = await Alert.find({ user: req.user._id }).sort({
      isResolved: 1,
      createdAt: -1,
    });

    res.status(200).json({
      alerts: alerts.map((alert) => ({
        id: alert._id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        isResolved: alert.isResolved,
        createdAt: alert.createdAt,
      })),
    });
  } catch (error) {
    console.log('Get alerts error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ---------- MARK AN ALERT AS RESOLVED ----------
export async function resolveAlert(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Alert not found.' });
    }

    const alert = await Alert.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isResolved: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found.' });
    }

    res.status(200).json({ message: 'Alert resolved.' });
  } catch (error) {
    console.log('Resolve alert error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}