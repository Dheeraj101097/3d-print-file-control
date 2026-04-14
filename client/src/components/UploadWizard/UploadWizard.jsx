import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle2, Loader2, Layers, X, FileText } from 'lucide-react';
import { useGetPartsQuery, useCreatePartMutation } from '../../features/products/productsApi.js';
import { useGetPartFilesQuery, filesApi } from '../../features/files/filesApi.js';
import { setSelectedPart } from '../../features/products/productsSlice.js';
import { useDispatch } from 'react-redux';
import axiosInstance from '../../api/axiosInstance.js';
import toast from 'react-hot-toast';

// Mirror the server naming logic for live preview
function previewName({ partName, partCreatedAt, fileType, piecesPerPrint, versionNumber }) {
  const safe = (partName || 'file')
    .toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').slice(0, 40);
  const d = new Date(partCreatedAt);
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const v = `v${String(versionNumber).padStart(2, '0')}`;
  const ext = fileType.toLowerCase();
  if (fileType === 'gcode' && piecesPerPrint) return `${safe}-${date}-${piecesPerPrint}pcs-${v}.${ext}`;
  return `${safe}-${date}-${v}.${ext}`;
}

const FILE_TYPES = {
  stl: 'STL · 3D Model',
  step: 'STEP · 3D Model',
  stp: 'STEP · 3D Model',
  gcode: 'G-Code · Print File',
  gco: 'G-Code · Print File',
};
const ACCEPT = {
  'application/octet-stream': ['.stl', '.step', '.stp'],
  'text/plain': ['.gcode', '.gco'],
  'application/x-gcode': ['.gcode'],
};

function detectType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'stl') return 'stl';
  if (ext === 'step' || ext === 'stp') return 'step';
  if (ext === 'gcode' || ext === 'gco') return 'gcode';
  return 'other';
}

export default function UploadWizard({ product, initialPartId, onSuccess, onClose }) {
  const dispatch = useDispatch();

  const [selectedPartId, setSelectedPartId] = useState(initialPartId || '');
  const [showNewPart, setShowNewPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileLabel, setFileLabel] = useState('');
  const [labelEdited, setLabelEdited] = useState(false);
  const [piecesPerPrint, setPiecesPerPrint] = useState('');
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const { data: parts = [] } = useGetPartsQuery(product._id);
  const { data: existingFiles = [] } = useGetPartFilesQuery(selectedPartId, { skip: !selectedPartId });
  const [createPart] = useCreatePartMutation();

  const selectedPart = parts.find(p => p._id === selectedPartId);

  // Auto-fill label from part name unless user has manually changed it
  useEffect(() => {
    if (!labelEdited && selectedPart) {
      setFileLabel(selectedPart.name);
    }
  }, [selectedPart, labelEdited]);

  // Reset label-edited flag when part changes
  useEffect(() => {
    setLabelEdited(false);
  }, [selectedPartId]);

  // Find if a matching slot already exists (determines version number)
  const piecesNum = piecesPerPrint ? parseInt(piecesPerPrint) : null;
  const existingSlot = (fileType && selectedPartId && fileLabel)
    ? existingFiles.find(f =>
        f.fileType === fileType &&
        (f.subpartName || '').toLowerCase() === fileLabel.toLowerCase() &&
        (f.piecesPerPrint ?? null) === piecesNum
      )
    : null;

  const nextVersion = existingSlot ? existingSlot.versionCount + 1 : 1;

  const previewFilename = (selectedPart && fileType && fileLabel)
    ? previewName({
        partName: fileLabel,
        partCreatedAt: selectedPart.createdAt,
        fileType,
        piecesPerPrint: piecesNum,
        versionNumber: nextVersion,
      })
    : null;

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    setFileType(detectType(f.name));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPT, maxFiles: 1,
  });

  const handleCreatePart = async () => {
    if (!newPartName.trim()) return;
    try {
      const part = await createPart({ productId: product._id, name: newPartName.trim() }).unwrap();
      setSelectedPartId(part._id);
      setShowNewPart(false);
      setNewPartName('');
      toast.success(`Part "${part.name}" created`);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create part');
    }
  };

  const handleSave = async () => {
    if (!file || !selectedPartId) return;
    setIsUploading(true);
    setProgress(0);

    const form = new FormData();
    form.append('file', file);
    form.append('partId', selectedPartId);
    form.append('fileLabel', fileLabel);
    if (piecesPerPrint) form.append('piecesPerPrint', piecesPerPrint);
    if (note) form.append('commitMessage', note);

    try {
      const { data } = await axiosInstance.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      });

      // Sync selected part to Redux so ProductView shows the right part on navigate-back
      dispatch(setSelectedPart(selectedPartId));
      dispatch(filesApi.util.invalidateTags([{ type: 'FileAsset', id: selectedPartId }]));
      setResult(data);

      if (data.sameAsPrevious) {
        toast(`Identical content to previous version — saved as ${data.canonicalName}`, { icon: '⚠️' });
      } else {
        toast.success(`Saved as ${data.canonicalName}`);
      }
      onSuccess?.(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const canSave = file && selectedPartId && fileLabel.trim() && !isUploading;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle2 size={44} className="mx-auto text-green-500" />
        <h3 className="text-lg font-semibold text-gray-800">File saved!</h3>
        <div className="inline-block bg-gray-50 border rounded-lg px-4 py-2 font-mono text-sm text-gray-700">
          {result.canonicalName}
        </div>
        {result.sameAsPrevious && (
          <p className="text-xs text-amber-500">⚠️ Content is identical to the previous version.</p>
        )}
        {!result.sameAsPrevious && result.deduplicated && (
          <p className="text-xs text-gray-400">Content already stored — no duplicate bytes used.</p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => {
              setFile(null); setFileType(null); setResult(null);
              setNote(''); setPiecesPerPrint('');
              setLabelEdited(false);
            }}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Upload another
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Part selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Part</label>
        {showNewPart ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePart()}
              placeholder="Part name (e.g. logo, base, bracket)"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={handleCreatePart}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Create
            </button>
            <button onClick={() => setShowNewPart(false)}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">Select a part...</option>
              {parts.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <button onClick={() => setShowNewPart(true)}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 whitespace-nowrap text-blue-600">
              + New part
            </button>
          </div>
        )}
      </div>

      {/* File drop zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
        {file ? (
          <div className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-gray-50">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {FILE_TYPES[fileType] || fileType} · {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button onClick={() => { setFile(null); setFileType(null); }}
              className="text-gray-400 hover:text-red-500 shrink-0">
              <X size={15} />
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
              ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
          >
            <input {...getInputProps()} />
            <Upload size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              {isDragActive ? 'Drop it here' : 'Drag & drop or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">.stl · .step · .gcode</p>
          </div>
        )}
      </div>

      {/* File label + pieces (shown once file is selected) */}
      {file && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                File name
                <span className="text-xs text-gray-400 font-normal ml-1">(used in saved filename)</span>
              </label>
              <input
                type="text"
                value={fileLabel}
                onChange={(e) => { setFileLabel(e.target.value); setLabelEdited(true); }}
                placeholder="e.g. logo, base-v2"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Change to create a separate file row
              </p>
            </div>

            {fileType === 'gcode' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pieces per print
                  <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={piecesPerPrint}
                  onChange={(e) => setPiecesPerPrint(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">How many fit on the print bed?</p>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note
              <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed? e.g. adjusted support angle"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Filename preview + slot info */}
          {previewFilename && (
            <div className="rounded-xl border overflow-hidden">
              <div className="bg-gray-900 px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Will be saved as</p>
                <p className="font-mono text-sm text-green-400">{previewFilename}</p>
              </div>
              <div className={`px-4 py-2 text-xs ${existingSlot ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                {existingSlot
                  ? `Updates existing file → creates v${String(nextVersion).padStart(2, '0')} (currently at v${String(existingSlot.versionCount).padStart(2, '0')})`
                  : 'New file — will appear as a new row'}
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 size={14} className="animate-spin" />
            Saving... {progress}%
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {onClose && (
          <button onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {isUploading ? 'Saving...' : 'Save File'}
        </button>
      </div>
    </div>
  );
}
