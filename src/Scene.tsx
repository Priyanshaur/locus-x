import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, memo, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toScene } from './lib';
import type { Environment, Frame, Point, Sample } from './types';

const COLORS = { truth: '#e8ede3', baseline: '#e6b769', proposed: '#83dfb0', fault: '#df7d70', anchor: '#8dbfa8' };

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-error">3D rendering is unavailable. Enable WebGL in your browser. Telemetry and evaluation remain available.</div> : this.props.children; }
}

function Camera({ environment, view, reset }: { environment: Environment; view: string; reset: number }) {
  const { camera, gl, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true; orbit.dampingFactor = 0.1;
    orbit.maxPolarAngle = Math.PI / 2.12; orbit.minZoom = 5; orbit.maxZoom = 100;
    controls.current = orbit;
    return () => orbit.dispose();
  }, [camera, gl]);
  useEffect(() => {
    const x = environment.width / 2, z = -environment.height / 2;
    camera.position.set(x + (view === 'plan' ? 0 : 22), view === 'plan' ? 50 : 32, z + (view === 'plan' ? 0.01 : 27));
    camera.lookAt(x, 0, z);
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = Math.min(size.width / (environment.width * 1.35), size.height / (environment.height * 1.5));
      camera.updateProjectionMatrix();
    }
    controls.current?.target.set(x, 0, z);
    controls.current?.update();
  }, [camera, environment, size, view, reset]);
  useFrame(() => controls.current?.update());
  return null;
}

function Label({ text, position, color = '#a2b5a9', scale = 3.2, background = '' }: { text: string; position: [number, number, number]; color?: string; scale?: number; background?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const measure = canvas.getContext('2d')!;
    measure.font = '500 38px "IBM Plex Sans", sans-serif';
    canvas.width = Math.ceil(measure.measureText(text).width) + 28; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    if (background) { context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.font = '500 38px "IBM Plex Sans", sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = color; context.fillText(text, canvas.width / 2, canvas.height / 2);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  }, [text, color, background]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[scale, scale * texture.image.height / texture.image.width, 1]} renderOrder={8}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
}

function Polyline({ points, color, opacity = 1, dashed = false }: { points: [number, number, number][]; color: string; opacity?: number; dashed?: boolean }) {
  const object = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const material = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new THREE.Line(geometry, material); line.computeLineDistances(); return line;
  }, [points, color, opacity, dashed]);
  useEffect(() => () => { object.geometry.dispose(); object.material.dispose(); }, [object]);
  return <primitive object={object} />;
}

function Box({ at, size, color, elevation = 0 }: { at: Point; size: [number, number, number]; color: string; elevation?: number }) {
  return <mesh position={toScene(at, size[1] / 2 + elevation)} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}

const Floor = memo(function Floor({ environment }: { environment: Environment }) {
  const grid = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let x = 0; x <= environment.width; x += 2) lines.push([toScene([x, 0], 0.025), toScene([x, environment.height], 0.025)]);
    for (let y = 0; y <= environment.height; y += 2) lines.push([toScene([0, y], 0.025), toScene([environment.width, y], 0.025)]);
    return lines;
  }, [environment]);
  return <group>
    <Box at={[environment.width / 2, environment.height / 2]} size={[environment.width + 0.7, 0.3, environment.height + 0.7]} color="#324a3d" elevation={-0.32} />
    <mesh position={toScene([environment.width / 2, environment.height / 2], -0.01)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[environment.width, environment.height]} /><meshStandardMaterial color="#253d30" /></mesh>
    {grid.map((points, i) => <Polyline key={i} points={points} color="#46604e" opacity={0.27} />)}
    {environment.rooms.map((room, i) => <group key={room.name}>
      <mesh position={toScene(room.center, 0.035)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={room.size} /><meshStandardMaterial color={i % 2 ? '#2f4738' : '#304a3c'} /></mesh>
      <Label text={room.name} position={toScene([room.center[0], room.center[1] + (i < 3 ? -1.8 : 1.8)], 0.08)} scale={4.7} color="#819b88" />
      {(room.kind === 'treatment' || room.kind === 'ward') && [-2.5, 1.6].map(offset => <group key={offset}>
        <Box at={[room.center[0] + offset, room.center[1]]} size={[1.35, 0.55, 2.1]} color="#526757" />
        <Box at={[room.center[0] + offset, room.center[1]]} size={[1.2, 0.13, 1.85]} color="#8e9e88" elevation={0.55} />
        <Box at={[room.center[0] + offset, room.center[1] + 0.6]} size={[0.95, 0.14, 0.45]} color="#bbc1a8" elevation={0.68} />
      </group>)}
      {room.kind === 'imaging' && <><Box at={room.center} size={[2, 0.9, 2.8]} color="#617765" /><mesh position={toScene([room.center[0], room.center[1] + 0.6], 1.3)} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.85, 0.3, 10, 24]} /><meshStandardMaterial color="#a6b09b" /></mesh></>}
      {room.kind === 'storage' && [-2, 1, 3.3].map(offset => <Box key={offset} at={[room.center[0] + offset, room.center[1]]} size={[0.8, 1.3, 2.6]} color="#5c705d" />)}
      {room.kind === 'station' && <><Box at={room.center} size={[4.4, 0.9, 1.2]} color="#71836c" /><Box at={[room.center[0] - 1.6, room.center[1] - 0.8]} size={[1.2, 0.9, 2.6]} color="#71836c" /></>}
    </group>)}
    <Label text="CENTRAL CORRIDOR" position={toScene([16, 11.7], 0.07)} scale={5} color="#628470" />
    {[0, 10, 20, 30].filter(x => x <= environment.width).map(x => <Label key={x} text={`${x} m`} position={toScene([x, -1.3])} scale={2} color="#647f6e" />)}
    <Label text="N ↑" position={toScene([environment.width + 2.3, environment.height - 1])} scale={2} color="#a6bbaa" />
  </group>;
});

function Marker({ point, kind }: { point: Point; kind: 'truth' | 'baseline' | 'proposed' }) {
  const color = COLORS[kind];
  return <group position={toScene(point, 0.1)}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[kind === 'truth' ? 0.35 : 0.45, kind === 'truth' ? 0.4 : 0.51, 36]} /><meshBasicMaterial color={color} side={THREE.DoubleSide} /></mesh>
    {kind === 'truth' ? <><mesh position={[0, 0.33, 0]} castShadow><boxGeometry args={[0.42, 0.55, 0.66]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, 0.7, -0.25]}><boxGeometry args={[0.5, 0.05, 0.1]} /><meshStandardMaterial color={color} /></mesh></> : <mesh position={[0, 0.35, 0]}><octahedronGeometry args={[0.25]} /><meshBasicMaterial color={color} /></mesh>}
  </group>;
}

function SceneContent({ environment, frame, history, signals, truth, uncertainty, view, cameraReset }: SceneProps) {
  const blocked = new Set(frame.simulator_labels.filter(label => label.kind === 'nlos').flatMap(label => label.intersected_walls));
  const ellipse = frame.tracking.ellipse;
  const center = frame.tracking.position;
  const ellipsePoints: [number, number, number][] = ellipse && center ? Array.from({ length: 81 }, (_, i) => {
    const theta = i / 80 * Math.PI * 2;
    const x = ellipse.major * Math.cos(theta), y = ellipse.minor * Math.sin(theta);
    return toScene([center[0] + x * Math.cos(ellipse.angle) - y * Math.sin(ellipse.angle), center[1] + x * Math.sin(ellipse.angle) + y * Math.cos(ellipse.angle)], 0.13);
  }) : [];
  const trails = (key: 'truth' | 'basePosition' | 'proposedPosition') => {
    const segments: [number, number, number][][] = [[]];
    for (const item of history) {
      const p = item[key];
      if (p) segments[segments.length - 1].push(toScene(p, 0.12));
      else if (segments[segments.length - 1].length) segments.push([]);
    }
    return segments.filter(segment => segment.length > 1);
  };
  return <>
    <color attach="background" args={['#17271f']} />
    <ambientLight intensity={1.1} />
    <directionalLight position={[10, 30, 10]} intensity={2.3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-bias={-0.0004} />
    <Camera environment={environment} view={view} reset={cameraReset} />
    <Floor environment={environment} />
    {environment.walls.map(wall => {
      const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
      const cutaway = Math.min(wall.height, wall.id.startsWith('ext') ? 0.55 : 0.85);
      return <mesh key={wall.id} position={toScene([(wall.a[0] + wall.b[0]) / 2, (wall.a[1] + wall.b[1]) / 2], cutaway / 2)} rotation={[0, Math.atan2(wall.b[1] - wall.a[1], wall.b[0] - wall.a[0]), 0]} castShadow receiveShadow>
        <boxGeometry args={[length + 0.12, cutaway, 0.16]} />
        <meshStandardMaterial color={blocked.has(wall.id) && signals ? '#91695b' : '#798975'} transparent opacity={frame.settings.walls_enabled ? 1 : 0.18} />
      </mesh>;
    })}
    {signals && frame.measurements.map(m => {
      const faulty = frame.simulator_labels.find(l => l.anchor_id === m.anchor_id)?.kind === 'nlos';
      return <Polyline key={m.anchor_id} points={[toScene(frame.evaluation.ground_truth, 0.6), toScene(m.anchor_position, 1.1)]} color={faulty ? COLORS.fault : COLORS.anchor} opacity={faulty ? 0.65 : 0.3} dashed={faulty} />;
    })}
    {frame.anchors.map(anchor => {
      const label = frame.simulator_labels.find(l => l.anchor_id === anchor.id);
      const enabled = !frame.settings.disabled_anchors.includes(anchor.id);
      const color = !enabled ? '#526157' : !label?.available ? '#d89566' : '#8ac3a5';
      return <group key={anchor.id} position={toScene(anchor.position)}>
        <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[0.035, 0.035, 1.3, 8]} /><meshStandardMaterial color="#889383" /></mesh>
        <mesh position={[0, 1.3, 0]}><boxGeometry args={[0.3, 0.45, 0.3]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={enabled ? 0.25 : 0} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}><ringGeometry args={[0.36, 0.43, 24]} /><meshBasicMaterial color={color} /></mesh>
        <Label text={anchor.id} position={[0, 2, 0]} scale={1.9} color={color} />
      </group>;
    })}
    {truth && trails('truth').map((points, i) => <Polyline key={`t${i}`} points={points} color={COLORS.truth} opacity={0.7} dashed />)}
    {trails('basePosition').map((points, i) => <Polyline key={`b${i}`} points={points} color={COLORS.baseline} opacity={0.8} />)}
    {trails('proposedPosition').map((points, i) => <Polyline key={`p${i}`} points={points} color={COLORS.proposed} />)}
    {uncertainty && ellipsePoints.length > 0 && <Polyline points={ellipsePoints} color={COLORS.proposed} opacity={0.65} dashed />}
    {truth && <Marker point={frame.evaluation.ground_truth} kind="truth" />}
    {frame.baseline.position && <Marker point={frame.baseline.position} kind="baseline" />}
    {frame.tracking.position && <Marker point={frame.tracking.position} kind="proposed" />}
  </>;
}

interface SceneProps { environment: Environment; frame: Frame; history: Sample[]; signals: boolean; truth: boolean; uncertainty: boolean; view: string; cameraReset: number }
export default function Scene(props: SceneProps) {
  return <SceneBoundary><Canvas orthographic shadows dpr={[1, 1.8]} camera={{ position: [37, 32, 17], zoom: 20, near: 0.1, far: 200 }} gl={{ antialias: true }}><SceneContent {...props} /></Canvas></SceneBoundary>;
}
