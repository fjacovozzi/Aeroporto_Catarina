// server/routes/settingsRoutes.js
import express from 'express';
import { readJson, writeJson } from '../services/jsonStore.js';

export const settingsRouter = express.Router();

// GET /api/settings
settingsRouter.get('/', async (req, res) => {
  try {
    const settings = await readJson('settings');
    res.json(settings);
  } catch (err) {
    console.error('Error reading settings:', err);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// PUT /api/settings
settingsRouter.put('/', async (req, res) => {
  try {
    const { clearance_m } = req.body;
    if (typeof clearance_m !== 'number' || clearance_m < 0) {
      return res.status(400).json({ error: 'clearance_m must be a non-negative number' });
    }

    const newSettings = { clearance_m };
    await writeJson('settings', newSettings);
    res.json(newSettings);
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
