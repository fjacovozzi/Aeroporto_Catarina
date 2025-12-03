// server/routes/prefixosRoutes.js
import express from 'express';
import { readJson, writeJson } from '../services/jsonStore.js';
import { nextId } from '../services/idUtils.js';

export const prefixosRouter = express.Router();

// GET /api/prefixos
prefixosRouter.get('/', async (req, res) => {
  try {
    const data = await readJson('prefixos');
    res.json(data);
  } catch (err) {
    console.error('Error reading prefixos:', err);
    res.status(500).json({ error: 'Failed to read prefixos' });
  }
});

// POST /api/prefixos
prefixosRouter.post('/', async (req, res) => {
  try {
    const {
      prefixo,
      model_name,
      eta = null,
      etd = null,
      hangarPreferencial = null,
      hangarObrigatorio = false,
      podeAoTempo = false,
      servicos = [],
      prioridade = 'normal',
      observacoes = '',
    } = req.body;

    if (!prefixo || !model_name) {
      return res.status(400).json({ error: 'prefixo and model_name are required' });
    }

    const data = await readJson('prefixos');
    const id = nextId(data);
    const novo = {
      id,
      prefixo,
      model_name,
      eta,
      etd,
      hangarPreferencial,
      hangarObrigatorio,
      podeAoTempo,
      servicos,
      prioridade,
      observacoes,
    };
    data.push(novo);
    await writeJson('prefixos', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating prefixo:', err);
    res.status(500).json({ error: 'Failed to create prefixo' });
  }
});

// PUT /api/prefixos/:id
prefixosRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('prefixos');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Prefixo not found' });

    const fields = [
      'prefixo',
      'model_name',
      'eta',
      'etd',
      'hangarPreferencial',
      'hangarObrigatorio',
      'podeAoTempo',
      'servicos',
      'prioridade',
      'observacoes',
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[idx][f] = req.body[f];
    }

    await writeJson('prefixos', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating prefixo:', err);
    res.status(500).json({ error: 'Failed to update prefixo' });
  }
});

// DELETE /api/prefixos/:id
prefixosRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('prefixos');
    const idx = data.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Prefixo not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('prefixos', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting prefixo:', err);
    res.status(500).json({ error: 'Failed to delete prefixo' });
  }
});
