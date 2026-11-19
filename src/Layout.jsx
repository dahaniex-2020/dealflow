import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, FileText, FileSignature, Receipt, 
  Settings as SettingsIcon, LogOut, Moon, Menu, X 
} from 'lucide-react';

const Layout = ({ isProUser, setIsProUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
    window.location.reload();
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Clients', path: '/clients', icon: <Users size={20} /> },
    { name: 'Deals', path: '/deals', icon: <Briefcase size={20} /> },
    { name: 'Invoices', path: '/invoices', icon: <FileText size={20} /> },
    { name: 'Proposals', path: '/proposals', icon: <FileSignature size={20} /> },
    { name: 'Expenses', path: '/expenses', icon: <Receipt size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1 rounded font-bold">D</div>
          <h1 className="text-xl font-bold text-gray-800">DealFlow</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 bg-white h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 text-white p-1 rounded font-bold">D</div>
                <h1 className="text-xl font-bold text-gray-800">DealFlow</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600">
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 text-white p-1 rounded font-bold text-sm">D</div>
              <h1 className="text-lg font-bold text-gray-800">DealFlow</h1>
            </div>
          </div>

          <div className="hidden md:block"></div>
          
          <div className="flex items-center space-x-3 md:space-x-4">
            <button className="text-gray-500 hover:text-gray-700 hidden sm:block">
              <Moon size={20} />
            </button>
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <SettingsIcon size={20} />
            </Link>
            <button 
              onClick={handleLogout} 
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ isProUser, setIsProUser }} /> 
        </main>
      </div>
    </div>
  );
};

export default Layout;