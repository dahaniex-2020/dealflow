import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, getDeals } from './db/queries';
import { ArrowLeft, Briefcase, FileText, CheckCircle, Clock } from 'lucide-react';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    async function load() {
      const c = await getClient(Number(id));
      const d = await getDeals();
      // Sirf is client ki deals filter karein
      const clientDeals = d.filter(deal => deal.clientId === Number(id));
      setClient(c);
      setDeals(clientDeals);
    }
    load();
  }, [id]);

  const getSymbol = (curr) => {
    const symbols = { PKR: 'Rs', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', AED: 'AED', SAR: 'SAR', INR: '₹' };
    return symbols[curr] || 'Rs';
  };

  if (!client) return <div className="p-4 text-center dark:text-white">Loading...</div>;

  // Calculate Totals by Currency
  const totals = deals.reduce((acc, deal) => {
    const curr = deal.currency || 'PKR';
    if (!acc[curr]) acc[curr] = { billed: 0, paid: 0, pending: 0 };
    
    acc[curr].billed += (deal.amount || 0);
    if (deal.status === 'paid' || deal.status === 'completed') {
      acc[curr].paid += (deal.amount || 0);
    } else {
      acc[curr].pending += (deal.amount || 0);
    }
    return acc;
  }, {});

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/clients')} className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{client.name}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{client.email || 'No email'} • {client.phone || 'No phone'}</p>
        </div>
      </div>

      {/* Financial Summary by Currency */}
      <div className="mb-6 space-y-3">
        {Object.keys(totals).map(curr => (
          <div key={curr} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">{curr} Summary</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Billed</div>
                <div className="font-bold text-slate-800 dark:text-white text-sm">{getSymbol(curr)} {totals[curr].billed}</div>
              </div>
              <div className="border-l border-slate-100 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Paid</div>
                <div className="font-bold text-green-600 dark:text-green-400 text-sm">{getSymbol(curr)} {totals[curr].paid}</div>
              </div>
              <div className="border-l border-slate-100 dark:border-slate-700">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">Pending</div>
                <div className="font-bold text-orange-500 dark:text-orange-400 text-sm">{getSymbol(curr)} {totals[curr].pending}</div>
              </div>
            </div>
          </div>
        ))}
        {Object.keys(totals).length === 0 && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
            No financial data for this client yet.
          </div>
        )}
      </div>

      <h2 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Briefcase size={16}/> Project History</h2>
      
      {/* Deal History List */}
      <div className="space-y-3">
        {deals.map(deal => {
          const isPaid = deal.status === 'paid' || deal.status === 'completed';
          
          return (
            <div key={deal.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{deal.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {isPaid ? (
                    <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold"><CheckCircle size={10}/> PAID</span>
                  ) : (
                    <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold"><Clock size={10}/> UNPAID</span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">INV-{deal.id}</span>
                </div>
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-200">
                {getSymbol(deal.currency || 'PKR')} {deal.amount}
              </div>
            </div>
          );
        })}
        {deals.length === 0 && (
          <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <FileText size={30} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No history found for this client.</p>
          </div>
        )}
      </div>
    </div>
  );
}