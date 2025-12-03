// server/routes/pathsRoutes.js
import express from 'express';
import { readJson, writeJson } from '../services/jsonStore.js';
import { nextId } from '../services/idUtils.js';

export const pathsRouter = express.Router();

// GET /api/paths
pathsRouter.get('/', async (req, res) => {
  try {
    const data = await readJson('paths');
    res.json(data);
  } catch (err) {
    console.error('Error reading paths:', err);
    res.status(500).json({ error: 'Failed to read paths' });
  }
});

// POST /api/paths
pathsRouter.post('/', async (req, res) => {
  try {
    const { name, description = '', hangar_name = null, points = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const data = await readJson('paths');
    const id = nextId(data);
    const novo = { id, name, description, hangar_name, points };
    data.push(novo);
    await writeJson('paths', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating path:', err);
    res.status(500).json({ error: 'Failed to create path' });
  }
});

// PUT /api/paths/:id
pathsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('paths');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Path not found' });

    const fields = ['name', 'description', 'hangar_name', 'points'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[idx][f] = req.body[f];
    }

    await writeJson('paths', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating path:', err);
    res.status(500).json({ error: 'Failed to update path' });
  }
});

// DELETE /api/paths/:id
pathsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('paths');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Path not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('paths', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting path:', err);
    res.status(500).json({ error: 'Failed to delete path' });
  }
});
