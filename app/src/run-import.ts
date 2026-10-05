// Main-thread client for the worker. Falls back to the same pipeline in-thread where Workers are unavailable (tests, old browsers).
// One long-lived worker, started with the page (main.tsx): its script loads with the rest of the page, so
// importing a file makes no request at all and still works offline after the first load (SPEC §10 steps 2, 7).
import { aliases } from './data';
import { runImportWithAliases, type ImportReport, type InputFile, type WorkerRequest, type WorkerResponse } from './pipeline';

let nextId = 1;
let worker: Worker | null = null;
const waiting = new Map<number, { resolve: (r: ImportReport) => void; reject: (e: Error) => void }>();

export function startEngineWorker(): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  const w = new Worker(new URL('./worker/engine.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const job = waiting.get(ev.data.id);
    if (!job) return;
    waiting.delete(ev.data.id);
    if (ev.data.ok) job.resolve(ev.data.report);
    else job.reject(new Error(ev.data.message));
  };
  w.onerror = () => {
    // A crash (usually memory on a huge file) ends this worker; the next import starts a fresh one.
    w.terminate();
    if (worker === w) worker = null;
    for (const job of waiting.values()) job.reject(new Error('The engine stopped unexpectedly. Try a smaller file.'));
    waiting.clear();
  };
  worker = w;
  return w;
}

export function runImportAsync(inputs: InputFile[]): Promise<ImportReport> {
  const w = startEngineWorker();
  if (!w) {
    try {
      return Promise.resolve(runImportWithAliases(inputs, aliases));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    const request: WorkerRequest = { id, inputs, aliases };
    w.postMessage(request);
  });
}
