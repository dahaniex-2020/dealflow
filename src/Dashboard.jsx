import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Briefcase, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from './db/schema';
import { db as firestore } from './firebase'; 
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const Dashboard = () => {
  const { isProUser } = useOutletContext();
  const [stats, setStats] = useState({ clients: 0, deals: 0, revenue: 0, expenses: 0, profit: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      let clientCount = 0;
      let dealCount = 0;
      let totalRevenue = 0;
      let totalExpenses = 0;

      try {
        if (isProUser) {
          // 🟢 PRO USER: Cloud se data fetch karein
          const qClients = query(collection(firestore, "clients"), where("userId", "==", user.uid));
          const clientSnap = await getDocs(qClients);
          clientCount = clientSnap.size;

          const qDeals = query(collection(firestore, "deals"), where("userId", "==", user.uid));
          const dealSnap = await getDocs(qDeals);
          dealCount = dealSnap.size;
          dealSnap.forEach(doc => { totalRevenue += Number(doc.data().value || 0); });

          const qExpenses = query(collection(firestore, "expenses"), where("userId", "==", user.uid));
          const expSnap = await getDocs(qExpenses);
          expSnap.forEach(doc => { totalExpenses += Number(doc.data().amount || 0); });

        } else {
          // 🟡 FREE USER: Local se data fetch karein
          clientCount = await db.clients.count();
          dealCount = await db.deals.count();
          
          const allDeals = await db.deals.toArray();
          totalRevenue = allDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
          
          const allExpenses = await db.expenses.toArray();
          totalExpenses = allExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        }

        const netProfit = totalRevenue - totalExpenses;
        setStats({ clients: clientCount, deals: dealCount, revenue: totalRevenue, expenses: totalExpenses, profit: netProfit });

      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      }
    };
    fetchStats();
  }, [isProUser]);

  // Sample Chart Data (Isko bhi baad mein real data se replace kar sakte hain)
  const chartData = [
    { name: 'Jan', revenue: 4000 }, { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 }, { name: 'Apr', revenue: 4500 },
    { name: 'May', revenue: 6000 }, { name: 'Jun', revenue: 5500 },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">Welcome back! 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Here is your business overview.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start transition-colors duration-300">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Clients</p>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-2">{stats.clients}</h3>
          </div>
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><Users size={18} /></div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start transition-colors duration-300">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Deals</p>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-2">{stats.deals}</h3>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Briefcase size={18} /></div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start transition-colors duration-300">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mt-2">${stats.revenue.toLocaleString()}</h3>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><DollarSign size={18} /></div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start transition-colors duration-300">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
            <h3 className="text-xl font-bold text-red-500 dark:text-red-400 mt-2">${stats.expenses.toLocaleString()}</h3>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"><TrendingDown size={18} /></div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start transition-colors duration-300">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Net Profit</p>
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-2">${stats.profit.toLocaleString()}</h3>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><TrendingUp size={18} /></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 md:mb-6">Revenue Overview</h2>
        <div className="h-60 md:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;