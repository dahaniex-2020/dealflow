import React, { useState, useEffect } from 'react';
import { db } from './db/schema'; 
import { Trash2, Plus } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', company: '' });

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => setClients(await db.clients.toArray());

  const handleAdd = async (e) => {
    e.preventDefault();
    if(!form.name) return;
    await db.clients.add(form);
    setForm({ name: '', email: '', company: '' });
    loadClients();
  };

  const handleDelete = async (id) => {
    await db.clients.delete(id);
    loadClients();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Clients</h1>

      {/* Add Form - Mobile par vertically stack hoga */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input type="text" placeholder="Client Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" placeholder="Company" value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"><Plus size={18} /> Add Client</button>
        </form>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">Name</th>
              <th className="p-4 font-medium text-gray-600">Email</th>
              <th className="p-4 font-medium text-gray-600">Company</th>
              <th className="p-4 font-medium text-gray-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{c.name}</td>
                <td className="p-4 text-gray-600">{c.email}</td>
                <td className="p-4 text-gray-600">{c.company}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {clients.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800">{c.name}</h3>
              <p className="text-sm text-gray-500">{c.email}</p>
              <p className="text-sm text-gray-500">{c.company}</p>
            </div>
            <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg"><Trash2 size={18} /></button>
          </div>
        ))}
        {clients.length === 0 && <p className="text-center text-gray-500 py-4">No clients found.</p>}
      </div>
    </div>
  );
};
export default Clients;