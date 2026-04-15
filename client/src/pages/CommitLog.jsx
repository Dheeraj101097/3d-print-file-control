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
    <div className="border-b border-theme-border-soft last:border-0 transition-colors">
      <div
        className="flex items-start gap-3 px-4 py-3 hover:bg-theme-surface-low cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GitCommit size={16} className="text-theme-action mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-theme-surface border border-theme-border-soft text-theme-text-secondary px-2 py-0.5 rounded shadow-sm">
              {commit.shortHash}
            </span>
            <span className="text-sm font-medium text-theme-text truncate">{commit.message}</span>
            {commit.tags?.map((tag) => (
              <span key={tag} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded shadow-sm">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-theme-text-muted">
            <span>{commit.author?.displayName}</span>
            <span>{format(new Date(commit.createdAt), 'MMM d, yyyy HH:mm')}</span>
            <span>{commit.changes?.length} file{commit.changes?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleTag(); }}
            className="p-1 text-theme-text-muted hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition"
            title="Tag this commit"
          >
            <Tag size={13} />
          </button>
          <div className="text-theme-text-muted ml-1">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {expanded && commit.changes?.length > 0 && (
        <div className="px-10 pb-3 -mt-1 space-y-1.5">
          {commit.changes.map((change, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-theme-text-secondary bg-theme-surface-low/50 px-2 py-1.5 rounded-md border border-theme-border-soft/50">
              <span className={`w-16 text-center rounded px-1 py-0.5 font-mono font-medium border
                ${change.changeType === 'added' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  change.changeType === 'deleted' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                {change.changeType}
              </span>
              <FileText size={11} className="opacity-50" />
              <span className="font-mono text-theme-text opacity-90">{change.fileAsset?.canonicalName || '—'}</span>
              {change.previousVersion && (
                <span className="text-theme-text-muted ml-auto font-mono text-[10px]">
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

  if (isLoading) return <div className="p-8 text-theme-text-muted">Loading commits...</div>;
  if (isError) return <div className="p-8 text-red-500">Failed to load commits.</div>;

  const { commits = [], total, pages } = data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-theme-text-muted hover:text-theme-text transition mb-6"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <h1 className="text-xl font-bold text-theme-text flex items-center gap-2 mb-2">
        <GitCommit size={20} className="text-theme-action" /> Commit Log
      </h1>

      <div className="bg-theme-surface-low border border-theme-border-soft text-theme-text-muted font-mono text-xs rounded p-3 mb-6 shadow-inner">
        <span className="text-green-400">$</span> git log --oneline --graph
        <span className="text-theme-text-secondary ml-2 opacity-70">({total} commits)</span>
      </div>

      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm">
        {commits.map((c) => <CommitRow key={c._id} commit={c} />)}
        {commits.length === 0 && (
          <p className="text-theme-text-muted text-sm text-center py-8">No commits yet.</p>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-1.5 border border-theme-border-soft rounded-lg text-theme-text-secondary text-sm hover:bg-theme-surface-low transition disabled:opacity-40 font-medium"
          >
            Prev
          </button>
          <span className="px-4 py-1.5 text-sm text-theme-text-muted font-mono bg-theme-surface-low border border-theme-border-soft rounded-lg">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-4 py-1.5 border border-theme-border-soft rounded-lg text-theme-text-secondary text-sm hover:bg-theme-surface-low transition disabled:opacity-40 font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
