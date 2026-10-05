// In-memory session: the last import, the statuses and the opt-in storage. Nothing is loaded from storage unless the user asks.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Finding, StatusMap } from './engine';
import type { ImportReport } from './pipeline';
import { forgetSaved, readSaved, writeSaved } from './storage';

interface SessionValue {
  report: ImportReport | null;
  findings: Finding[] | null;
  statuses: StatusMap;
  remember: boolean;
  savedAvailable: boolean;
  note: string | null;
  setReport: (report: ImportReport) => void;
  setStatus: (id: string, status: 'confirmed' | 'dismissed' | null) => void;
  setRemember: (on: boolean) => void;
  openSaved: () => void;
  deleteEverything: () => void;
  setNote: (note: string | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [report, setReportState] = useState<ImportReport | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [remember, setRememberState] = useState(false);
  const [savedAvailable, setSavedAvailable] = useState(() => readSaved() !== null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (remember && findings) writeSaved({ savedAt: new Date().toISOString(), statuses, findings });
  }, [remember, findings, statuses]);

  const setReport = useCallback((next: ImportReport) => {
    setReportState(next);
    setFindings(next.detect.findings);
  }, []);

  const setStatus = useCallback((id: string, status: 'confirmed' | 'dismissed' | null) => {
    setStatuses((prev) => {
      const next = { ...prev };
      if (status === null) delete next[id];
      else next[id] = status;
      return next;
    });
  }, []);

  const setRemember = useCallback((on: boolean) => {
    setRememberState(on);
    if (!on) forgetSaved();
  }, []);

  const openSaved = useCallback(() => {
    const saved = readSaved();
    if (!saved) return;
    setReportState(null);
    setFindings(saved.findings);
    setStatuses(saved.statuses);
    setRememberState(true);
  }, []);

  const deleteEverything = useCallback(() => {
    forgetSaved();
    setReportState(null);
    setFindings(null);
    setStatuses({});
    setRememberState(false);
    setSavedAvailable(false);
    setNote('Deleted everything. Nothing is kept on this device.');
  }, []);

  const value = useMemo<SessionValue>(() => ({
    report, findings, statuses, remember, savedAvailable, note,
    setReport, setStatus, setRemember, openSaved, deleteEverything, setNote,
  }), [report, findings, statuses, remember, savedAvailable, note, setReport, setStatus, setRemember, openSaved, deleteEverything]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
