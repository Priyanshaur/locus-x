export type Point = [number, number];
export type Scenario = 'clean' | 'noise' | 'high_noise' | 'nlos' | 'packet_loss' | 'anchor_failure' | 'chaos';
export interface Anchor { id: string; position: Point }
export interface Environment {
  id: string; name: string; width: number; height: number; description: string;
  anchors: Anchor[];
  walls: { id: string; a: Point; b: Point; height: number }[];
  rooms: { name: string; center: Point; size: Point; kind: string }[];
  routes: Record<string, { position: Point; dwell: number }[]>;
}
export interface Settings {
  scenario: Scenario; noise_std: number; nlos_bias: number; dropout: number;
  disabled_anchors: string[]; walls_enabled: boolean; route: string; speed: number; seed: number;
}
export interface Estimate {
  position: Point | null; status: string; reason: string; residuals: Record<string, number>;
  reliability: Record<string, number>; covariance: number[][] | null; runtime_ms: number;
  condition_number: number | null;
}
export interface Frame {
  session_id: string; revision: number; frame_index: number; timestamp: number; settings: Settings; anchors: Anchor[];
  measurements: { anchor_id: string; anchor_position: Point; timestamp: number; observed_range: number }[];
  simulator_labels: { anchor_id: string; available: boolean; kind: 'los' | 'nlos' | 'disabled' | 'outage' | 'packet_loss'; intersected_walls: string[]; true_range: number; injected_bias: number }[];
  baseline: Estimate; robust: Estimate;
  tracking: {
    position: Point | null; velocity: Point | null; covariance: number[][] | null;
    ellipse: { major: number; minor: number; angle: number; level: number } | null;
    status: string; reason: string; updated: boolean; outage_seconds: number; runtime_ms: number;
  };
  evaluation: { ground_truth: Point; baseline_error: number | null; proposed_error: number | null; covered_95: boolean | null; has_nlos: boolean; has_dropout: boolean };
  events: { timestamp: number; message: string; level: string }[];
}
export interface Sample { t: number; baseline: number | null; proposed: number | null; truth?: Point; basePosition?: Point | null; proposedPosition?: Point | null }
export interface BenchmarkRow {
  scenario: Scenario; anchors: number; seeds: string; method: 'baseline' | 'proposed'; frames: number; valid_frames: number;
  rmse: number | null; median: number | null; p95: number | null; valid_rate: number; update_rate: number;
  nlos_rmse: number | null; dropout_rmse: number | null; latency_ms: number; coverage_95: number | null;
}
export interface BenchmarkResult {
  config: { scenarios: Scenario[]; anchor_counts: number[]; seeds: number[]; steps: number; dt: number; route: string };
  environment_id: string; environment_sha256: string; rows: BenchmarkRow[];
  traces: Record<string, Sample[]>; distributions: Record<string, { baseline: number[]; proposed: number[] }>;
  elapsed_seconds: number; notes: string;
}
export interface BenchmarkJob { id: string; status: string; progress: number; result: BenchmarkResult | null; error: string | null }
