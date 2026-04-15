import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Box, Plus, Folder, Clock, Layers, X, Tag } from 'lucide-react';
import {
  useGetProductsQuery,
  useCreateProductMutation,
} from '../features/products/productsApi.js';
import toast from 'react-hot-toast';

/* ── Project Card ────────────────────────────────────────────── */
function ProductCard({ product, onClick }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all duration-200 group animate-fade-in"
      style={{
        background: 'var(--c-surface)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--c-border)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-ambient)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--c-surface-low)' }}
          >
            <Folder size={15} style={{ color: 'var(--c-carolina)' }} />
          </div>
          <h3
            className="truncate font-display font-semibold"
            style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--c-text)' }}
          >
            {product.name}
          </h3>
        </div>
        <span
          className="flex-shrink-0 ml-2 font-mono text-[10px] px-2 py-0.5 rounded"
          style={{
            background: 'var(--c-surface-low)',
            color: 'var(--c-text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {product.slug}
        </span>
      </div>

      {/* Description */}
      {product.description && (
        <p
          className="text-sm mb-3 line-clamp-2"
          style={{ color: 'var(--c-text-secondary)', lineHeight: 1.5 }}
        >
          {product.description}
        </p>
      )}

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {product.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-md"
              style={{
                background: 'rgba(19, 64, 116, 0.12)',
                color: 'var(--c-carolina)',
                fontFamily: '"Inter", sans-serif',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer — no border line per design rules, use spacing */}
      <div
        className="flex items-center justify-between text-xs pt-3 mt-auto"
        style={{ color: 'var(--c-text-muted)', borderTop: '1px solid var(--c-border-soft)' }}
      >
        <div className="flex items-center gap-1.5">
          <Layers size={11} />
          <span>{product.totalFiles || 0} file{product.totalFiles !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={11} />
          <span>{format(new Date(product.updatedAt), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
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
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)' }}>
      {/* Page inner container */}
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Page Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p
              className="label-technical mb-1"
              style={{ color: 'var(--c-text-muted)' }}
            >
              Version Control System
            </p>
            <h1
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '1.75rem',
                color: 'var(--c-text)',
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
              }}
            >
              Project Workspace
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--c-text-secondary)', marginTop: '4px' }}>
              Oversee your 3D repository architecture
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Project
          </button>
        </div>

        {/* States */}
        {isLoading && (
          <div
            className="text-center py-20"
            style={{ color: 'var(--c-text-muted)', fontFamily: '"Inter", sans-serif' }}
          >
            Loading projects...
          </div>
        )}
        {isError && (
          <div className="text-center py-20 text-red-400">Failed to load projects.</div>
        )}

        {/* Empty state */}
        {!isLoading && products.length === 0 && (
          <div
            className="text-center py-20 rounded-xl"
            style={{
              background: 'var(--c-surface-low)',
              border: '2px dashed var(--c-border)',
            }}
          >
            <Box size={40} style={{ color: 'var(--c-text-muted)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--c-text-secondary)', fontSize: '0.9375rem' }}>
              No projects yet.
            </p>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.8125rem', marginTop: '4px' }}>
              Initialize a new version-controlled workspace.
            </p>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              onClick={() => navigate(`/products/${p.slug}`)}
            />
          ))}
        </div>
      </div>

      {/* ── New Project Modal ─────────────────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10, 22, 40, 0.75)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div
            className="w-full max-w-md animate-fade-in"
            style={{
              background: 'var(--c-surface)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--c-border)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-start justify-between px-6 py-5"
              style={{ borderBottom: '1px solid var(--c-border-soft)' }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: 'var(--c-text)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  New Project
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                  Initialize a new version-controlled workspace.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-full w-7 h-7 flex items-center justify-center transition-theme"
                style={{ color: 'var(--c-text-muted)', background: 'var(--c-surface-low)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="label-technical block mb-2">Project Name</label>
                <input
                  required
                  placeholder="e.g. Turbine_Assembly_01"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-technical block mb-2">Description</label>
                <textarea
                  rows={3}
                  placeholder="Define the scope and primary objectives..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="label-technical block mb-2">
                  <Tag size={9} className="inline mr-1" />
                  Tags
                </label>
                <input
                  placeholder="Prototype, Actuator, Nylon-PA12... (comma-separated)"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="input-field"
                />
                {/* Preview tags */}
                {form.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(19,64,116,0.12)', color: 'var(--c-carolina)' }}
                      >
                        {tag} ×
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary"
                >
                  {isCreating ? 'Creating...' : 'Create Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
