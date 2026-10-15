import type { Point, Sample } from './types';

/** Canonical map: backend X,Y metres -> Three.js X,elevation,-Y metres. */
export function toScene([x, y]: Point, elevation = 0): [number, number, number] { return [x, elevation, -y]; }
export function fromScene([x, , z]: [number, number, number]): Point { return [x, -z]; }
export const fmt = (value: number | null | undefined, digits = 2) => value == null ? '—' : value.toFixed(digits);
export const percent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
export const scenarioNames = { clean: 'Clean line of sight', noise: 'Moderate noise', high_noise: 'High noise', nlos: 'Wall obstruction', packet_loss: 'Packet loss', anchor_failure: 'Anchor outage', chaos: 'Combined stress' };

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return response.json();
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function samplesCsv(samples: Sample[]) {
  return ['time_s,baseline_error_m,locus_x_error_m', ...samples.map(s => `${s.t},${s.baseline ?? ''},${s.proposed ?? ''}`)].join('\n');
}
export function appendSample(history: Sample[], frame: Sample): Sample[] {
  const previous = history.at(-1);
  if (previous && frame.t < previous.t) return [frame];
  if (previous?.t === frame.t) return [...history.slice(0, -1), frame];
  return [...history, frame].slice(-600);
}
