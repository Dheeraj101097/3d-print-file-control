import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import axiosInstance from '../../api/axiosInstance.js';
import {
  X, Printer, CheckCircle, Clock, Layers, Thermometer,
  Share2, PlusCircle, Loader2, AlertCircle, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatSeconds(s) {
  if (!s) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Parse gcode G0/G1 commands into extrusion + travel line segments
// Three.js uses Y-up; gcode uses Z-up → map: three(x,y,z) = gcode(x,z,-y)
function parseGcodeToolpaths(text) {
  const extruding = [];
  const traveling = [];
  let x = 0, y = 0, z = 0, e = 0;
  let count = 0;
  const MAX_SEGMENTS = 200000;

  for (const rawLine of text.split('\n')) {
    if (count >= MAX_SEGMENTS) break;
    const line = rawLine.split(';')[0].trim().toUpperCase();
    if (!line) continue;

    if (line.startsWith('G0') || line.startsWith('G1')) {
      const isG0 = line[1] === '0';
      const xm = line.match(/X([-\d.]+)/);
      const ym = line.match(/Y([-\d.]+)/);
      const zm = line.match(/Z([-\d.]+)/);
      const em = line.match(/E([-\d.]+)/);

      const nx = xm ? parseFloat(xm[1]) : x;
      const ny = ym ? parseFloat(ym[1]) : y;
      const nz = zm ? parseFloat(zm[1]) : z;
      const ne = em ? parseFloat(em[1]) : e;

      if (nx !== x || ny !== y || nz !== z) {
        const isExtrusion = !isG0 && ne > e;
        const arr = isExtrusion ? extruding : traveling;
        arr.push(x, z, -y, nx, nz, -ny);
        count++;
      }

      x = nx; y = ny; z = nz; e = ne;
    }
  }

  return {
    extruding: new Float32Array(extruding),
    traveling: new Float32Array(traveling),
  };
}

function centerAndScale(objects, targetSize = 150) {
  const box = new THREE.Box3();
  for (const obj of objects) box.expandByObject(obj);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const scale = targetSize / Math.max(size, 0.001);
  for (const obj of objects) {
    obj.position.sub(center);
    obj.scale.setScalar(scale);
  }
}

export default function FileViewer({ asset, onClose }) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error | unsupported
  const [errorMsg, setErrorMsg] = useState('');

  const buildScene = useCallback(async () => {
    if (!asset) return;
    const isSupported = asset.fileType === 'stl' || asset.fileType === 'gcode';
    if (!isSupported) { setStatus('unsupported'); return; }

    // Tear down any previous renderer
    cancelAnimationFrame(frameRef.current);
    if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current = null; }
    const container = containerRef.current;
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    setStatus('loading');

    try {
      const w = container.clientWidth || 420;
      const h = container.clientHeight || 340;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0e0e1a);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100000);

      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
      container.appendChild(canvas);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;

      // Grid
      const grid = new THREE.GridHelper(300, 30, 0x2a2a44, 0x1e1e33);
      scene.add(grid);

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xffffff, 1.3);
      sun.position.set(100, 200, 150);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x6688ff, 0.35);
      fill.position.set(-80, -40, -80);
      scene.add(fill);

      // Fetch file bytes
      const res = await axiosInstance.get(`/files/${asset._id}/download`, {
        responseType: 'arraybuffer',
      });

      if (asset.fileType === 'stl') {
        const loader = new STLLoader();
        const geo = loader.parse(res.data);
        geo.computeVertexNormals();
        geo.center();

        const mat = new THREE.MeshPhongMaterial({
          color: 0x4a9eff,
          emissive: 0x0a1833,
          specular: 0x333333,
          shininess: 50,
        });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        centerAndScale([mesh], 130);

        // Sit mesh on grid
        const box = new THREE.Box3().setFromObject(mesh);
        mesh.position.y -= box.min.y;

        camera.position.set(130, 110, 170);
        controls.target.set(0, 40, 0);

      } else if (asset.fileType === 'gcode') {
        const text = new TextDecoder().decode(res.data);
        const { extruding, traveling } = parseGcodeToolpaths(text);

        const lines = [];

        if (extruding.length) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(extruding, 3));
          const mat = new THREE.LineBasicMaterial({ color: 0x00e676 });
          const obj = new THREE.LineSegments(geo, mat);
          scene.add(obj);
          lines.push(obj);
        }

        if (traveling.length) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(traveling, 3));
          const mat = new THREE.LineBasicMaterial({ color: 0x334488, transparent: true, opacity: 0.25 });
          const obj = new THREE.LineSegments(geo, mat);
          scene.add(obj);
          lines.push(obj);
        }

        if (lines.length) {
          centerAndScale(lines, 150);
          const box = new THREE.Box3();
          for (const l of lines) box.expandByObject(l);
          const h2 = box.getSize(new THREE.Vector3()).y;
          for (const l of lines) l.position.y -= box.min.y;

          camera.position.set(0, h2 + 80, 220);
          controls.target.set(0, h2 / 2, 0);
        } else {
          camera.position.set(0, 100, 200);
        }
      }

      controls.update();
      setStatus('ready');

      // Resize observer
      const ro = new ResizeObserver(() => {
        const rw = container.clientWidth;
        const rh = container.clientHeight;
        if (rw && rh) {
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh, false);
        }
      });
      ro.observe(container);

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      return () => ro.disconnect();
    } catch (err) {
      console.error('[FileViewer]', err);
      setErrorMsg('Failed to load preview');
      setStatus('error');
    }
  }, [asset]);

  useEffect(() => {
    buildScene();
    return () => {
      cancelAnimationFrame(frameRef.current);
      rendererRef.current?.dispose();
    };
  }, [buildScene]);

  if (!asset) return null;

  const isSupported = asset.fileType === 'stl' || asset.fileType === 'gcode';
  const meta = asset.currentVersion?.gcodeMetadata;

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-800 select-none">

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-3 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono text-gray-100 truncate leading-tight">{asset.canonicalName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold ${
              asset.fileType === 'stl'   ? 'bg-purple-950 text-purple-300' :
              asset.fileType === 'gcode' ? 'bg-orange-950 text-orange-300' :
                                           'bg-green-950 text-green-300'
            }`}>.{asset.fileType}</span>
            <span className="text-xs text-gray-500">
              v{String(asset.currentVersion?.versionNumber || 1).padStart(2, '0')}
            </span>
            {asset.versionCount > 1 && (
              <span className="text-xs text-gray-600">{asset.versionCount} versions</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 text-gray-600 hover:text-gray-300 p-0.5 rounded"
        >
          <X size={15} />
        </button>
      </div>

      {/* ── 3D Canvas ── */}
      {isSupported && (
        <div
          ref={containerRef}
          className="relative shrink-0"
          style={{ height: 320 }}
        >
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-gray-400 text-xs gap-2 z-10">
              <Loader2 size={22} className="animate-spin text-blue-500" />
              <span>Loading {asset.fileType.toUpperCase()} preview…</span>
              {asset.totalStorageBytes > 4 * 1024 * 1024 && (
                <span className="text-gray-600">Large file — may take a moment</span>
              )}
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 gap-2 z-10">
              <AlertCircle size={22} className="text-red-500" />
              <span className="text-xs text-red-400">{errorMsg}</span>
              <button
                onClick={buildScene}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} /> Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP / unsupported */}
      {!isSupported && (
        <div className="flex flex-col items-center justify-center py-10 text-gray-600 gap-2">
          <Layers size={36} className="opacity-20" />
          <p className="text-sm text-gray-500">No 3D preview for .{asset.fileType}</p>
          <p className="text-xs text-gray-700">Export to STL to view in browser</p>
        </div>
      )}

      {/* ── GCODE metadata strip ── */}
      {asset.fileType === 'gcode' && meta && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5 bg-gray-900 border-t border-gray-800 shrink-0">
          {meta.estimatedPrintTimeSeconds > 0 && (
            <Stat icon={<Clock size={10} className="text-blue-400" />}
              label={formatSeconds(meta.estimatedPrintTimeSeconds)} />
          )}
          {meta.filamentUsedGrams > 0 && (
            <Stat icon={<Layers size={10} className="text-green-400" />}
              label={`${meta.filamentUsedGrams}g filament`} />
          )}
          {meta.nozzleTemp > 0 && (
            <Stat icon={<Thermometer size={10} className="text-orange-400" />}
              label={`Nozzle ${meta.nozzleTemp}°C`} />
          )}
          {meta.bedTemp > 0 && (
            <Stat icon={<Thermometer size={10} className="text-red-400" />}
              label={`Bed ${meta.bedTemp}°C`} />
          )}
          {meta.layerHeight > 0 && (
            <Stat icon={<Layers size={10} className="text-purple-400" />}
              label={`Layer ${meta.layerHeight}mm`} />
          )}
          {meta.slicerName && (
            <Stat icon={null} label={meta.slicerName} dim />
          )}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="px-3 pt-3 pb-4 border-t border-gray-800 bg-gray-900 mt-auto shrink-0">
        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          <QaButton
            icon={<Printer size={12} />}
            label="Send to Bambu X1C"
            color="blue"
            onClick={() => toast('Queued on Bambu X1C', { icon: '🖨️' })}
          />
          <QaButton
            icon={<CheckCircle size={12} />}
            label="Mark as Ready"
            color="green"
            onClick={() => toast.success('Marked as production ready')}
          />
          <QaButton
            icon={<PlusCircle size={12} />}
            label="Add to Print Queue"
            color="gray"
            onClick={() => toast('Added to queue', { icon: '📋' })}
          />
          <QaButton
            icon={<Share2 size={12} />}
            label="Share Link"
            color="gray"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast('Link copied', { icon: '🔗' });
            }}
          />
        </div>

        {/* Gcode-only action */}
        {asset.fileType === 'gcode' && (
          <button
            onClick={() => toast('Slicer report — coming soon', { icon: '⚙️' })}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-2.5 py-2 bg-orange-900/40 hover:bg-orange-900/60 text-orange-300 text-xs rounded-lg border border-orange-900"
          >
            <Layers size={12} /> Check Slicer Stats
          </button>
        )}
      </div>
    </div>
  );
}

// ── small helpers ────────────────────────────────────────────────────────────

function Stat({ icon, label, dim }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${dim ? 'text-gray-600' : 'text-gray-300'}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

const COLOR_MAP = {
  blue:  'bg-blue-700 hover:bg-blue-600 text-white',
  green: 'bg-green-800 hover:bg-green-700 text-white',
  gray:  'bg-gray-800 hover:bg-gray-700 text-gray-200',
};

function QaButton({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition ${COLOR_MAP[color] || COLOR_MAP.gray}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
