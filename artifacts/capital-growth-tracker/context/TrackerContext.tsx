import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActualRecord,
  calculateTracker,
  DEFAULT_RECORDS,
  DEFAULT_SETTINGS,
  TrackerSettings,
  TrackerSnapshot,
} from '@/lib/calculations';

type TrackerContextValue = {
  snapshot: TrackerSnapshot;
  hydrated: boolean;
  profileUri: string | null;
  setProfileUri: (uri: string | null) => void;
  updateSettings: (changes: Partial<TrackerSettings>) => void;
  addRecord: (date: string, actualProfit: number) => void;
  resetTracker: () => void;
};

const STORAGE_KEY = 'capital-growth-tracker-v1';
const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TrackerSettings>(DEFAULT_SETTINGS);
  const [records, setRecords] = useState<ActualRecord[]>(DEFAULT_RECORDS);
  const [profileUri, setProfileUri] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as {
            settings?: TrackerSettings;
            records?: ActualRecord[];
            profileUri?: string | null;
          };
          setSettings({ ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) });
          setRecords(parsed.records ?? DEFAULT_RECORDS);
          setProfileUri(parsed.profileUri ?? null);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, records, profileUri })).catch(() => undefined);
  }, [hydrated, profileUri, records, settings]);

  const snapshot = useMemo(() => calculateTracker(settings, records), [records, settings]);

  const value = useMemo<TrackerContextValue>(
    () => ({
      snapshot,
      hydrated,
      profileUri,
      setProfileUri,
      updateSettings: (changes) => setSettings((current) => ({ ...current, ...changes })),
      addRecord: (date, actualProfit) => {
        setRecords((current) => {
          const withoutDate = current.filter((record) => record.date !== date);
          return [
            ...withoutDate,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              date,
              actualProfit,
            },
          ].sort((a, b) => a.date.localeCompare(b.date));
        });
      },
      resetTracker: () => {
        setSettings(DEFAULT_SETTINGS);
        setRecords(DEFAULT_RECORDS);
      },
    }),
    [hydrated, profileUri, snapshot],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker() {
  const value = useContext(TrackerContext);
  if (!value) throw new Error('useTracker must be used inside TrackerProvider');
  return value;
}