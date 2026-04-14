import { useState } from 'react';
import { format } from 'date-fns';
import { Download, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { useRollbackFileMutation } from '../../features/files/filesApi.js';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function FileTimeline({ fileAsset, versions, currentVersionId }) {
  const [rollback, { isLoading: isRollingBack }] = useRollbackFileMutation();

  const handleDownload = (versionId) => {
    const a = document.createElement('a');
    a.href = `/api/versions/${versionId}/download`;
    a.click();
  };

  const handleRollback = async (version) => {
    const note = window.prompt(
      `Restore to v${String(version.versionNumber).padStart(2, '0')}? Add a note (optional):`,
      `Restored from v${String(version.versionNumber).padStart(2, '0')}`
    );
    if (note === null) return;

    try {
      await rollback({
        fileAssetId: fileAsset._id,
        targetVersionId: version._id,
        note,
      }).unwrap();
      toast.success('File restored successfully');
    } catch (err) {
      toast.error(err.data?.message || 'Restore failed');
    }
  };

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {versions.map((v, i) => {
          const isCurrent = String(v._id) === String(currentVersionId);

          return (
            <div key={v._id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0
                ${isCurrent ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                {isCurrent ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : (
                  <Clock size={14} className="text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 mb-2 rounded-lg border p-3 shadow-sm
                ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono font-bold text-sm
                        ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                        v{String(v.versionNumber).padStart(2, '0')}
                      </span>
                      {v.versionLabel && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {v.versionLabel}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Current</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      <span>{format(new Date(v.createdAt), 'MMM d, yyyy HH:mm')}</span>
                      <span>{formatBytes(v.fileSizeBytes)}</span>
                      {v.uploadedBy && <span>by {v.uploadedBy.displayName}</span>}
                      <span className="font-mono">{v.contentHash?.slice(0, 8)}</span>
                    </div>
                    {/* gcode metadata */}
                    {v.gcodeMetadata?.layerHeight && (
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-indigo-500">
                        {v.gcodeMetadata.layerHeight && <span>Layer: {v.gcodeMetadata.layerHeight}mm</span>}
                        {v.gcodeMetadata.estimatedPrintTimeSeconds && (
                          <span>Print: ~{formatTime(v.gcodeMetadata.estimatedPrintTimeSeconds)}</span>
                        )}
                        {v.gcodeMetadata.filamentUsedGrams && (
                          <span>Filament: {v.gcodeMetadata.filamentUsedGrams}g</span>
                        )}
                        {v.gcodeMetadata.nozzleTemp && <span>Nozzle: {v.gcodeMetadata.nozzleTemp}°C</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(v._id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Download this version"
                    >
                      <Download size={15} />
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRollback(v)}
                        disabled={isRollingBack}
                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                        title="Restore to this version"
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
