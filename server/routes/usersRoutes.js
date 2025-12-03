// server/routes/usersRoutes.js
import express from 'express';
import { readJson, writeJson } from '../services/jsonStore.js';
import { nextId } from '../services/idUtils.js';

export const usersRouter = express.Router();

// GET /api/users
usersRouter.get('/', async (req, res) => {
  try {
    const data = await readJson('users');
    res.json(data);
  } catch (err) {
    console.error('Error reading users:', err);
    res.status(500).json({ error: 'Failed to read users' });
  }
});

// POST /api/users
usersRouter.post('/', async (req, res) => {
  try {
    const { username, password, role = 'user', active = true } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const data = await readJson('users');
    if (data.some(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const id = nextId(data);
    const novo = { id, username, password, role, active };
    data.push(novo);
    await writeJson('users', data);
    res.status(201).json(novo);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id
usersRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('users');
    const idx = data.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const fields = ['username', 'password', 'role', 'active'];
    for (const f of fields) {
      if (req.body[f] !== undefined) data[idx][f] = req.body[f];
    }

    await writeJson('users', data);
    res.json(data[idx]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
usersRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = await readJson('users');
    const idx = data.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const removed = data.splice(idx, 1)[0];
    await writeJson('users', data);
    res.json(removed);
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
