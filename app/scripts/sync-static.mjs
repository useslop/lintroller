// Copies the sample CSV and the privacy result into the places the build needs them.
// The sample is bundled from app/sample (?raw import); the static copies serve /sample/… and /privacy-results.json.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const corpusSample = resolve(app, '../corpus/out/sample-statement.csv');
const bundledSample = resolve(app, 'sample/sample-statement.csv');

if (existsSync(corpusSample)) copyFileSync(corpusSample, bundledSample);
mkdirSync(resolve(app, 'public/sample'), { recursive: true });
copyFileSync(bundledSample, resolve(app, 'public/sample/sample-statement.csv'));
copyFileSync(resolve(app, 'src/privacy-results.json'), resolve(app, 'public/privacy-results.json'));
console.log(existsSync(corpusSample) ? 'sample: from corpus/out' : 'sample: placeholder (corpus/out not built yet)');
