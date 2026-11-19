import React, { useState, useEffect } from 'react';
import { db } from './db/schema'; 
import { Plus, Trash2, Receipt } from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Software' });

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => setExpenses(await db.expenses.toArray());

  const handleAdd = async (e) => {
    e.preventDefault();
    await db.expenses.add({ ...form, amount: Number(form.amount), date: new Date().toISOString().split('T')[0] });
    setForm({ title: '', amount: '', category: 'Software' });
    loadExpenses();
  };

  const handleDelete = async (id) => {
    await db.expenses.delete(id);
    loadExpenses();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <Receipt className="text-blue-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
      </div>

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