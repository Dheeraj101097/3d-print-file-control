import { useState } from 'react';
import { ChevronRight, ChevronDown, Layers, Plus, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSelectedPart,
  selectSelectedPartId,
} from '../../features/products/productsSlice.js';
import {
  useGetPartsQuery,
  useCreatePartMutation,
  useDeletePartMutation,
} from '../../features/products/productsApi.js';
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
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg group transition-colors
        ${isSelected
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <Layers size={14} className={isSelected ? 'text-white' : 'text-blue-500'} />
      <span className="text-sm font-medium flex-1 truncate">{part.name}</span>
      <button
        onClick={handleDelete}
        className={`opacity-0 group-hover:opacity-100 transition
          ${isSelected ? 'text-blue-200 hover:text-white' : 'text-red-400 hover:text-red-600'}`}
      >
        <Trash2 size={12} />
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

  if (isLoading) return <div className="p-4 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parts</span>
        <button
          onClick={handleAddPart}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
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
          <div className="text-center py-8 px-4">
            <Layers size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No parts yet</p>
            <p className="text-xs text-gray-300 mt-1">Add a part to start uploading files</p>
          </div>
        )}
      </div>
    </div>
  );
}
