import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const projectRoot = path.resolve(siteRoot, '..');
export const publicRoot = path.join(siteRoot, 'public');
