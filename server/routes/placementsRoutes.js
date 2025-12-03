// server/routes/placementsRoutes.js
import express from 'express';
import { readJson, writeJson, syncPlacementsCurrentFromSaved } from '../services/jsonStore.js';
import { nextId } from '../services/idUtils.js';

export const placementsRouter = express.Router();

// ---------- SAVED ----------

// GET /api/placements/saved
placementsRouter.get('/saved', async (req, res) => {
  try {
    const data = await readJson('placementsSaved');
    res.json(data);
  } catch (err) {
    console.error('Error reading placements_saved:', err);
    res.status(500).json({ error: 'Failed to read placements_saved' });
  }
});

// POST /api/placements/saved
placementsRouter.post('/saved', async (req, res) => {
  try {
    const data = await readJson('placementsSaved');
    const id = nextId(data);
    const novo = { id, ...req.body };
    data.push(novo);
    await writeJson('placementsSaved', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating placement_saved:', err);
    res.status(500).json({ error: 'Failed to create placement_saved' });
  }
});

// PUT /api/placements/saved/:id
placementsRouter.put('/saved/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('placementsSaved');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Placement_saved not found' });

    Object.assign(data[idx], req.body);
    await writeJson('placementsSaved', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating placement_saved:', err);
    res.status(500).json({ error: 'Failed to update placement_saved' });
  }
});

// DELETE /api/placements/saved/:id
placementsRouter.delete('/saved/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('placementsSaved');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Placement_saved not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('placementsSaved', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting placement_saved:', err);
    res.status(500).json({ error: 'Failed to delete placement_saved' });
  }
});

// ---------- CURRENT VIEW ----------

// GET /api/placements/current
placementsRouter.get('/current', async (req, res) => {
  try {
    const data = await readJson('placementsCurrent');
    res.json(data);
  } catch (err) {
    console.error('Error reading placements_current:', err);
    res.status(500).json({ error: 'Failed to read placements_current' });
  }
});

// POST /api/placements/current
placementsRouter.post('/current', async (req, res) => {
  try {
    const data = await readJson('placementsCurrent');
    const id = nextId(data);
    const novo = { id, ...req.body };
    data.push(novo);
    await writeJson('placementsCurrent', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating placement_current:', err);
    res.status(500).json({ error: 'Failed to create placement_current' });
  }
});

// PUT /api/placements/current/:id
placementsRouter.put('/current/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('placementsCurrent');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Placement_current not found' });

    Object.assign(data[idx], req.body);
    await writeJson('placementsCurrent', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating placement_current:', err);
    res.status(500).json({ error: 'Failed to update placement_current' });
  }
});

// DELETE /api/placements/current/:id
placementsRouter.delete('/current/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('placementsCurrent');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Placement_current not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('placementsCurrent', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting placement_current:', err);
    res.status(500).json({ error: 'Failed to delete placement_current' });
  }
});

// POST /api/placements/current/sync-from-saved
placementsRouter.post('/current/sync-from-saved', async (req, res) => {
  try {
    await syncPlacementsCurrentFromSaved();
    const data = await readJson('placementsCurrent');
    res.json({ success: true, placementsCurrent: data });
  } catch (err) {
    console.error('Error syncing placements_current from saved:', err);
    res.status(500).json({ error: 'Failed to sync placements_current' });
  }
});

// ---------- SALVAR POSIÇÕES REGRAS ----------
// POST /api/placements/save
placementsRouter.post('/save', async (req, res) => {
  try {
    const { scope, hangar_name } = req.body;
    const current = await readJson('placementsCurrent');
    let saved = await readJson('placementsSaved');

    if (scope === 'Todos') {
      saved = current;
    } else if (scope === 'Hangar') {
      if (!hangar_name) {
        return res.status(400).json({ error: 'hangar_name is required when scope = Hangar' });
      }
      const others = saved.filter(p => p.hangar_name !== hangar_name);
      const fromCurrent = current.filter(p => p.hangar_name === hangar_name);
      saved = [...others, ...fromCurrent];
    } else {
      return res.status(400).json({ error: 'Invalid scope. Use "Todos" or "Hangar"' });
    }

    await writeJson('placementsSaved', saved);
    res.json({ success: true, placementsSaved: saved });
  } catch (err) {
    console.error('Error saving placements:', err);
    res.status(500).json({ error: 'Failed to save placements' });
  }
});
