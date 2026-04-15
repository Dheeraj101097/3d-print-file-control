import { useState } from 'react';
import { Printer, Plus, Pencil, Trash2, ArrowLeft, Clock, GitFork, Cloud, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetProfilesQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
} from '../features/printerProfiles/printerProfilesApi.js';
import toast from 'react-hot-toast';

const emptyForm = { name: '', bedWidth: '', bedDepth: '', bedHeight: '', notes: '' };

/* Sidebar nav items — matches Stitch Printer Profiles layout */
const NAV_ITEMS = [
  { icon: Clock,    label: 'History',  key: 'history' },
  { icon: GitFork,  label: 'Branches', key: 'branches' },
  { icon: Printer,  label: 'Printers', key: 'printers', active: true },
  { icon: Cloud,    label: 'Cloud',    key: 'cloud' },
];

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
    <div
      style={{
        height: 'calc(100vh - 56px)',
        display: 'flex',
        background: 'var(--c-bg)',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* ── Left sidebar — matches Stitch printer profiles layout ── */}
      <div
        className="sidebar-zone"
        style={{
          width: '220px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--c-border-soft)',
          padding: '16px 0',
        }}
      >
        {/* Project info */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--c-border-soft)', marginBottom: '8px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--c-text-muted)', fontSize: '0.8125rem', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--c-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
          >
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-container) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Printer size={13} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: '0.875rem', color: 'var(--c-text)' }}>
                FDM Fleet
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--c-text-muted)', letterSpacing: '0.03em' }}>v0.4.1-STABLE</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map(({ icon: Icon, label, key, active }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 16px',
              cursor: active ? 'default' : 'pointer',
              background: active ? 'linear-gradient(90deg, rgba(19, 64, 116, 0.25) 0%, transparent 100%)' : 'transparent',
              borderLeft: active ? '3px solid var(--c-carolina)' : '3px solid transparent',
              transition: 'background 0.2s',
              marginLeft: active ? 0 : 0,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--c-surface)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon size={15} style={{ color: active ? 'var(--c-carolina)' : 'var(--c-text-muted)', flexShrink: 0 }} />
            <span style={{
              fontSize: '0.8125rem',
              color: active ? 'var(--c-text)' : 'var(--c-text-secondary)',
              fontWeight: active ? 600 : 400,
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Content header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--c-border-soft)',
            flexShrink: 0,
          }}
        >
          <div>
            <p className="label-technical" style={{ marginBottom: '4px' }}>Manage Printer Fleet</p>
            <h1
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'var(--c-text)',
                letterSpacing: '-0.02em',
              }}
            >
              Printer Profiles
            </h1>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={13} strokeWidth={2.5} />
            Add Profile
          </button>
        </div>

        {/* Profile list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {isLoading && (
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem' }}>Loading...</p>
          )}

          {!isLoading && profiles.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 24px',
                borderRadius: '12px',
                border: '2px dashed var(--c-border)',
                color: 'var(--c-text-muted)',
                background: 'var(--c-surface-low)',
              }}
            >
              <Printer size={36} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
              <p style={{ fontSize: '0.9375rem', marginBottom: '4px' }}>No printer profiles yet.</p>
              <p style={{ fontSize: '0.8125rem' }}>Add one to use during file pushes.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {profiles.map((p) => (
              <div
                key={p._id}
                style={{
                  background: 'var(--c-surface)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--c-border)',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-ambient)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        background: 'var(--c-surface-low)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Printer size={15} style={{ color: 'var(--c-carolina)' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '2px', fontFamily: '"Inter", sans-serif' }}>
                        {p.bedWidth} × {p.bedDepth} × {p.bedHeight} mm
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                    <button
                      onClick={() => openEdit(p)}
                      style={{ padding: '5px', borderRadius: '6px', color: 'var(--c-text-muted)', transition: 'color 0.2s, background 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-carolina)'; e.currentTarget.style.background = 'rgba(141,169,196,0.10)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(p._id, p.name)}
                      style={{ padding: '5px', borderRadius: '6px', color: 'var(--c-text-muted)', transition: 'color 0.2s, background 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.10)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {p.notes && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: '10px', lineHeight: 1.5, borderTop: '1px solid var(--c-border-soft)', paddingTop: '10px' }}>
                    {p.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add/Edit Modal — matches Stitch modal style ─────── */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
            background: 'rgba(10, 22, 40, 0.80)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100%', maxWidth: '480px',
              background: 'var(--c-surface)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--c-border)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--c-border-soft)' }}>
              <div>
                <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--c-text)', letterSpacing: '-0.02em' }}>
                  {editingId ? 'Edit Profile' : 'Add New Printer Profile'}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                  Define technical specifications for version control tracking.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '4px', color: 'var(--c-text-muted)', borderRadius: '6px', marginLeft: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Printer Name</label>
                <input
                  required
                  placeholder="e.g. Voron Steathbourne v2.0"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Build Volume (mm)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { key: 'bedWidth', label: 'Width (X)' },
                    { key: 'bedDepth', label: 'Depth (Y)' },
                    { key: 'bedHeight', label: 'Height (Z)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--c-text-muted)', marginBottom: '4px', fontFamily: '"Inter", sans-serif' }}>{label}</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="220"
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-technical" style={{ display: 'block', marginBottom: '6px' }}>Notes (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any additional configuration notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
