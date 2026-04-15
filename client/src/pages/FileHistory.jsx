import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { useGetFileVersionsQuery } from '../features/files/filesApi.js';
import FileTimeline from '../components/FileTimeline/FileTimeline.jsx';

export default function FileHistory() {
  const { fileAssetId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetFileVersionsQuery({ fileAssetId });

  if (isLoading) return <div className="p-8 text-theme-text-muted">Loading history...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load history.</div>;

  const { fileAsset, versions, total } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text transition mb-6"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <History size={20} className="text-theme-action" />
        <div>
          <h1 className="text-xl font-bold text-theme-text font-mono">
            {fileAsset.canonicalName}
          </h1>
          <p className="text-sm text-theme-text-secondary mt-0.5">
            {total} version{total !== 1 ? 's' : ''} · {fileAsset.fileType.toUpperCase()}
            {fileAsset.piecesPerPrint ? ` · ${fileAsset.piecesPerPrint} pcs/print` : ''}
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <p className="text-theme-text-muted text-sm">No versions found.</p>
      ) : (
        <FileTimeline
          fileAsset={fileAsset}
          versions={versions}
          currentVersionId={fileAsset.currentVersion}
        />
      )}
    </div>
  );
}
