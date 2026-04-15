import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  Download, FileText, Package, Upload,
  ChevronRight, ChevronDown, RotateCcw, Loader2, Filter,
} from 'lucide-react';
import { useGetProductQuery } from '../features/products/productsApi.js';
import { useGetPartFilesQuery, useGetFileVersionsQuery, useRollbackFileMutation } from '../features/files/filesApi.js';
import { selectSelectedPartId } from '../features/products/productsSlice.js';
import ProjectTree from '../components/ProjectTree/ProjectTree.jsx';
import FileViewer from '../components/FileViewer/FileViewer.jsx';
import axiosInstance from '../api/axiosInstance.js';
import toast from 'react-hot-toast';

/* ── Helpers ─────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function downloadViaApi(url, filename) {
  try {
    const res = await axiosInstance.get(url, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    toast.error('Download failed');
  }
}

/* ── File type badge — matches Stitch dark tint style ─────────── */
function FileTypeTag({ type }) {
  const map = {
    stl:   { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
    step:  { bg: 'rgba(34, 197, 94, 0.12)',  color: '#4ade80' },
    obj:   { bg: 'rgba(34, 197, 94, 0.12)',  color: '#4ade80' },
    gcode: { bg: 'rgba(249, 115, 22, 0.12)', color: '#fb923c' },
    other: { bg: 'var(--c-surface-low)',      color: 'var(--c-text-secondary)' },
  };
  const s = map[type] || map.other;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: '0.6875rem',
        fontFamily: '"Space Grotesk", monospace',
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: '4px',
        letterSpacing: '0.03em',
      }}
    >
      .{type?.toUpperCase()}
    </span>
  );
}

/* ── Inline version rows ─────────────────────────────────────── */
function VersionRows({ asset }) {
  const { data, isLoading } = useGetFileVersionsQuery({ fileAssetId: asset._id });
  const [rollback, { isLoading: isRollingBack }] = useRollbackFileMutation();

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} style={{ paddingLeft: '48px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
          <Loader2 size={11} className="inline animate-spin mr-1" /> Loading versions…
        </td>
      </tr>
    );
  }

  const versions = data?.versions || [];
  const currentVersionId = String(asset.currentVersion?._id || asset.currentVersion);

  const handleRestore = async (version) => {
    const note = window.prompt(
      `Restore to v${String(version.versionNumber).padStart(2, '0')}? Add a note (optional):`,
      `Restored from v${String(version.versionNumber).padStart(2, '0')}`
    );
    if (note === null) return;
    try {
      await rollback({ fileAssetId: asset._id, targetVersionId: version._id, note }).unwrap();
      toast.success(`Restored to v${String(version.versionNumber).padStart(2, '0')}`);
    } catch (err) {
      toast.error(err.data?.message || 'Restore failed');
    }
  };

  const versionName = (v) =>
    asset.canonicalName.replace(/-v\d+\./, `-v${String(v.versionNumber).padStart(2, '0')}.`);

  return (
    <>
      {versions.map((v) => {
        const isCurrent = String(v._id) === currentVersionId;
        return (
          <tr
            key={v._id}
            style={{
              background: isCurrent ? 'rgba(19, 64, 116, 0.12)' : 'var(--c-surface-low)',
              borderBottom: '1px solid var(--c-border-soft)',
            }}
          >
            <td style={{ paddingLeft: '48px', paddingRight: '8px', paddingTop: '7px', paddingBottom: '7px' }} colSpan={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '1px', background: 'var(--c-border-soft)', flexShrink: 0 }} />
                <span style={{
                  fontFamily: '"Space Grotesk", monospace',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: isCurrent ? 'var(--c-carolina)' : 'var(--c-text-secondary)',
                }}>
                  v{String(v.versionNumber).padStart(2, '0')}
                </span>
                {isCurrent && (
                  <span style={{ fontSize: '0.625rem', background: 'rgba(141, 169, 196, 0.15)', color: 'var(--c-carolina)', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
                    ACTIVE
                  </span>
                )}
                <span style={{ fontFamily: '"Inter", monospace', fontSize: '0.6875rem', color: 'var(--c-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.uploadedBy?.displayName && `by ${v.uploadedBy.displayName} · `}
                  {v.createdAt ? format(new Date(v.createdAt), 'MMM d · HH:mm') : ''}
                </span>
              </div>
            </td>
            <td style={{ padding: '7px 12px', fontSize: '0.6875rem', color: 'var(--c-text-muted)', fontFamily: '"Inter", sans-serif' }}>{formatBytes(v.fileSizeBytes)}</td>
            <td style={{ padding: '7px 12px', fontFamily: '"Space Grotesk", monospace', fontSize: '0.6875rem', color: 'var(--c-text-secondary)' }}>{v.contentHash?.slice(0, 8)}</td>
            <td style={{ padding: '7px 12px' }}></td>
            <td style={{ padding: '7px 12px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => downloadViaApi(`/files/${asset._id}/download`, versionName(v))}
                  title="Download"
                  style={{ padding: '4px', color: 'var(--c-text-muted)', borderRadius: '4px', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--c-carolina)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
                >
                  <Download size={12} />
                </button>
                {!isCurrent && (
                  <button
                    onClick={() => handleRestore(v)}
                    disabled={isRollingBack}
                    title="Restore"
                    style={{ padding: '4px', color: 'var(--c-text-muted)', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fb923c'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

/* ── File row ────────────────────────────────────────────────── */
function FileAssetRow({ asset, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const hasVersions = asset.versionCount > 1;

  return (
    <>
      <tr
        onClick={() => onSelect(asset)}
        style={{
          background: isSelected ? 'rgba(19, 64, 116, 0.12)' : 'transparent',
          borderBottom: '1px solid var(--c-border-soft)',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--c-surface-low)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Chevron + filename */}
        <td style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); hasVersions && setExpanded(!expanded); }}
              style={{
                padding: '2px',
                borderRadius: '3px',
                color: hasVersions ? 'var(--c-text-secondary)' : 'transparent',
                pointerEvents: hasVersions ? 'auto' : 'none',
                flexShrink: 0,
                transition: 'color 0.2s',
              }}
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <span style={{ fontFamily: '"Space Grotesk", monospace', fontSize: '0.8125rem', color: 'var(--c-text)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {asset.canonicalName}
            </span>
          </div>
        </td>
        <td style={{ padding: '10px 12px' }}><FileTypeTag type={asset.fileType} /></td>
        <td style={{ padding: '10px 12px' }}>
          <span className="badge-version">v{String(asset.currentVersion?.versionNumber || 0).padStart(2, '0')}</span>
          {asset.versionCount > 1 && (
            <span style={{ marginLeft: '6px', fontSize: '0.6875rem', color: 'var(--c-text-muted)' }}>({asset.versionCount})</span>
          )}
        </td>
        <td style={{ padding: '10px 12px', fontSize: '0.8125rem', color: 'var(--c-text-muted)', fontFamily: '"Inter", sans-serif' }}>{formatBytes(asset.totalStorageBytes)}</td>
        <td style={{ padding: '10px 12px', fontSize: '0.8125rem', color: 'var(--c-text-muted)', fontFamily: '"Inter", sans-serif' }}>
          {asset.currentVersion?.createdAt ? format(new Date(asset.currentVersion.createdAt), 'MMM d, HH:mm') : '—'}
        </td>
        <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => downloadViaApi(`/files/${asset._id}/download`, asset.canonicalName)}
            title="Download latest"
            style={{ padding: '5px', color: 'var(--c-text-muted)', borderRadius: '4px' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--c-carolina)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
          >
            <Download size={14} />
          </button>
        </td>
      </tr>
      {expanded && <VersionRows asset={asset} />}
    </>
  );
}

/* ── File directory panel ────────────────────────────────────── */
function PartFiles({ partId, selectedAsset, onSelectAsset }) {
  const { data: fileAssets = [], isLoading } = useGetPartFilesQuery(partId, { skip: !partId });

  if (isLoading) return (
    <div style={{ padding: '24px', color: 'var(--c-text-muted)', fontSize: '0.875rem' }}>Loading files…</div>
  );

  if (fileAssets.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
        <p style={{ fontSize: '0.875rem' }}>No files uploaded yet.</p>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--c-surface-low)' }}>
          <tr>
            {['FILENAME', 'TYPE', 'VER', 'SIZE', 'UPDATED', 'DL'].map(h => (
              <th key={h} style={{
                padding: '8px 12px',
                textAlign: 'left',
                fontSize: '0.625rem',
                fontFamily: '"Inter", sans-serif',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--c-text-muted)',
                borderBottom: '1px solid var(--c-border-soft)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fileAssets.map((a) => (
            <FileAssetRow
              key={a._id}
              asset={a}
              isSelected={selectedAsset?._id === a._id}
              onSelect={onSelectAsset}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function ProductView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const selectedPartId = useSelector(selectSelectedPartId);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const { data, isLoading, isError } = useGetProductQuery(slug);

  if (isLoading) return (
    <div style={{ padding: '32px', color: 'var(--c-text-muted)', fontFamily: '"Inter", sans-serif' }}>Loading…</div>
  );
  if (isError) return (
    <div style={{ padding: '32px', color: '#f87171' }}>Product not found.</div>
  );

  const { product } = data;

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: 'var(--c-bg)' }}>

      {/* ── Top bar — matches Stitch: breadcrumb + commit CTA ── */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: '48px',
          flexShrink: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--c-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
          >
            ← Projects
          </button>
          <span style={{ color: 'var(--c-border)', fontSize: '1.2rem', lineHeight: 1 }}>/</span>
          <h1
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: 'var(--c-text)',
              letterSpacing: '-0.01em',
            }}
          >
            {product.name}
          </h1>
          {product.slug && (
            <span className="badge-version">{product.slug}</span>
          )}
        </div>

        <button
          onClick={() => navigate(`/products/${slug}/upload`)}
          className="btn-primary flex items-center gap-2"
          style={{ padding: '7px 16px', fontSize: '0.75rem' }}
        >
          <Upload size={13} strokeWidth={2.5} />
          Upload File
        </button>
      </div>

      {/* ── Body — 3-Column Grid matching Stitch layout ─────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '0', background: 'var(--c-bg)' }}>

        {/* LEFT: Project Tree — sidebar-zone, no border (tonal) */}
        <div
          className="sidebar-zone"
          style={{
            width: '240px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid var(--c-border-soft)',
          }}
        >
          <ProjectTree product={product} />
        </div>

        {/* CENTER: 3D Viewer — full height, dark canvas */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: selectedAsset ? 'var(--c-surface-low)' : 'var(--c-bg)',
            borderRight: '1px solid var(--c-border-soft)',
          }}
        >
          {selectedAsset ? (
            <FileViewer
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Package
                  size={48}
                  style={{ margin: '0 auto 16px', opacity: 0.15, color: 'var(--c-carolina)' }}
                />
                <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--c-text-secondary)', marginBottom: '4px' }}>
                  No file selected
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                  Select a file from the directory to preview its 3D model
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: File Directory + Metadata Panel */}
        <div
          style={{
            width: '380px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--c-surface)',
          }}
        >
          {/* Directory header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '1px solid var(--c-border-soft)',
              flexShrink: 0,
            }}
          >
            <span className="label-technical">File Directory</span>
            <button style={{ color: 'var(--c-text-muted)', padding: '3px' }}>
              <Filter size={12} />
            </button>
          </div>

          {selectedPartId ? (
            <PartFiles
              partId={selectedPartId}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) =>
                setSelectedAsset(prev => prev?._id === asset._id ? null : asset)
              }
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-muted)' }}>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                <p style={{ fontSize: '0.875rem' }}>Select a part from the tree</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
