// server/routes/hangarsRoutes.js
import express from 'express';
import { readJson, writeJson } from '../services/jsonStore.js';
import { nextId } from '../services/idUtils.js';

export const hangarsRouter = express.Router();

// GET /api/hangars
hangarsRouter.get('/', async (req, res) => {
  try {
    const data = await readJson('hangars');
    res.json(data);
  } catch (err) {
    console.error('Error reading hangars:', err);
    res.status(500).json({ error: 'Failed to read hangars' });
  }
});

// POST /api/hangars
hangarsRouter.post('/', async (req, res) => {
  try {
    const {
      hangar_name,
      hangar_position,
      size,
      rotation_deg = 0,
      door,
    } = req.body;

    if (!hangar_name || !hangar_position || !size || !door) {
      return res.status(400).json({ error: 'hangar_name, hangar_position, size and door are required' });
    }

    const data = await readJson('hangars');
    const id = nextId(data);
    const novo = { id, hangar_name, hangar_position, size, rotation_deg, door };
    data.push(novo);
    await writeJson('hangars', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating hangar:', err);
    res.status(500).json({ error: 'Failed to create hangar' });
  }
});

// PUT /api/hangars/:id
hangarsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('hangars');
    const idx = data.findIndex(h => h.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Hangar not found' });

    const fields = ['hangar_name', 'hangar_position', 'size', 'rotation_deg', 'door'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[idx][f] = req.body[f];
    }

    await writeJson('hangars', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating hangar:', err);
    res.status(500).json({ error: 'Failed to update hangar' });
  }
});

// DELETE /api/hangars/:id
hangarsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('hangars');
    const idx = data.findIndex(h => h.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Hangar not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('hangars', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting hangar:', err);
    res.status(500).json({ error: 'Failed to delete hangar' });
  }
});
