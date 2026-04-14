import { useState } from 'react';
import { Printer, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetProfilesQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
} from '../features/printerProfiles/printerProfilesApi.js';
import toast from 'react-hot-toast';

const emptyForm = { name: '', bedWidth: '', bedDepth: '', bedHeight: '', notes: '' };

export default function PrinterProfilesPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: profiles = [], isLoading } = useGetProfilesQuery();
  const [createProfile, { isLoading: isCreating }] = useCreateProfileMutation();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [deleteProfile] = useDeleteProfileMutation();

  const isSubmitting = isCreating || isUpdating;

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ name: p.name, bedWidth: p.bedWidth, bedDepth: p.bedDepth, bedHeight: p.bedHeight, notes: p.notes || '' });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProfile({ id: editingId, ...form }).unwrap();
        toast.success('Profile updated');
      } else {
        await createProfile(form).unwrap();
        toast.success('Profile created');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save profile');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete printer profile "${name}"?`)) return;
    try {
      await deleteProfile(id).unwrap();
      toast.success('Profile deleted');
    } catch {
      toast.error('Failed to delete profile');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} /> Back to Projects
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Printer size={20} className="text-blue-600" /> Printer Profiles
        </h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          <Plus size={15} /> Add Profile
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Profile' : 'New Printer Profile'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                placeholder="Printer name (e.g. Bambu X1C)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Bed W (mm)</label>
                  <input type="number" required min="1" value={form.bedWidth}
                    onChange={(e) => setForm({ ...form, bedWidth: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Bed D (mm)</label>
                  <input type="number" required min="1" value={form.bedDepth}
                    onChange={(e) => setForm({ ...form, bedDepth: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Height (mm)</label>
                  <input type="number" required min="1" value={form.bedHeight}
                    onChange={(e) => setForm({ ...form, bedHeight: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {profiles.map((p) => (
          <div key={p._id} className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="font-medium text-gray-900">{p.name}</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Bed: {p.bedWidth} × {p.bedDepth} × {p.bedHeight} mm
              </div>
              {p.notes && <div className="text-xs text-gray-400 mt-0.5">{p.notes}</div>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(p._id, p.name)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {!isLoading && profiles.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            No printer profiles yet. Add one to use during file pushes.
          </p>
        )}
      </div>
    </div>
  );
}
