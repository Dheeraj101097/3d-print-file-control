import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle2, Loader2, X, FileText, CloudUpload, Info } from 'lucide-react';
import { useGetPartsQuery, useCreatePartMutation } from '../../features/products/productsApi.js';
import { useGetPartFilesQuery, filesApi } from '../../features/files/filesApi.js';
import { setSelectedPart } from '../../features/products/productsSlice.js';
import { useDispatch } from 'react-redux';
import axiosInstance from '../../api/axiosInstance.js';
import toast from 'react-hot-toast';

/* ── Helpers ──────────────────────────────────────────────── */
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

/* ── Component ────────────────────────────────────────────── */
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

  useEffect(() => {
    if (!labelEdited && selectedPart) setFileLabel(selectedPart.name);
  }, [selectedPart, labelEdited]);

  useEffect(() => { setLabelEdited(false); }, [selectedPartId]);

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
    ? previewName({ partName: fileLabel, partCreatedAt: selectedPart.createdAt, fileType, piecesPerPrint: piecesNum, versionNumber: nextVersion })
    : null;

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    setFileType(detectType(f.name));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPT, maxFiles: 1 });

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

  /* ── Success screen ─────────────────────────────────────── */
  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 24px', fontFamily: '"Inter", sans-serif' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={26} style={{ color: '#4ade80' }} />
        </div>
        <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--c-text)', marginBottom: '8px' }}>File Saved!</h3>
        <div style={{ display: 'inline-block', background: 'var(--c-surface-low)', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '8px 16px', fontFamily: '"Space Grotesk", monospace', fontSize: '0.8125rem', color: 'var(--c-text-secondary)', marginBottom: '12px' }}>
          {result.canonicalName}
        </div>
        {result.sameAsPrevious && <p style={{ fontSize: '0.75rem', color: '#fb923c', marginBottom: '8px' }}>⚠️ Content is identical to the previous version.</p>}
        {!result.sameAsPrevious && result.deduplicated && <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginBottom: '8px' }}>Content already stored — no duplicate bytes used.</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={() => { setFile(null); setFileType(null); setResult(null); setNote(''); setPiecesPerPrint(''); setLabelEdited(false); }} className="btn-secondary">
            Upload another
          </button>
        </div>
      </div>
    );
  }

  /* ── Main form ─────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: '"Inter", sans-serif' }}>

      {/* Part selector */}
      <div>
        <label className="label-technical" style={{ display: 'block', marginBottom: '8px' }}>Select Part</label>
        {showNewPart ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input autoFocus value={newPartName} onChange={e => setNewPartName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreatePart()} placeholder="Part name (e.g. logo, base)" className="input-field" style={{ flex: 1 }} />
            <button onClick={handleCreatePart} className="btn-primary" style={{ padding: '8px 14px' }}>Create</button>
            <button onClick={() => setShowNewPart(false)} className="btn-secondary" style={{ padding: '8px 14px' }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={selectedPartId} onChange={e => setSelectedPartId(e.target.value)} className="input-field" style={{ flex: 1 }}>
              <option value="">Chassis Assembly V4</option>
              {parts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <button onClick={() => setShowNewPart(true)} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>+ New Part</button>
          </div>
        )}
      </div>

      {/* Dropzone */}
      <div>
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--c-border)', borderRadius: '8px', padding: '12px 16px', background: 'var(--c-surface-low)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(19,64,116,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={16} style={{ color: 'var(--c-carolina)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--c-text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '2px' }}>{FILE_TYPES[fileType] || fileType} · {(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setFileType(null); }} style={{ color: 'var(--c-text-muted)', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}>
              <X size={15} />
            </button>
          </div>
        ) : (
          <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--c-carolina)' : 'var(--c-border)'}`, borderRadius: '8px', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: isDragActive ? 'rgba(141,169,196,0.06)' : 'transparent', transition: 'border-color 0.2s, background 0.2s' }}>
            <input {...getInputProps()} />
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--c-surface-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CloudUpload size={18} style={{ color: isDragActive ? 'var(--c-carolina)' : 'var(--c-text-muted)' }} />
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--c-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
              {isDragActive ? 'Drop it here' : 'Drag and drop your 3D files here'}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginBottom: '12px' }}>Supports .STL, .GCODE, .OBJ (MAX 500MB)</p>
            <button type="button" style={{ padding: '6px 18px', borderRadius: '6px', border: '1px solid var(--c-border)', background: 'var(--c-surface)', color: 'var(--c-text-secondary)', fontSize: '0.6875rem', cursor: 'pointer', fontFamily: '"Inter", sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
              Browse Files
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      {file && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>File Label</label>
            <input type="text" value={fileLabel} onChange={e => { setFileLabel(e.target.value); setLabelEdited(true); }} placeholder="e.g. logo, base-v2" className="input-field" />
            <p style={{ fontSize: '0.6875rem', color: 'var(--c-text-muted)', marginTop: '4px' }}>Change to create a separate file row</p>
          </div>
          {fileType === 'gcode' && (
            <div>
              <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Pieces per Print</label>
              <input type="number" min="1" value={piecesPerPrint} onChange={e => setPiecesPerPrint(e.target.value)} placeholder="1" className="input-field" />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Changed Note</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe the geometric refinements or parameter adjustments..." className="input-field" style={{ resize: 'none' }} />
          </div>
          {previewFilename && (
            <div style={{ gridColumn: '1 / -1', borderRadius: '8px', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--c-surface-low)', borderBottom: '1px solid var(--c-border-soft)' }}>
                <p className="label-technical" style={{ marginBottom: '3px' }}>Will be saved as</p>
                <p style={{ fontFamily: '"Space Grotesk", monospace', fontSize: '0.8125rem', color: '#4ade80', wordBreak: 'break-all' }}>{previewFilename}</p>
              </div>
              <div style={{ padding: '8px 14px', fontSize: '0.75rem', fontWeight: 500, background: existingSlot ? 'rgba(251,146,60,0.08)' : 'rgba(141,169,196,0.08)', color: existingSlot ? '#fb923c' : 'var(--c-carolina)' }}>
                {existingSlot ? `Updates existing file → creates v${String(nextVersion).padStart(2, '0')} (at v${String(existingSlot.versionCount).padStart(2, '00')})` : 'New file — will appear as a new row'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {isUploading && (
        <div style={{ padding: '14px 16px', background: 'var(--c-surface-low)', border: '1px solid var(--c-border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--c-text-secondary)', marginBottom: '8px' }}>
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--c-carolina)' }} />
            Saving... {progress}%
          </div>
          <div style={{ height: '4px', borderRadius: '4px', background: 'var(--c-bg)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--c-primary) 0%, var(--c-carolina) 100%)', borderRadius: '4px', transition: 'width 0.3s ease-out' }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
          <Info size={12} />
          Files will be encrypted before processing.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {onClose && <button onClick={onClose} className="btn-secondary">Cancel</button>}
          <button onClick={handleSave} disabled={!canSave} className="btn-primary flex items-center gap-2">
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {isUploading ? 'Saving...' : 'Upload and Process'}
          </button>
        </div>
      </div>
    </div>
  );
}
