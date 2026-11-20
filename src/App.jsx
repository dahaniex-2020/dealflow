import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth"; // 👈 Naya Import
import { db as firestore } from './firebase'; 

// Saare Pages Import
import Login from './Login';
import Settings from './Settings';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Clients from './Clients';
import Deals from './Deals';
import Proposals from './Proposals';
import Invoices from './Invoices'; 
import Expenses from './Expenses'; 

function App() {
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('isLoggedIn'));

  useEffect(() => {
    const auth = getAuth();
    
    // Firebase Auth ki madad se user ka state check karein
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Agar user login hai, toh uski asli UID se Pro status check karein
        try {
          const docRef = doc(firestore, "pro_users", user.uid); // 👈 Yahan asli UID use ho rahi hai
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (new Date() < new Date(data.expiresAt) && data.isPro === true) {
              setIsProUser(true);
            } else {
              setIsProUser(false); // Agar expire ho gaya ho
            }
          } else {
            setIsProUser(false); // Agar document hi na mile
          }
        } catch (error) {
          console.error("Error fetching pro status:", error);
        }
      } else {
        // User login nahi hai
        setIsProUser(false);
        setIsLoggedIn(false);
        localStorage.removeItem('isLoggedIn');
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-xl font-bold text-blue-600">
        Loading DealFlow...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        
        {/* Protected Routes */}
        <Route element={isLoggedIn ? <Layout isProUser={isProUser} setIsProUser={setIsProUser} /> : <Navigate to="/login" />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/invoices" element={<Invoices />} /> 
          <Route path="/expenses" element={<Expenses />} /> 
          <Route path="/settings" element={<Settings />} />
          
          {/* Agar koi galat URL daale toh dashboard par bhej dein */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;