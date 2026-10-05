// Main-thread client for the worker. Falls back to the same pipeline in-thread where Workers are unavailable (tests, old browsers).
import { aliases } from './data';
import { runImportWithAliases, type ImportReport, type InputFile, type WorkerRequest, type WorkerResponse } from './pipeline';

let nextId = 1;

export function runImportAsync(inputs: InputFile[]): Promise<ImportReport> {
  if (typeof Worker === 'undefined') {
    try {
      return Promise.resolve(runImportWithAliases(inputs, aliases));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker/engine.worker.ts', import.meta.url), { type: 'module' });
    const id = nextId++;
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      worker.terminate();
      if (ev.data.ok) resolve(ev.data.report);
      else reject(new Error(ev.data.message));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('The engine stopped unexpectedly. Try a smaller file.'));
    };
    const request: WorkerRequest = { id, inputs, aliases };
    worker.postMessage(request);
  });
}
