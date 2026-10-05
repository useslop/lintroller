// Module worker: runs the import pipeline off the main thread. Replies with counts and messages only, never row text.
import { runImportWithAliases, type WorkerRequest, type WorkerResponse } from '../pipeline';

const reply = (msg: WorkerResponse) => (self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(msg);

self.addEventListener('message', (ev: MessageEvent<WorkerRequest>) => {
  const { id, inputs, aliases } = ev.data;
  try {
    reply({ id, ok: true, report: runImportWithAliases(inputs, aliases) });
  } catch (err) {
    reply({ id, ok: false, message: err instanceof Error ? err.message : 'Could not read these files.' });
  }
});
