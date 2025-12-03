// server/routes/authRoutes.js
import express from 'express';
import { readJson } from '../services/jsonStore.js';

export const authRouter = express.Router();

// POST /api/login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readJson('users');
    const user = users.find(u => u.username === username && u.password === password && u.active);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Sem JWT por enquanto, apenas retorna info básica
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error on login:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});
