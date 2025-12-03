// server/index.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { initJsonFiles, syncPlacementsCurrentFromSaved } from './services/jsonStore.js';

import { settingsRouter } from './routes/settingsRoutes.js';
import { modelosRouter } from './routes/modelosRoutes.js';
import { hangarsRouter } from './routes/hangarsRoutes.js';
import { prefixosRouter } from './routes/prefixosRoutes.js';
import { pathsRouter } from './routes/pathsRoutes.js';
import { usersRouter } from './routes/usersRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { placementsRouter } from './routes/placementsRoutes.js';
import { systemRouter } from './routes/systemRoutes.js';



const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '..', 'client'); // vamos usar depois

// ADICIONE ISTO:
const rootDir = path.resolve(__dirname, '..');
app.use('/node_modules', express.static(path.join(rootDir, 'node_modules')));

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rotas API
app.use('/api/settings', settingsRouter);
app.use('/api/modelos', modelosRouter);
app.use('/api/hangars', hangarsRouter);
app.use('/api/prefixos', prefixosRouter);
app.use('/api/paths', pathsRouter);
app.use('/api/users', usersRouter);
app.use('/api', authRouter); // /api/login
app.use('/api/placements', placementsRouter);
app.use('/api/system', systemRouter);

// (opcional) servir frontend estático depois
app.use(express.static(clientDir));

// Inicialização do servidor
(async () => {
  try {
    await initJsonFiles();
    await syncPlacementsCurrentFromSaved();

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
})();
