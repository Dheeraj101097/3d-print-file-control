import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { GitCommit, ArrowLeft, Tag, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import { useGetCommitsQuery, useTagCommitMutation } from '../features/commits/commitsApi.js';
import toast from 'react-hot-toast';

function CommitRow({ commit }) {
  const [expanded, setExpanded] = useState(false);
  const [tagCommit] = useTagCommitMutation();

  const handleTag = async () => {
    const tag = window.prompt('Tag name (e.g. "v1.0", "release-candidate"):');
    if (!tag) return;
    try {
      await tagCommit({ commitId: commit._id, tag }).unwrap();
      toast.success(`Tagged as "${tag}"`);
    } catch (err) {
      toast.error(err.data?.message || 'Tagging failed');
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <GitCommit size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              {commit.shortHash}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">{commit.message}</span>
            {commit.tags?.map((tag) => (
              <span key={tag} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span>{commit.author?.displayName}</span>
            <span>{format(new Date(commit.createdAt), 'MMM d, yyyy HH:mm')}</span>
            <span>{commit.changes?.length} file{commit.changes?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleTag(); }}
            className="p-1 text-gray-400 hover:text-yellow-600 rounded"
            title="Tag this commit"
          >
            <Tag size={13} />
          </button>
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && commit.changes?.length > 0 && (
        <div className="px-10 pb-3 space-y-1">
          {commit.changes.map((change, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`w-16 text-center rounded px-1 py-0.5 font-mono
                ${change.changeType === 'added' ? 'bg-green-100 text-green-700' :
                  change.changeType === 'deleted' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'}`}>
                {change.changeType}
              </span>
              <FileText size={11} />
              <span className="font-mono">{change.fileAsset?.canonicalName || '—'}</span>
              {change.previousVersion && (
                <span className="text-gray-400">
                  v{String(change.previousVersion.versionNumber).padStart(2, '0')} →{' '}
                  v{String(change.fileVersion?.versionNumber).padStart(2, '0')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommitLog() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetCommitsQuery({ productId, page });

  if (isLoading) return <div className="p-8 text-gray-400">Loading commits...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load commits.</div>;

  const { commits = [], total, pages } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
        <GitCommit size={20} className="text-blue-600" /> Commit Log
      </h1>

      <div className="bg-gray-900 text-gray-400 font-mono text-xs rounded p-3 mb-6">
        <span className="text-green-400">$</span> git log --oneline --graph
        <span className="text-gray-500 ml-2">({total} commits)</span>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        {commits.map((c) => <CommitRow key={c._id} commit={c} />)}
        {commits.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No commits yet.</p>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
