import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestore } from './firebase'; 

// Saare Pages Import
import Login from './Login';
import Settings from './Settings';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Clients from './Clients';
import Deals from './Deals';
import Proposals from './Proposals';
import Invoices from './Invoices'; // 👈 Naya
import Expenses from './Expenses'; // 👈 Naya

function App() {
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('isLoggedIn'));

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const docRef = doc(firestore, "pro_users", "test_client_1"); 
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (new Date() < new Date(data.expiresAt) && data.isPro === true) {
            setIsProUser(true);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    checkUserStatus();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center text-xl font-bold text-blue-600">Loading DealFlow...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        
        {/* Protected Routes */}
        <Route element={isLoggedIn ? <Layout isProUser={isProUser} setIsProUser={setIsProUser} /> : <Navigate to="/login" />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/invoices" element={<Invoices />} /> {/* 👈 Naya Route */}
          <Route path="/expenses" element={<Expenses />} /> {/* 👈 Naya Route */}
          <Route path="/settings" element={<Settings />} />
          
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;