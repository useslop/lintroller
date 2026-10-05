// Reads the app's own source files for the copy-lint and static-grep gates.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SRC = fileURLToPath(new URL('../src/', import.meta.url));

export function sourceFiles(dir: string = SRC): { path: string; text: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(name)) return [];
    return [{ path: relative(SRC, full), text: readFileSync(full, 'utf8') }];
  });
}
