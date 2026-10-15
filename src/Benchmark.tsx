import { useEffect, useState } from 'react';
import { BarChart3, Download, FlaskConical, LoaderCircle, Play } from 'lucide-react';
import { CdfChart, ErrorChart } from './Charts';
import { download, fmt, percent, request, scenarioNames } from './lib';
import type { BenchmarkJob, BenchmarkResult, Scenario } from './types';

export default function Benchmark() {
  const [scenario, setScenario] = useState<Scenario>('nlos');
  const [count, setCount] = useState(8);
  const [scope, setScope] = useState('selected');
  const [job, setJob] = useState<BenchmarkJob | null>(null);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState('');
  const active = job?.status === 'queued' || job?.status === 'running';
  useEffect(() => {
    if (!active || !job?.id) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await request<BenchmarkJob>(`/benchmarks/${job.id}`);
        if (cancelled) return;
        setJob(next);
        if (next.result) { setResult(next.result); setScenario(next.result.config.scenarios[0]); }
        if (next.error) setError(next.error);
      } catch (cause) { if (!cancelled) { setError(String(cause)); setJob(null); } }
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, job]);
  async function run() {
    setError('');
    setJob({ id: '', status: 'queued', progress: 0, result: null, error: null });
    try {
      const next = await request<BenchmarkJob>('/benchmarks', { method: 'POST', body: JSON.stringify({ scenarios: scope === 'full' ? Object.keys(scenarioNames) : [scenario], anchor_counts: [3, 4, 6, 8], seeds: [101, 202], steps: 160, dt: 0.5, route: 'held_out' }) });
      setJob(next);
    } catch (cause) { setError(String(cause)); setJob(null); }
  }
  const key = `${scenario}/${count}`;
  const rows = result?.rows.filter(row => row.scenario === scenario) ?? [];
  const exportCsv = () => {
    if (!result) return;
    const fields = Object.keys(result.rows[0]);
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    download('locus-x-benchmark.csv', [fields.join(','), ...result.rows.map(row => fields.map(field => escape(row[field as keyof typeof row])).join(','))].join('\n'), 'text/csv');
  };
  return <main className="benchmark-page">
    <div className="page-heading"><div><div className="eyebrow">REPRODUCIBLE EXPERIMENTS</div><h1>Measure the difference.</h1><p>Held-out route. Identical observations. Every result calculated.</p></div><div className="benchmark-stamp"><FlaskConical size={26} /><span>SYNTHETIC<br />EVALUATION SUITE</span></div></div>
    <div className="benchmark-controls"><label>Scenario<select aria-label="Benchmark scenario" value={scenario} disabled={active} onChange={event => setScenario(event.target.value as Scenario)}>{Object.entries(scenarioNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Run scope<select value={scope} aria-label="Benchmark scope" disabled={active} onChange={event => setScope(event.target.value)}><option value="selected">Selected scenario · 4 anchor counts</option><option value="full">Full suite · 7 scenarios</option></select></label><div className="benchmark-meta">SEEDS <b>101, 202</b><br />160 frames × 0.5 s / seed</div><button className="primary-button" onClick={() => void run()} disabled={active}>{active ? <LoaderCircle size={15} className="spin" /> : <Play size={14} />}{active ? `Evaluating ${Math.round((job?.progress ?? 0) * 100)}%` : 'Run benchmark'}</button></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {active && <div className="benchmark-progress"><i style={{ width: `${(job?.progress ?? 0) * 100}%` }} /></div>}
    {!result ? <div className="benchmark-empty"><div className="empty-plot"><BarChart3 size={54} strokeWidth={1} /></div><h2>Evidence starts with an experiment.</h2><p>Run 3, 4, 6 and 8-anchor comparisons on a held-out hospital route.<br />RMSE, tail error, availability and uncertainty coverage appear here when complete.</p><div className="empty-methods"><span><i className="legend-mark baseline" />Nonlinear least squares</span><span><i className="legend-mark proposed" />Robust ranges + motion tracking</span></div></div> : <>
      <div className="result-heading"><div><span className="live-dot" /><strong>Completed benchmark</strong><span>{fmt(result.elapsed_seconds, 1)} s runtime · {result.rows.length} result rows</span></div><div><button className="text-button" onClick={exportCsv}><Download size={14} />Metrics CSV</button><button className="text-button" onClick={() => download('locus-x-experiment.json', JSON.stringify(result, null, 2))}><Download size={14} />Full experiment</button></div></div>
      {!result.config.scenarios.includes(scenario) ? <div className="benchmark-empty compact"><h2>This scenario has not been evaluated in this run.</h2><p>Select a completed scenario or run a new benchmark.</p></div> : <>
        <div className="benchmark-plots"><section className="plot-panel"><div className="chart-heading"><h2>Error over time <small>first held-out seed</small></h2><select aria-label="Chart anchor count" value={count} onChange={event => setCount(Number(event.target.value))}>{[3, 4, 6, 8].map(n => <option key={n} value={n}>{n} anchors</option>)}</select></div><ErrorChart samples={result.traces[key] ?? []} height={210} /></section><section className="plot-panel"><div className="chart-heading"><h2>Error distribution <small>valid estimates · both seeds</small></h2></div><CdfChart data={result.distributions[key] ?? { baseline: [], proposed: [] }} /></section></div>
        <div className="results-table-wrap"><table className="results-table"><thead><tr><th>Anchors</th><th>Method</th><th>RMSE ↓</th><th>Median ↓</th><th>P95 ↓</th><th>Valid rate</th><th>Update rate</th><th>NLOS RMSE</th><th>Dropout RMSE</th><th>Latency</th><th>95% coverage</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.anchors}/${row.method}`} className={row.method === 'proposed' ? 'proposed-result' : ''}><td className="mono">{row.anchors.toString().padStart(2, '0')}</td><td><i className={`legend-mark ${row.method}`} />{row.method === 'proposed' ? 'LOCUS-X' : 'Baseline'}</td><td>{fmt(row.rmse)} m</td><td>{fmt(row.median)} m</td><td>{fmt(row.p95)} m</td><td>{percent(row.valid_rate)}</td><td>{percent(row.update_rate)}</td><td>{fmt(row.nlos_rmse)} m</td><td>{fmt(row.dropout_rmse)} m</td><td>{fmt(row.latency_ms, 1)} ms</td><td>{percent(row.coverage_95)}</td></tr>)}</tbody></table></div>
      </>}
      <div className="benchmark-notes"><strong>Interpret the whole result.</strong><p>Errors use available estimates; missing estimates are counted separately in valid rate. Prediction-only positions count as valid until the 3 s timeout. The nominal 95% ellipse assumes a Gaussian position error; measured coverage can be much lower under bias. Wall bias and fault combinations are simplified. These experiments do not establish real-radio performance.</p><span className="mono">{result.environment_id} · configuration SHA256 {result.environment_sha256.slice(0, 16)}</span></div>
    </>}
  </main>;
}
