import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudUpload } from 'lucide-react';
import { useGetProductQuery } from '../features/products/productsApi.js';
import UploadWizard from '../components/UploadWizard/UploadWizard.jsx';

export default function UploadPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetProductQuery(slug);

  if (isLoading) return (
    <div style={{ padding: '32px', color: 'var(--c-text-muted)', fontFamily: '"Inter", sans-serif' }}>Loading...</div>
  );
  if (!data) return (
    <div style={{ padding: '32px', color: '#f87171' }}>Product not found.</div>
  );

  const { product } = data;

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 56px)',
        background: 'var(--c-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>

        {/* Back link */}
        <button
          onClick={() => navigate(`/products/${slug}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--c-text-muted)', cursor: 'pointer', marginBottom: '24px', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--c-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--c-text-muted)'}
        >
          <ArrowLeft size={15} /> Back to {product.name}
        </button>

        {/* Card */}
        <div
          style={{
            background: 'var(--c-surface)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-modal)',
            border: '1px solid var(--c-border)',
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '20px 24px',
              borderBottom: '1px solid var(--c-border-soft)',
            }}
          >
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-container) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CloudUpload size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <h1
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--c-text)', letterSpacing: '-0.02em' }}
              >
                Upload Wizard
              </h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                Stage your technical assets for the next production cycle.
              </p>
            </div>
          </div>

          {/* Wizard body */}
          <div style={{ padding: '24px' }}>
            <UploadWizard
              product={product}
              onSuccess={() => {
                setTimeout(() => navigate(`/products/${slug}`), 1500);
              }}
              onClose={() => navigate(`/products/${slug}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
