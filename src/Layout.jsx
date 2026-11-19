import React, { useState, useEffect } from 'react'; // useEffect add kiya gaya hai
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, FileText, FileSignature, Receipt, 
  Settings as SettingsIcon, LogOut, Moon, Sun, Menu, X // Sun icon add kiya gaya hai
} from 'lucide-react';

const Layout = ({ isProUser, setIsProUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 👇 Dark Mode ki state aur logic (Naya code)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Page load hote hi check karega ke pehle se dark mode on hai ya nahi
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  // 👆 Dark mode ka naya code khatam

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
    // 👇 Yahan dark mode ke liye classes add ki hain (dark:bg-gray-900)
    <div className="flex h-screen bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300">
      
      {/* Sidebar for Desktop */}
      {/* 👇 dark:bg-gray-800 aur dark:border-gray-700 add kiya */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-full transition-colors duration-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1 rounded font-bold">D</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">DealFlow</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
          <aside className="w-64 bg-white dark:bg-gray-800 h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 text-white p-1 rounded font-bold">D</div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">DealFlow</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="dark:text-white"><X size={24} /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
        
        {/* 👇 Header mein dark mode classes add ki hain */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 md:px-6 transition-colors duration-300">
          <div className="flex items-center space-x-3 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-600 dark:text-gray-300">
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 text-white p-1 rounded font-bold text-sm">D</div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white">DealFlow</h1>
            </div>
          </div>

          <div className="hidden md:block"></div>
          
          <div className="flex items-center space-x-3 md:space-x-4">
            
            {/* 👇 Dark Mode Button update kiya gaya hai */}
            <button 
              onClick={toggleDarkMode} 
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hidden sm:block transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link to="/settings" className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors">
              <SettingsIcon size={20} />
            </Link>
            <button 
              onClick={handleLogout} 
              className="flex items-center space-x-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* 👇 Main content area mein bhi dark background add kiya hai */}
        <main className="flex-1 overflow-y-auto dark:bg-gray-900 transition-colors duration-300">
          <Outlet context={{ isProUser, setIsProUser }} /> 
        </main>
      </div>
    </div>
  );
};

export default Layout;