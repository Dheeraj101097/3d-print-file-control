import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Printer, LogOut, User } from 'lucide-react';
import { logout, selectCurrentUser } from '../features/auth/authSlice.js';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600">
          <Box size={18} className="text-blue-600" />
          PrintVCS
        </Link>
        <Link to="/settings/printer-profiles"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <Printer size={14} /> Printers
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <User size={13} />
          <span>{user?.displayName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500"
        >
          <LogOut size={13} /> Logout
        </button>
      </div>
    </nav>
  );
}
