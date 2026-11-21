import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from './db/schema';
import { Trash2, Plus, Search } from 'lucide-react';
import { db as firestore } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const Clients = () => {
  const { isProUser } = useOutletContext();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', company: '' });
  const [userId, setUserId] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return;

    setUserId(user.uid);
    let unsubscribe;

    const initData = async () => {
      if (isProUser) {
        const q = query(
          collection(firestore, "clients"),
          where("userId", "==", user.uid)
        );

        const cloudSnapshot = await getDocs(q);

        if (cloudSnapshot.empty) {
          setIsMigrating(true);

          const localData = await db.clients.toArray();

          if (localData.length > 0) {
            for (const item of localData) {
              await addDoc(collection(firestore, "clients"), {
                name: item.name,
                email: item.email,
                company: item.company,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });
            }

            await db.clients.clear();
          }

          setIsMigrating(false);
        }

        unsubscribe = onSnapshot(q, (snapshot) => {
          const clientsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setClients(clientsData);
        });
      } else {
        loadLocalClients();
      }
    };

    initData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isProUser]);

  const loadLocalClients = async () => {
    const localData = await db.clients.toArray();
    setClients(localData);
  };

  // 🔍 Search by Name, Email or Company
  const filteredClients = clients.filter((c) => {
    const search = searchTerm.trim().toLowerCase();

    return (
      (c.name || '').toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search) ||
      (c.company || '').toLowerCase().includes(search)
    );
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !userId) return;

    try {
      if (isProUser) {
        await addDoc(collection(firestore, "clients"), {
          ...form,
          userId: userId,
          createdAt: new Date().toISOString()
        });
      } else {
        await db.clients.add(form);
        loadLocalClients();
      }

      setForm({ name: '', email: '', company: '' });
    } catch (error) {
      console.error("Error adding client: ", error);
      alert("Failed to add client.");
    }
  };

  const handleDelete = async (id) => {
    try {
      if (isProUser) {
        await deleteDoc(doc(firestore, "clients", id));
      } else {
        await db.clients.delete(id);
        loadLocalClients();
      }
    } catch (error) {
      console.error("Error deleting client: ", error);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>

        {isProUser ? (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            ☁️ Cloud Sync Active
          </span>
        ) : (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
            💾 Local Storage
          </span>
        )}
      </div>

      {isMigrating && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm font-medium animate-pulse">
          Syncing your local data to the cloud. Please wait...
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input
            type="text"
            placeholder="Client Name *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={e => setForm({ ...form, company: e.target.value })}
            className="w-full md:flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            type="submit"
            className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Client
          </button>
        </form>
      </div>

      {/* 🔍 Client Search */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-3 text-gray-400"
        />

        <input
          type="text"
          placeholder="Search clients by name, email or company..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        />
      </div>

      {/* Desktop Table */}
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
            {filteredClients.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{c.name}</td>
                <td className="p-4 text-gray-600">{c.email}</td>
                <td className="p-4 text-gray-600">{c.company}</td>

                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {filteredClients.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No matching clients found.' : 'No clients found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredClients.map(c => (
          <div
            key={c.id}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start"
          >
            <div>
              <h3 className="font-bold text-gray-800">{c.name}</h3>
              <p className="text-sm text-gray-500">{c.email}</p>
              <p className="text-sm text-gray-500">{c.company}</p>
            </div>

            <button
              onClick={() => handleDelete(c.id)}
              className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            {searchTerm ? 'No matching clients found.' : 'No clients found.'}
          </p>
        )}
      </div>

    </div>
  );
};

export default Clients;