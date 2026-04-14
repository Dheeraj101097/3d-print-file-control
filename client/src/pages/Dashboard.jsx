import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Box, Plus, Folder, Clock, Layers } from 'lucide-react';
import {
  useGetProductsQuery,
  useCreateProductMutation,
} from '../features/products/productsApi.js';
import toast from 'react-hot-toast';

function ProductCard({ product, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Folder size={18} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
        </div>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">
          {product.slug}
        </span>
      </div>

      {product.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {product.tags?.map((tag) => (
          <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <Layers size={11} />
          <span>{product.totalFiles || 0} file{product.totalFiles !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={11} />
          <span>{format(new Date(product.updatedAt), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', tags: '' });
  const { data, isLoading, isError } = useGetProductsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const product = await createProduct({ ...form, tags }).unwrap();
      toast.success(`"${product.name}" created`);
      setShowCreate(false);
      setForm({ name: '', description: '', tags: '' });
      navigate(`/products/${product.slug}`);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create project');
    }
  };

  const products = data?.products || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Box size={20} className="text-blue-600" />
            My Projects
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Your 3D print asset projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                required
                placeholder="Name (e.g. Lamp, Bracket-v2)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <textarea
                rows={2}
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm resize-none"
              />
              <input
                placeholder="Tags (comma-separated, optional)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-16 text-gray-400">Loading projects...</div>
      )}
      {isError && (
        <div className="text-center py-16 text-red-500">Failed to load projects.</div>
      )}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-16">
          <Box size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No projects yet. Create your first one.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p) => (
          <ProductCard
            key={p._id}
            product={p}
            onClick={() => navigate(`/products/${p.slug}`)}
          />
        ))}
      </div>
    </div>
  );
}
