import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session } from '@/domain/types';

interface SessionStore {
  session: Session | null;
  setSession: (s: Session | null) => void;
  elevate: (minutes: number) => void;
}

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      elevate: (minutes) => {
        const s = get().session;
        if (s) set({ session: { ...s, elevatedUntil: new Date(Date.now() + minutes * 60_000).toISOString() } });
      },
    }),
    { name: 'kids-session', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export function isElevated(s: Session | null): boolean {
  return !!s?.elevatedUntil && new Date(s.elevatedUntil).getTime() > Date.now();
}

export function isAdult(s: Session | null): boolean {
  return !!s && s.role !== 'child';
}

export function isParent(s: Session | null): boolean {
  return !!s && (s.role === 'parent' || s.role === 'coparent');
}
