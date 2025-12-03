// server/utils/filePaths.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// raiz do projeto (um nível acima de /server)
const rootDir = path.resolve(__dirname, '..', '..');
const dataDir = path.join(rootDir, 'data');

export const paths = {
  settings: path.join(dataDir, 'settings.json'),
  modelos: path.join(dataDir, 'modelos.json'),
  hangars: path.join(dataDir, 'hangars.json'),
  prefixos: path.join(dataDir, 'prefixos.json'),
  placementsSaved: path.join(dataDir, 'placements_saved.json'),
  placementsCurrent: path.join(dataDir, 'placements_current_view.json'),
  paths: path.join(dataDir, 'paths.json'),
  users: path.join(dataDir, 'users.json'),
};

export { dataDir, rootDir };
