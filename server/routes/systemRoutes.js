// server/routes/systemRoutes.js
import express from 'express';
import { initJsonFiles, syncPlacementsCurrentFromSaved } from '../services/jsonStore.js';

export const systemRouter = express.Router();

// POST /api/system/refresh
systemRouter.post('/refresh', async (req, res) => {
  try {
    // re-garante existência dos arquivos e ressincroniza placements_current
    await initJsonFiles();
    await syncPlacementsCurrentFromSaved();

    res.json({ success: true });
  } catch (err) {
    console.error('Error on system refresh:', err);
    res.status(500).json({ success: false, error: 'Failed to refresh system' });
  }
});
