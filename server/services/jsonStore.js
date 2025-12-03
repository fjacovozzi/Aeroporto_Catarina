// server/services/jsonStore.js
import fs from 'fs/promises';
import { paths } from '../utils/filePaths.js';

async function ensureFileExists(filePath, defaultContent) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
  }
}

export async function initJsonFiles() {
  await Promise.all([
    ensureFileExists(paths.settings, { clearance_m: 1.0 }),
    ensureFileExists(paths.modelos, []),
    ensureFileExists(paths.hangars, []),
    ensureFileExists(paths.prefixos, []),
    ensureFileExists(paths.paths, []),
    ensureFileExists(paths.users, [
      {
        id: 1,
        username: 'admin',
        password: 'admin', // simples por enquanto (rede interna)
        role: 'admin',
        active: true,
      },
    ]),
    ensureFileExists(paths.placementsSaved, []),
    ensureFileExists(paths.placementsCurrent, []),
  ]);
}

export async function readJson(key) {
  const filePath = paths[key];
  if (!filePath) throw new Error(`Unknown JSON key: ${key}`);

  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw || 'null');
}

export async function writeJson(key, data) {
  const filePath = paths[key];
  if (!filePath) throw new Error(`Unknown JSON key: ${key}`);

  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Copia placements_saved.json -> placements_current_view.json
 */
export async function syncPlacementsCurrentFromSaved() {
  const saved = await readJson('placementsSaved');
  await writeJson('placementsCurrent', saved);
}
