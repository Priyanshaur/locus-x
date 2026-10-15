import { Activity, ArrowUpRight, CircleDot, Radio, ShieldCheck } from 'lucide-react';
import { fmt, percent } from './lib';
import type { Frame, Sample } from './types';

export default function Diagnostics({ frame, history, technical }: { frame: Frame; history: Sample[]; technical: boolean }) {
  const estimate = frame.tracking;
  const validHistory = history.filter(sample => sample.proposed != null);
  const rmse = validHistory.length ? Math.sqrt(validHistory.reduce((sum, sample) => sum + sample.proposed! ** 2, 0) / validHistory.length) : null;
  return <aside className="diagnostics-panel">
    <div className="panel-heading"><Activity size={15} /><h2>Live telemetry</h2><span className="live-dot" /></div>
    <div className={`tracking-banner ${estimate.status !== 'tracking' ? 'degraded' : ''}`}><ShieldCheck size={17} /><div><strong>{estimate.status === 'tracking' ? 'Tracking active' : estimate.status === 'degraded' ? 'Degraded tracking' : 'Position unavailable'}</strong><span>{estimate.updated ? 'Measurement update accepted' : estimate.reason}</span></div></div>
    <section className="telemetry-section error-section">
      <div className="eyebrow">POSITION ERROR <span>vs. simulator truth</span></div>
      <div className="error-metric"><div><i className="legend-mark baseline" />Conventional baseline</div><strong>{fmt(frame.evaluation.baseline_error)}<small>m</small></strong></div>
      <div className="error-metric proposed"><div><i className="legend-mark proposed" />LOCUS-X</div><strong>{fmt(frame.evaluation.proposed_error)}<small>m</small></strong></div>
      <div className="metric-footnote">Same observations · independent evaluation</div>
    </section>
    <section className="telemetry-section">
      <div className="section-title"><span className="eyebrow">ESTIMATED POSITION</span><CircleDot size={13} /></div>
      <div className="coordinates"><div><span>X</span><strong>{fmt(estimate.position?.[0])}<small>m</small></strong></div><div><span>Y</span><strong>{fmt(estimate.position?.[1])}<small>m</small></strong></div></div>
      <div className="telemetry-row"><span>95% ellipse · semimajor</span><b>{fmt(estimate.ellipse?.major)} m</b></div>
      <div className="telemetry-row"><span>Estimator + filter</span><b>{fmt(frame.robust.runtime_ms + estimate.runtime_ms, 1)} ms</b></div>
      {technical && <><div className="telemetry-row"><span>Velocity · vx / vy</span><b>{fmt(estimate.velocity?.[0], 1)} / {fmt(estimate.velocity?.[1], 1)}</b></div><div className="telemetry-row"><span>Geometry condition</span><b>{fmt(frame.robust.condition_number, 1)}</b></div></>}
    </section>
    <section className="telemetry-section reliability-section">
      <div className="section-title"><span className="eyebrow">ANCHOR CONSISTENCY</span><Radio size={13} /></div>
      <div className="anchor-table-heading"><span>ANCHOR</span><span>{technical ? 'RESIDUAL' : 'SIGNAL'}</span><span>WEIGHT</span></div>
      {frame.anchors.map(anchor => {
        const label = frame.simulator_labels.find(l => l.anchor_id === anchor.id);
        const weight = frame.robust.reliability[anchor.id];
        return <div className="anchor-row" key={anchor.id}><span><i className={`status-dot ${label?.kind}`} />{anchor.id}</span><span className={label?.kind === 'nlos' ? 'fault-text' : 'muted'}>{technical ? `${fmt(frame.robust.residuals[anchor.id])} m` : label?.kind === 'los' ? 'LOS' : label?.kind === 'nlos' ? 'NLOS' : label?.kind === 'packet_loss' ? 'LOST' : label?.kind.toUpperCase()}</span><span className="weight-meter"><i><b style={{ width: `${(weight ?? 0) * 100}%` }} /></i><em>{weight == null ? '—' : fmt(weight, 2)}</em></span></div>;
      })}
      <p className="small-note">Weight = residual consistency, not LOS probability. Signal labels come from the simulator.</p>
    </section>
    <section className="telemetry-section session-summary"><div className="section-title"><span className="eyebrow">SESSION WINDOW</span><ArrowUpRight size={13} /></div><div className="telemetry-row"><span>LOCUS-X RMSE</span><b>{fmt(rmse)} m</b></div><div className="telemetry-row"><span>Position availability</span><b>{percent(history.length ? validHistory.length / history.length : null)}</b></div><p className="small-note">Last {history.length} samples. Current settings may vary.</p></section>
  </aside>;
}
