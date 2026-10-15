import { useEffect, useState } from 'react';
import { ChevronDown, Radio, RotateCw, Shuffle, SlidersHorizontal, Zap } from 'lucide-react';
import { fmt, scenarioNames } from './lib';
import type { Frame, Scenario, Settings } from './types';

function Slider({ label, value, max, step, unit, onCommit }: { label: string; value: number; max: number; step: number; unit: string; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <label className="slider-field"><span>{label}<output>{fmt(unit === '%' ? draft * 100 : draft, unit === '%' ? 0 : 2)} <small>{unit}</small></output></span>
    <input type="range" min="0" max={max} step={step} value={draft} style={{ '--range': `${draft / max * 100}%` } as React.CSSProperties} onChange={event => setDraft(Number(event.target.value))} onPointerUp={() => onCommit(draft)} onKeyUp={event => { if (event.key.startsWith('Arrow') || ['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) onCommit(draft); }} aria-label={label} />
    <span className="range-labels"><small>0 {unit}</small><small>{unit === '%' ? max * 100 : max} {unit}</small></span>
  </label>;
}

export default function Controls({ frame, update }: { frame: Frame; update: (settings: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => Promise<void> }) {
  const settings = frame.settings;
  const active = frame.anchors.length - settings.disabled_anchors.length;
  return <aside className="controls-panel">
    <div className="panel-heading"><SlidersHorizontal size={15} /><h2>Scenario controls</h2><span className="section-no">01</span></div>
    <section className="control-section">
      <div className="eyebrow">EXPERIMENT PRESET</div>
      <label className="select-wrap"><select aria-label="Scenario preset" value={settings.scenario} onChange={event => void update({ scenario: event.target.value as Scenario })}>{Object.entries(scenarioNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><ChevronDown size={14} /></label>
      <p className="control-note">{settings.scenario === 'anchor_failure' ? 'Four anchors fail from 12–22 s in each 40 s cycle.' : settings.scenario === 'chaos' ? 'Wall bias, noise, lost packets and a timed anchor outage.' : settings.scenario === 'nlos' ? 'Walls introduce positive bias in obstructed ranges.' : 'Seeded observations. Both methods receive identical ranges.'}</p>
      <button className={`stress-button ${settings.scenario === 'chaos' ? 'stress-active' : ''}`} onClick={() => void update({ scenario: 'chaos' })}><Zap size={14} /> Inject combined failures <span>↗</span></button>
    </section>
    <section className="control-section">
      <div className="eyebrow">MEASUREMENT MODEL</div>
      <Slider label="Range noise · σ" value={settings.noise_std} max={3} step={0.05} unit="m" onCommit={noise_std => void update({ noise_std })} />
      <Slider label="NLOS bias" value={settings.nlos_bias} max={10} step={0.1} unit="m" onCommit={nlos_bias => void update({ nlos_bias })} />
      <Slider label="Packet loss" value={settings.dropout} max={1} step={0.01} unit="%" onCommit={dropout => void update({ dropout })} />
      <label className="toggle-line"><span>Wall obstruction</span><input type="checkbox" checked={settings.walls_enabled} onChange={event => void update({ walls_enabled: event.target.checked })} /><i /></label>
    </section>
    <section className="control-section anchor-section">
      <div className="section-title"><span className="eyebrow">ANCHOR NETWORK</span><span className="mono muted">{active} / {frame.anchors.length} enabled</span></div>
      <div className="anchor-toggles">{frame.anchors.map(anchor => {
        const enabled = !settings.disabled_anchors.includes(anchor.id);
        const available = frame.simulator_labels.find(l => l.anchor_id === anchor.id)?.available;
        return <button key={anchor.id} className={`${enabled ? 'enabled' : 'disabled'} ${enabled && !available ? 'missing' : ''}`} aria-pressed={enabled} aria-label={`Toggle anchor ${anchor.id}`} onClick={() => void update(current => ({ disabled_anchors: current.disabled_anchors.includes(anchor.id) ? current.disabled_anchors.filter(id => id !== anchor.id) : [...current.disabled_anchors, anchor.id] }))}><Radio size={12} />{anchor.id}<i /></button>;
      })}</div>
      <p className="small-note">Three anchors minimum. Geometry still matters.</p>
    </section>
    <section className="control-section route-section">
      <div className="eyebrow">ASSET CART ROUTE</div>
      <label className="select-wrap"><select aria-label="Target route" value={settings.route} onChange={event => void update({ route: event.target.value })}><option value="asset_round">Hospital asset round</option><option value="held_out">Held-out service round</option></select><ChevronDown size={14} /></label>
      <div className="compact-controls"><label>Speed<select aria-label="Target speed" value={settings.speed} onChange={event => void update({ speed: Number(event.target.value) })}><option value="0.6">0.6 m/s</option><option value="1.2">1.2 m/s</option><option value="2">2.0 m/s</option><option value="3">3.0 m/s</option></select></label><label>Seed<input aria-label="Random seed" type="number" min="0" max="2147483647" key={settings.seed} defaultValue={settings.seed} onBlur={event => { const seed = Number(event.target.value); if (Number.isInteger(seed) && seed >= 0 && seed <= 2147483647) void update({ seed }); else event.target.value = String(settings.seed); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label></div>
      <p className="small-note"><RotateCw size={10} /> Route, speed or seed changes restart the run.</p>
    </section>
    <div className="controls-footer"><Shuffle size={13} /><span>Deterministic simulation<br /><strong>No external services</strong></span></div>
  </aside>;
}
