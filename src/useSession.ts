import { useCallback, useEffect, useRef, useState } from 'react';
import { appendSample, request } from './lib';
import type { Environment, Frame, Sample, Settings } from './types';

export function useSession() {
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [history, setHistory] = useState<Sample[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef<Frame | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);

  const accept = useCallback((next: Frame) => {
    if (!alive.current) return;
    latest.current = next; setFrame(next); setError(null);
    setHistory(current => appendSample(current, {
      t: next.timestamp, baseline: next.evaluation.baseline_error, proposed: next.evaluation.proposed_error,
      truth: next.evaluation.ground_truth, basePosition: next.baseline.position, proposedPosition: next.tracking.position,
    }));
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      const environments = await request<{ environments: Environment[] }>('/environments');
      setEnvironment(environments.environments[0]);
      const stored = sessionStorage.getItem('locus-session');
      let initial: Frame;
      try {
        initial = stored ? await request<Frame>(`/sessions/${stored}`) : await request<Frame>('/sessions', { method: 'POST', body: '{}' });
      } catch {
        initial = await request<Frame>('/sessions', { method: 'POST', body: '{}' });
      }
      sessionStorage.setItem('locus-session', initial.session_id);
      accept(initial);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect to backend'); }
    finally { setBusy(false); }
  }, [accept]);

  useEffect(() => { alive.current = true; void connect(); return () => { alive.current = false; }; }, [connect]);

  const mutate = useCallback((operation: 'advance' | 'controls' | 'reset', values: Record<string, unknown> | ((settings: Settings) => Partial<Settings>) = {}) => {
    const action = async () => {
      const current = latest.current;
      if (!current || !alive.current) return;
      setBusy(true);
      try {
        const next = await request<Frame>(`/sessions/${current.session_id}/${operation}`, {
          method: operation === 'controls' ? 'PATCH' : 'POST', body: JSON.stringify({ expected_revision: current.revision, ...(typeof values === 'function' ? values(current.settings) : values) }),
        });
        accept(next);
      } catch (cause) {
        setRunning(false);
        const message = cause instanceof Error ? cause.message : 'Connection interrupted';
        if (message.includes('Stale revision')) {
          try { accept(await request<Frame>(`/sessions/${current.session_id}`)); } catch { /* Show original failure below. */ }
        }
        setError(message);
      } finally { setBusy(false); }
    };
    queue.current = queue.current.then(action, action);
    return queue.current;
  }, [accept]);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await mutate('advance', { dt: 0.2 });
      if (!cancelled) timer = setTimeout(tick, 150);
    };
    void tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [running, mutate]);

  return {
    environment, frame, history, running, setRunning, error, busy, connect,
    update: (settings: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => mutate('controls', settings),
    reset: () => { setRunning(false); return mutate('reset'); },
    step: () => mutate('advance', { dt: 0.2 }),
  };
}
