"use client";

// Academic session (academic year) context for the whole app.
// - `currentSession`: the session marked active (admissions, fees use it).
// - `selectedSession`: the session the user is viewing; defaults to the active
//   one and is remembered per browser. Lists like Students and Exams filter by it.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean; // false = closed (read-only)
  _count?: { students: number; feeStructures?: number; exams?: number };
}

interface AcademicSessionContextValue {
  sessions: AcademicSession[];
  currentSession: AcademicSession | null;
  selectedSession: AcademicSession | null;
  isViewingCurrent: boolean;
  loading: boolean;
  selectSession: (id: string | null) => void;
  refreshSessions: () => Promise<void>;
}

const STORAGE_KEY = "ahps.selectedSessionId";

const AcademicSessionContext = createContext<AcademicSessionContextValue | null>(null);

export function sessionStatus(s: AcademicSession, now = new Date()) {
  if (!s.isActive) return "CLOSED" as const;
  if (s.isCurrent) return new Date(s.endDate) < now ? ("ENDED_ACTIVE" as const) : ("ACTIVE" as const);
  if (new Date(s.startDate) > now) return "UPCOMING" as const;
  if (new Date(s.endDate) < now) return "ENDED" as const;
  return "OPEN" as const;
}

export function AcademicSessionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setSelectedId(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // storage unavailable
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/academic-years?withCounts=1");
      if (res.ok) {
        const d = await res.json();
        setSessions(d.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") void refreshSessions();
  }, [status, refreshSessions]);

  const selectSession = useCallback((id: string | null) => {
    setSelectedId(id);
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  }, []);

  const value = useMemo<AcademicSessionContextValue>(() => {
    const currentSession = sessions.find((s) => s.isCurrent) ?? null;
    const selectedSession = sessions.find((s) => s.id === selectedId) ?? currentSession;
    return {
      sessions,
      currentSession,
      selectedSession,
      isViewingCurrent: !!selectedSession && selectedSession.id === currentSession?.id,
      loading,
      selectSession,
      refreshSessions,
    };
  }, [sessions, selectedId, loading, selectSession, refreshSessions]);

  return <AcademicSessionContext.Provider value={value}>{children}</AcademicSessionContext.Provider>;
}

export function useAcademicSession(): AcademicSessionContextValue {
  const ctx = useContext(AcademicSessionContext);
  if (!ctx) throw new Error("useAcademicSession must be used inside AcademicSessionProvider");
  return ctx;
}
