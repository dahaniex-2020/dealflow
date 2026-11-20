import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom'; // 👈 Pro status ke liye
import { db } from './db/schema'; 
import { Plus, Trash2, Receipt } from 'lucide-react';
// Firebase imports
import { db as firestore } from './firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const Expenses = () => {
  const { isProUser } = useOutletContext(); // 👈 Layout se Pro status lein
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Software' });
  const [userId, setUserId] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    setUserId(user.uid);
    let unsubscribeExpenses;

    const initData = async () => {
      if (isProUser) {
        // Cloud Sync aur Migration
        const qExpenses = query(collection(firestore, "expenses"), where("userId", "==", user.uid));
        const expSnapshot = await getDocs(qExpenses);
        
        if (expSnapshot.empty) {
          setIsMigrating(true);
          const localExpenses = await db.expenses.toArray();
          if (localExpenses.length > 0) {
            for (const item of localExpenses) {
              await addDoc(collection(firestore, "expenses"), {
                ...item,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });
            }
            await db.expenses.clear(); // Local clear
          }
          setIsMigrating(false);
        }

        unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
          setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

      } else {
        loadLocalExpenses();
      }
    };

    initData();

    return () => {
      if (unsubscribeExpenses) unsubscribeExpenses();
    };
  }, [isProUser]);

  const loadLocalExpenses = async () => {
    setExpenses(await db.expenses.toArray());
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    
    const newExpense = { 
      ...form, 
      amount: Number(form.amount), 
      date: new Date().toISOString().split('T')[0] 
    };

    try {
      if (isProUser) {
        // Cloud mein save karein
        await addDoc(collection(firestore, "expenses"), {
          ...newExpense, 
          userId: userId, 
          createdAt: new Date().toISOString()
        });
      } else {
        // Local mein save karein
        await db.expenses.add(newExpense);
        loadLocalExpenses();
      }
      setForm({ title: '', amount: '', category: 'Software' });
    } catch (error) {
      console.error("Error adding expense: ", error);
      alert("Failed to add expense.");
    }
  };

  const handleDelete = async (id) => {
    try {
      if (isProUser) {
        await deleteDoc(doc(firestore, "expenses", id));
      } else {
        await db.expenses.delete(id);
        loadLocalExpenses();
      }
    } catch (error) {
      console.error("Error deleting expense: ", error);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Receipt className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
        </div>
        {isProUser ? (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">☁️ Cloud Sync</span>
        ) : (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">💾 Local</span>
        )}
      </div>

      {isMigrating && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm font-medium animate-pulse">
          Syncing your local expenses to the cloud. Please wait...
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 md:gap-4 items-end">
          <div className="w-full md:flex-1">
            <label className="block text-sm text-gray-600 mb-1">Expense Title</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" required />
          </div>
          <div className="w-full md:flex-1">
            <label className="block text-sm text-gray-600 mb-1">Amount ($)</label>
            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none" required />
          </div>
          <div className="w-full md:flex-1">
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none bg-white">
              <option value="Software">Software</option>
              <option value="Marketing">Marketing</option>
              <option value="Travel">Travel</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 h-[42px]">
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">Date</th>
              <th className="p-4 font-medium text-gray-600">Title</th>
              <th className="p-4 font-medium text-gray-600">Category</th>
              <th className="p-4 font-medium text-gray-600">Amount</th>
              <th className="p-4 font-medium text-gray-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 text-gray-600">{exp.date}</td>
                <td className="p-4 font-medium text-gray-800">{exp.title}</td>
                <td className="p-4 text-gray-600"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">{exp.category}</span></td>
                <td className="p-4 font-bold text-red-500">-${exp.amount}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {expenses.map(exp => (
          <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{exp.date}</span>
              <span className="font-bold text-red-500 text-lg">-${exp.amount}</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-bold text-gray-800">{exp.title}</h3>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] mt-1 inline-block">{exp.category}</span>
              </div>
              <button onClick={() => handleDelete(exp.id)} className="text-red-500 bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-center text-gray-500 py-4">No expenses found.</p>}
      </div>
    </div>
  );
};
export default Expenses;