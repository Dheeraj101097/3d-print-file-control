import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { useGetProductQuery } from '../features/products/productsApi.js';
import UploadWizard from '../components/UploadWizard/UploadWizard.jsx';

export default function UploadPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetProductQuery(slug);

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!data) return <div className="p-8 text-red-500">Product not found.</div>;

  const { product } = data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/products/${slug}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={15} /> Back to {product.name}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Upload size={22} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload File</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Add a new or updated 3D print file to <strong>{product.name}</strong>
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <UploadWizard
          product={product}
          onSuccess={() => {
            setTimeout(() => navigate(`/products/${slug}`), 1500);
          }}
        />
      </div>
    </div>
  );
}
