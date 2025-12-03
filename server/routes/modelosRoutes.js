// server/routes/modelosRoutes.js
import express from 'express';
import { readJson, writeJson } from '../services/jsonStore.js';
import { nextId } from '../services/idUtils.js';

export const modelosRouter = express.Router();

// GET /api/modelos
modelosRouter.get('/', async (req, res) => {
  try {
    const data = await readJson('modelos');
    res.json(data);
  } catch (err) {
    console.error('Error reading modelos:', err);
    res.status(500).json({ error: 'Failed to read modelos' });
  }
});

// POST /api/modelos
modelosRouter.post('/', async (req, res) => {
  try {
    const { model_name, glb_path } = req.body;
    if (!model_name || !glb_path) {
      return res.status(400).json({ error: 'model_name and glb_path are required' });
    }

    const data = await readJson('modelos');
    const id = nextId(data);
    const novo = { id, model_name, glb_path };
    data.push(novo);
    await writeJson('modelos', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating modelo:', err);
    res.status(500).json({ error: 'Failed to create modelo' });
  }
});

// PUT /api/modelos/:id
modelosRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('modelos');
    const idx = data.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Modelo not found' });

    const { model_name, glb_path } = req.body;
    if (model_name !== undefined) data[idx].model_name = model_name;
    if (glb_path !== undefined) data[idx].glb_path = glb_path;

    await writeJson('modelos', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating modelo:', err);
    res.status(500).json({ error: 'Failed to update modelo' });
  }
});

// DELETE /api/modelos/:id
modelosRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('modelos');
    const idx = data.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Modelo not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('modelos', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting modelo:', err);
    res.status(500).json({ error: 'Failed to delete modelo' });
  }
});
