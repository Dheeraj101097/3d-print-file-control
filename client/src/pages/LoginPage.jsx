import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation, useRegisterMutation } from '../features/auth/authApi.js';
import { setCredentials } from '../features/auth/authSlice.js';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();
  const isLoading = isLoggingIn || isRegistering;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = isRegister
        ? await register(form).unwrap()
        : await login({ email: form.email, password: form.password }).unwrap();
      dispatch(setCredentials(result));
      navigate('/');
    } catch (err) {
      toast.error(err.data?.message || (isRegister ? 'Registration failed' : 'Login failed'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">PrintVCS</h1>
          <p className="text-sm text-gray-500 mt-1">
            Version control for 3D printing assets
          </p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-1.5 text-sm rounded-md transition ${!isRegister ? 'bg-white shadow font-medium' : 'text-gray-500'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-1.5 text-sm rounded-md transition ${isRegister ? 'bg-white shadow font-medium' : 'text-gray-500'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Display name"
              required
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
