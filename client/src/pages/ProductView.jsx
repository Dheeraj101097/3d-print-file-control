import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import {
  Download, FileText, Package, Upload,
  ChevronRight, ChevronDown, RotateCcw, Loader2,
} from 'lucide-react';
import { useGetProductQuery } from '../features/products/productsApi.js';
import { useGetPartFilesQuery, useGetFileVersionsQuery, useRollbackFileMutation } from '../features/files/filesApi.js';
import { selectSelectedPartId } from '../features/products/productsSlice.js';
import ProjectTree from '../components/ProjectTree/ProjectTree.jsx';
import FileViewer from '../components/FileViewer/FileViewer.jsx';
import axiosInstance from '../api/axiosInstance.js';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FileTypeTag({ type }) {
  const colors = {
    stl:   'bg-purple-100 text-purple-700',
    step:  'bg-green-100 text-green-700',
    gcode: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${colors[type] || colors.other}`}>
      .{type}
    </span>
  );
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

// ── Inline version rows ──────────────────────────────────────────────────────
function VersionRows({ asset }) {
  const { data, isLoading } = useGetFileVersionsQuery({ fileAssetId: asset._id });
  const [rollback, { isLoading: isRollingBack }] = useRollbackFileMutation();

  if (isLoading) {
    return (
      <tr>
        <td colSpan={6} className="pl-12 py-2 text-xs text-gray-400">
          <Loader2 size={12} className="inline animate-spin mr-1" /> Loading versions…
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
          <tr key={v._id} className={`border-b border-gray-100 ${isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <td className="pl-10 pr-2 py-2" colSpan={2}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-px bg-gray-300 shrink-0" />
                <span className={`font-mono text-xs font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                  v{String(v.versionNumber).padStart(2, '0')}
                </span>
                {isCurrent && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">current</span>
                )}
                <span className="font-mono text-xs text-gray-400 truncate max-w-[180px]">{versionName(v)}</span>
              </div>
            </td>
            <td className="px-3 py-2 text-xs text-gray-400">{formatBytes(v.fileSizeBytes)}</td>
            <td className="px-3 py-2 text-xs text-gray-400">
              {format(new Date(v.createdAt), 'MMM d, yyyy · HH:mm')}
              {v.uploadedBy?.displayName && (
                <span className="ml-2 text-gray-300">· {v.uploadedBy.displayName}</span>
              )}
            </td>
            <td className="px-3 py-2 text-xs font-mono text-gray-300">{v.contentHash?.slice(0, 8)}</td>
            <td className="px-3 py-2">
              <div className="flex gap-1">
                <button
                  onClick={() => downloadViaApi(`/files/${asset._id}/download`, versionName(v))}
                  title="Download"
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Download size={13} />
                </button>
                {!isCurrent && (
                  <button
                    onClick={() => handleRestore(v)}
                    disabled={isRollingBack}
                    title="Restore"
                    className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded disabled:opacity-40"
                  >
                    <RotateCcw size={13} />
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

// ── File row ─────────────────────────────────────────────────────────────────
function FileAssetRow({ asset, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const hasVersions = asset.versionCount > 1;

  return (
    <>
      <tr
        onClick={() => onSelect(asset)}
        className={`text-sm border-b border-gray-100 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
      >
        {/* Chevron + filename */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); hasVersions && setExpanded(!expanded); }}
              className={`shrink-0 p-0.5 rounded hover:bg-gray-200 transition ${hasVersions ? 'text-gray-400' : 'text-transparent pointer-events-none'}`}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span className="font-mono text-xs text-gray-800 truncate max-w-[200px]">
              {asset.canonicalName}
            </span>
          </div>
        </td>

        <td className="px-3 py-3"><FileTypeTag type={asset.fileType} /></td>

        <td className="px-3 py-3 text-xs">
          <span className="font-mono font-bold text-gray-700">
            v{String(asset.currentVersion?.versionNumber || 0).padStart(2, '0')}
          </span>
          {asset.versionCount > 1 && (
            <span className="ml-1.5 text-gray-400">({asset.versionCount})</span>
          )}
        </td>

        <td className="px-3 py-3 text-xs text-gray-400">{formatBytes(asset.totalStorageBytes)}</td>

        <td className="px-3 py-3 text-xs text-gray-400">
          {asset.currentVersion?.createdAt
            ? format(new Date(asset.currentVersion.createdAt), 'MMM d, HH:mm')
            : '—'}
        </td>

        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => downloadViaApi(`/files/${asset._id}/download`, asset.canonicalName)}
            title="Download latest"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Download size={14} />
          </button>
        </td>
      </tr>

      {expanded && <VersionRows asset={asset} />}
    </>
  );
}

// ── Part file list ────────────────────────────────────────────────────────────
function PartFiles({ partId, selectedAsset, onSelectAsset }) {
  const { data: fileAssets = [], isLoading } = useGetPartFilesQuery(partId, { skip: !partId });

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading files…</div>;

  if (fileAssets.length === 0) return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <FileText size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No files uploaded yet.</p>
        <p className="text-xs mt-1 text-gray-300">Click Upload File to add one.</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left">Filename</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Ver</th>
            <th className="px-3 py-2 text-left">Size</th>
            <th className="px-3 py-2 text-left">Updated</th>
            <th className="px-3 py-2 text-left">DL</th>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProductView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const selectedPartId = useSelector(selectSelectedPartId);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const { data, isLoading, isError } = useGetProductQuery(slug);

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (isError)   return <div className="p-8 text-red-500">Product not found.</div>;

  const { product } = data;

  return (
    <div className="h-screen flex flex-col">

      {/* Top bar */}
      <div className="border-b px-4 py-3 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Projects
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="font-semibold text-gray-900">{product.name}</h1>
        </div>
        <button
          onClick={() => navigate(`/products/${slug}/upload`)}
          className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
        >
          <Upload size={14} /> Upload File
        </button>
      </div>

      {/* Body — 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Panel 1: Project tree */}
        <div className="w-52 border-r bg-white overflow-hidden flex-shrink-0">
          <ProjectTree product={product} />
        </div>

        {/* Panel 2: File list */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {selectedPartId ? (
            <PartFiles
              partId={selectedPartId}
              selectedAsset={selectedAsset}
              onSelectAsset={(asset) =>
                setSelectedAsset(prev => prev?._id === asset._id ? null : asset)
              }
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a part from the left panel</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3: File viewer (only when an asset is selected) */}
        {selectedAsset && (
          <div className="w-80 flex-shrink-0 overflow-y-auto">
            <FileViewer
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
