import { useNavigate } from 'react-router-dom';
import { GitBranch, Upload, Download, History, Tag, RotateCcw, Activity } from 'lucide-react';
import { useCloneProductMutation } from '../../features/products/productsApi.js';
import toast from 'react-hot-toast';

export default function VcsCommandBar({ product }) {
  const navigate = useNavigate();
  const [cloneProduct, { isLoading: isCloning }] = useCloneProductMutation();

  const handleClone = async () => {
    const name = window.prompt(`Clone "${product.name}" as:`, `${product.name}-copy`);
    if (!name) return;
    try {
      const result = await cloneProduct({ id: product._id, name }).unwrap();
      toast.success(`Cloned as "${result.product.name}"`);
      navigate(`/products/${result.product.slug}`);
    } catch (err) {
      toast.error(err.data?.message || 'Clone failed');
    }
  };

  const handlePush = () => navigate(`/products/${product.slug}/upload`);
  const handleLog = () => navigate(`/products/${product._id}/commits`);
  const handleStatus = () => navigate(`/products/${product._id}/status`);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-mono text-sm">
      <span className="text-green-400 mr-2">git</span>

      <button
        onClick={handlePush}
        className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition"
        title="Push a new file (git push)"
      >
        <Upload size={14} /> push
      </button>

      <button
        onClick={handleLog}
        className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition"
        title="View commit log (git log)"
      >
        <History size={14} /> log
      </button>

      <button
        onClick={handleStatus}
        className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition"
        title="View status (git status)"
      >
        <Activity size={14} /> status
      </button>

      <button
        onClick={handleClone}
        disabled={isCloning}
        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded transition disabled:opacity-50"
        title="Clone this repository (git clone)"
      >
        <GitBranch size={14} /> {isCloning ? 'cloning...' : 'clone'}
      </button>

      <div className="ml-auto flex items-center gap-2 text-gray-400 text-xs">
        <span className="text-yellow-400">HEAD</span>
        <span>→</span>
        <span className="text-green-300 font-mono">
          {product.headCommit?.shortHash || 'no commits'}
        </span>
      </div>
    </div>
  );
}
