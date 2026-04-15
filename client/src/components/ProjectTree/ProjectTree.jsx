import { useState } from 'react';
import { Layers, Plus, Trash2, FolderOpen } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedPart, selectSelectedPartId } from '../../features/products/productsSlice.js';
import { useGetPartsQuery, useCreatePartMutation, useDeletePartMutation } from '../../features/products/productsApi.js';
import toast from 'react-hot-toast';

function PartItem({ part, product, isSelected, onSelect }) {
  const [deletePart] = useDeletePartMutation();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete part "${part.name}" and all its files?`)) return;
    try {
      await deletePart({ productId: product._id, partId: part._id }).unwrap();
      toast.success('Part deleted');
    } catch {
      toast.error('Failed to delete part');
    }
  };

  return (
    <div
      onClick={() => onSelect(part._id)}
      className="group"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 10px',
        cursor: 'pointer',
        borderRadius: '6px',
        background: isSelected ? 'linear-gradient(90deg, rgba(19, 64, 116, 0.30) 0%, rgba(19, 64, 116, 0.10) 100%)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--c-carolina)' : '2px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
        marginLeft: '-1px',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--c-surface)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <Layers
        size={13}
        style={{ color: isSelected ? 'var(--c-carolina)' : 'var(--c-text-muted)', flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: '0.8125rem',
          fontFamily: '"Inter", sans-serif',
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? 'var(--c-text)' : 'var(--c-text-secondary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {part.name}
      </span>
      <button
        onClick={handleDelete}
        style={{
          color: 'var(--c-text-muted)',
          opacity: 0,
          transition: 'opacity 0.2s, color 0.2s',
          padding: '2px',
        }}
        className="group-hover:opacity-100"
        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export default function ProjectTree({ product }) {
  const dispatch = useDispatch();
  const selectedPartId = useSelector(selectSelectedPartId);
  const { data: parts = [], isLoading } = useGetPartsQuery(product._id);
  const [createPart] = useCreatePartMutation();

  const handleAddPart = async () => {
    const name = window.prompt('Part name (e.g. "logo", "base", "core"):');
    if (!name?.trim()) return;
    try {
      await createPart({ productId: product._id, name: name.trim() }).unwrap();
      toast.success(`Part "${name}" added`);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to add part');
    }
  };

  if (isLoading) return <div style={{ padding: '12px', fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>Loading...</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--c-surface-low)' }}>

      {/* Header — label-technical style */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--c-border-soft)', flexShrink: 0 }}>
        <span className="label-technical">Project Tree</span>
        <button
          onClick={handleAddPart}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--c-carolina)', fontFamily: '"Inter", sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={12} strokeWidth={2.5} /> Add Part
        </button>
      </div>

      {/* Part list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {parts.map((part) => (
          <PartItem
            key={part._id}
            part={part}
            product={product}
            isSelected={selectedPartId === part._id}
            onSelect={(id) => dispatch(setSelectedPart(id))}
          />
        ))}
        {parts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 12px' }}>
            <FolderOpen size={28} style={{ margin: '0 auto 8px', color: 'var(--c-text-muted)', opacity: 0.4 }} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-secondary)' }}>No parts yet</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '3px' }}>Add a part to start uploading files</p>
          </div>
        )}
      </div>
    </div>
  );
}
