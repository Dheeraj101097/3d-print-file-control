import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, History } from 'lucide-react';
import { useGetFileVersionsQuery } from '../features/files/filesApi.js';
import FileTimeline from '../components/FileTimeline/FileTimeline.jsx';

export default function FileHistory() {
  const { fileAssetId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetFileVersionsQuery({ fileAssetId });

  if (isLoading) return <div className="p-8 text-gray-400">Loading history...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load history.</div>;

  const { fileAsset, versions, total } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <History size={20} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">
            {fileAsset.canonicalName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total} version{total !== 1 ? 's' : ''} · {fileAsset.fileType.toUpperCase()}
            {fileAsset.piecesPerPrint ? ` · ${fileAsset.piecesPerPrint} pcs/print` : ''}
          </p>
        </div>
      </div>

      {versions.length === 0 ? (
        <p className="text-gray-400 text-sm">No versions found.</p>
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
