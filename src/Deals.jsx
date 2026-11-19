import React, { useState, useEffect } from 'react';
import { db } from './db/schema'; 
import { Trash2, Plus } from 'lucide-react';

const Deals = () => {
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  
  const [form, setForm] = useState({ 
    title: '', 
    clientId: '', 
    value: '', 
    stage: 'New', 
    paymentMethod: 'PayPal', 
    cryptoNetwork: '' 
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setDeals(await db.deals.toArray());
    setClients(await db.clients.toArray());
  };

  const handleMethodChange = (e) => {
    setForm({ ...form, paymentMethod: e.target.value, cryptoNetwork: '' });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    
    // 1. Crypto Network check
    if ((form.paymentMethod === 'USDT' || form.paymentMethod === 'Bitcoin') && !form.cryptoNetwork) {
      return alert("Please select a crypto network!");
    }

    // 2. Settings se data check karein
    try {
      const savedPaymentData = await db.payment_details.get('main_payment');
      
      if (!savedPaymentData) {
        return alert("⚠️ Notification: You haven't saved any Payment Method in Settings yet. Please go to Settings > Payment Accounts and save your details first.");
      }

      // Har payment method ke liye alag check
      if (form.paymentMethod === 'PayPal' && !savedPaymentData.paypalUSD) {
        return alert("⚠️ Notification: Your PayPal (USD) details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      if (form.paymentMethod === 'Zelle' && !savedPaymentData.zelleDetails) {
        return alert("⚠️ Notification: Your Zelle details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      if (form.paymentMethod === 'Wise' && !savedPaymentData.wiseDetails) {
        return alert("⚠️ Notification: Your Wise details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      if (form.paymentMethod === 'Payoneer' && !savedPaymentData.payoneerDetails) {
        return alert("⚠️ Notification: Your Payoneer details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      if (form.paymentMethod === 'Bank Transfer' && !savedPaymentData.bankDetails) {
        return alert("⚠️ Notification: Your Bank Account details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      if (form.paymentMethod === 'Credit Card' && !savedPaymentData.cardNumber) {
        return alert("⚠️ Notification: Your Credit Card details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      
      // USDT Check
      if (form.paymentMethod === 'USDT') {
        if (!savedPaymentData.usdtTrc20 && !savedPaymentData.usdtBep20 && !savedPaymentData.usdtErc20) {
          return alert("⚠️ Notification: Your USDT Wallet Address is not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
        }
      }
      
      // Bitcoin Check
      if (form.paymentMethod === 'Bitcoin' && !savedPaymentData.btcAddress) {
        return alert("⚠️ Notification: Your Bitcoin Wallet Address is not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }
      
      // Other Check
      if (form.paymentMethod === 'Other' && !savedPaymentData.bankDetails) {
        return alert("⚠️ Notification: Your 'Other' payment details are not saved in Settings. Please go to Settings > Payment Accounts and save your details first.");
      }

    } catch (error) {
      console.log("Validation error:", error);
      return alert("System Error while checking payment methods.");
    }

    // Agar sab theek hai, toh Deal aur Invoice save karein
    let finalPaymentMethod = form.paymentMethod;
    if (form.cryptoNetwork) {
      finalPaymentMethod = `${form.paymentMethod} (${form.cryptoNetwork})`;
    }

    await db.deals.add({ 
      ...form, 
      value: Number(form.value),
      paymentMethod: finalPaymentMethod
    });

    await db.invoices.add({
      clientId: form.clientId,
      amount: Number(form.value),
      status: 'Unpaid',
      dealTitle: form.title, 
      paymentMethod: finalPaymentMethod, 
      date: new Date().toISOString().split('T')[0]
    });

    setForm({ title: '', clientId: '', value: '', stage: 'New', paymentMethod: 'PayPal', cryptoNetwork: '' });
    loadData();
    alert("✅ Deal Created & Invoice Generated Automatically!");
  };

  const handleDelete = async (id) => {
    await db.deals.delete(id);
    loadData();
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Deals</h1>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3 md:gap-4">
          
          <input type="text" placeholder="Deal Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg outline-none" required />
          
          <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg outline-none bg-white" required>
            <option value="">Select Client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input type="number" placeholder="Value ($)" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg outline-none" required />
          
          {/* 👈 Yahan se Cash Remove kar diya gaya hai */}
          <select value={form.paymentMethod} onChange={handleMethodChange} className="w-full md:flex-1 px-3 py-2 border rounded-lg outline-none bg-white">
            <option value="PayPal">PayPal</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Zelle">Zelle</option>
            <option value="Wise">Wise</option>
            <option value="Payoneer">Payoneer</option>
            <option value="USDT">USDT</option>
            <option value="Bitcoin">Bitcoin</option>
            <option value="Other">Other</option>
          </select>

          {(form.paymentMethod === 'USDT' || form.paymentMethod === 'Bitcoin') && (
            <select value={form.cryptoNetwork} onChange={e => setForm({...form, cryptoNetwork: e.target.value})} className="w-full md:flex-1 px-3 py-2 border rounded-lg outline-none bg-blue-50 border-blue-300 text-blue-800" required>
              <option value="">Select Network</option>
              {form.paymentMethod === 'USDT' ? (
                <>
                  <option value="TRC20">TRC20</option>
                  <option value="BEP20">BEP20</option>
                  <option value="ERC20">ERC20</option>
                </>
              ) : (
                <option value="Mainnet">Mainnet</option>
              )}
            </select>
          )}
          
          <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
            <Plus size={18} /> Add Deal
          </button>
        </form>
      </div>

      {/* Table for Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">Deal Title</th>
              <th className="p-4 font-medium text-gray-600">Client</th>
              <th className="p-4 font-medium text-gray-600">Value</th>
              <th className="p-4 font-medium text-gray-600">Payment Method</th>
              <th className="p-4 font-medium text-gray-600 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {deals.map(d => {
              const clientName = clients.find(c => c.id === Number(d.clientId))?.name || 'Unknown';
              return (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{d.title}</td>
                  <td className="p-4 text-gray-600">{clientName}</td>
                  <td className="p-4 font-bold text-green-600">${d.value}</td>
                  <td className="p-4 text-gray-600"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{d.paymentMethod || 'N/A'}</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards for Mobile */}
      <div className="md:hidden space-y-3">
        {deals.map(d => {
          const clientName = clients.find(c => c.id === Number(d.clientId))?.name || 'Unknown';
          return (
            <div key={d.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{d.title}</h3>
                  <p className="text-sm text-gray-500">{clientName}</p>
                </div>
                <button onClick={() => handleDelete(d.id)} className="text-red-500 bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <span className="font-bold text-green-600">${d.value}</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{d.paymentMethod || 'N/A'}</span>
              </div>
            </div>
          );
        })}
        {deals.length === 0 && <p className="text-center text-gray-500 py-4">No deals found.</p>}
      </div>
    </div>
  );
};
export default Deals;