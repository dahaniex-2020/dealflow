import React, { useState, useEffect } from 'react';
import { Users, Briefcase, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from './db/schema';

const Dashboard = () => {
  const [stats, setStats] = useState({ clients: 0, deals: 0, revenue: 0, expenses: 0, profit: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const clientCount = await db.clients.count();
      const dealCount = await db.deals.count();
      
      const allDeals = await db.deals.toArray();
      const totalRevenue = allDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
      
      const allExpenses = await db.expenses.toArray();
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

      const netProfit = totalRevenue - totalExpenses;

      setStats({ clients: clientCount, deals: dealCount, revenue: totalRevenue, expenses: totalExpenses, profit: netProfit });
    };
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 }, { name: 'Apr', revenue: 4500 },
    { name: 'May', revenue: 6000 }, { name: 'Jun', revenue: 5500 },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-800">Welcome back! 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here is your business overview.</p>
        </div>
      </div>

      {/* Mobile par 1 column, tablet par 2, desktop par 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Clients</p>
            <h3 className="text-xl font-bold text-gray-800 mt-2">{stats.clients}</h3>
          </div>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={18} /></div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500">Active Deals</p>
            <h3 className="text-xl font-bold text-gray-800 mt-2">{stats.deals}</h3>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase size={18} /></div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Revenue</p>
            <h3 className="text-xl font-bold text-green-600 mt-2">${stats.revenue.toLocaleString()}</h3>
          </div>
          <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={18} /></div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500">Total Expenses</p>
            <h3 className="text-xl font-bold text-red-500 mt-2">${stats.expenses.toLocaleString()}</h3>
          </div>
          <div className="p-2 bg-red-50 text-red-600 rounded-lg"><TrendingDown size={18} /></div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-500">Net Profit</p>
            <h3 className="text-xl font-bold text-blue-600 mt-2">${stats.profit.toLocaleString()}</h3>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={18} /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 md:mb-6">Revenue Overview</h2>
        <div className="h-60 md:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} tick={{fontSize: 12}} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;