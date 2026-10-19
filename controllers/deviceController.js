import mongoose from 'mongoose';
import Device from '../models/Device.js';
import getBrowserName from '../utils/getBrowserName.js';
import getOsName from '../utils/getOsName.js';

// ---------- LIST DEVICES ----------
export async function getDevices(req, res) {
  try {
    const devices = await Device.find({ user: req.user._id }).sort({ lastActiveAt: -1 });

    // Work out which device is making THIS request, so the page can say "This device"
    const userAgent = req.headers['user-agent'];
    const currentKey = `${getBrowserName(userAgent)} on ${getOsName(userAgent)}`;

    res.status(200).json({
      devices: devices.map((device) => ({
        id: device._id,
        name: device.deviceKey,
        browser: device.browser,
        os: device.os,
        ipAddress: device.ipAddress,
        lastActiveAt: device.lastActiveAt,
        isTrusted: device.isTrusted,
        isCurrent: device.deviceKey === currentKey,
      })),
    });
  } catch (error) {
    console.log('Get devices error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ---------- MARK A DEVICE AS TRUSTED ----------
export async function trustDevice(req, res) {
  try {
    const { id } = req.params;

    // Make sure the id looks like a real database id
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    // The "user" part makes sure the device belongs to the signed-in user
    const device = await Device.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isTrusted: true },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    res.status(200).json({ message: 'Device marked as trusted.' });
  } catch (error) {
    console.log('Trust device error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}

// ---------- REMOVE A DEVICE ----------
export async function removeDevice(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    const device = await Device.findOneAndDelete({ _id: id, user: req.user._id });

    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    res.status(200).json({ message: 'Device removed.' });
  } catch (error) {
    console.log('Remove device error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
}