import { useState } from 'react';
import { useOutletContext } from 'react-router-dom'; 
import { generateProposal } from './utils/pdf';
import { db } from './db/schema'; 
import { ArrowRight, FileText, User, ChevronDown, Search, CreditCard } from 'lucide-react';
import { db as firestore } from './firebase'; 
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function Proposals() {
  const { isProUser } = useOutletContext(); 
  
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');
  
  const [currency, setCurrency] = useState('USD');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('PayPal');
  const [cryptoNetwork, setCryptoNetwork] = useState(''); 
  const [otherPaymentDetails, setOtherPaymentDetails] = useState('');

  const currencies = [
    { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
    { code: 'AED', symbol: 'AED' }, { code: 'SAR', symbol: 'SAR' }, { code: 'PKR', symbol: 'Rs' },
    { code: 'INR', symbol: '₹' }, { code: 'CAD', symbol: 'C$' }, { code: 'AUD', symbol: 'A$' },
    { code: 'JPY', symbol: '¥' }, { code: 'CNY', symbol: '¥' }, { code: 'CHF', symbol: 'CHF' },
    { code: 'HKD', symbol: 'HK$' }, { code: 'NZD', symbol: 'NZ$' }, { code: 'SEK', symbol: 'kr' },
    { code: 'KRW', symbol: '₩' }, { code: 'SGD', symbol: 'S$' }, { code: 'NOK', symbol: 'kr' },
    { code: 'MXN', symbol: 'Mex$' }, { code: 'TWD', symbol: 'NT$' }, { code: 'ZAR', symbol: 'R' },
    { code: 'BRL', symbol: 'R$' }, { code: 'DKK', symbol: 'kr' }, { code: 'PLN', symbol: 'zł' },
    { code: 'THB', symbol: '฿' }, { code: 'IDR', symbol: 'Rp' }, { code: 'HUF', symbol: 'Ft' },
    { code: 'CZK', symbol: 'Kč' }, { code: 'ILS', symbol: '₪' }, { code: 'CLP', symbol: 'CLP$' },
    { code: 'PHP', symbol: '₱' }, { code: 'MYR', symbol: 'RM' }, { code: 'RON', symbol: 'lei' },
    { code: 'TRY', symbol: '₺' }, { code: 'RUB', symbol: '₽' }, { code: 'ARS', symbol: 'AR$' },
    { code: 'COP', symbol: 'COL$' }, { code: 'EGP', symbol: 'E£' }, { code: 'KWD', symbol: 'KD' },
    { code: 'QAR', symbol: 'QR' }, { code: 'OMR', symbol: 'OMR' }, { code: 'BHD', symbol: 'BD' },
    { code: 'JOD', symbol: 'JD' }, { code: 'NGN', symbol: '₦' }, { code: 'KES', symbol: 'KSh' },
    { code: 'BDT', symbol: '৳' }, { code: 'LKR', symbol: 'Rs' }, { code: 'NPR', symbol: 'Rs' },
    { code: 'VND', symbol: '₫' }, { code: 'UAH', symbol: '₴' }, { code: 'KZT', symbol: '₸' },
    { code: 'IQD', symbol: 'IQD' }, { code: 'MAD', symbol: 'MAD' }, { code: 'TND', symbol: 'TND' },
    { code: 'DZD', symbol: 'DA' }, { code: 'AFN', symbol: '؋' }, { code: 'IRR', symbol: '﷼' },
    { code: 'XAU', symbol: 'Gold' }, { code: 'XAG', symbol: 'Silver' } 
  ];

  const usdtNetworks = ['TRC20', 'ERC20', 'BEP20'];

  const filteredCurrencies = currencies.filter(c => 
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) || 
    c.symbol.toLowerCase().includes(currencySearch.toLowerCase())
  );

  
  const handleGenerate = async () => {
    if (!clientName || !projectTitle || !amount) {
      alert("Please enter Client Name, Project Title and Amount!");
      return;
    }

    if (paymentMethod === 'Crypto' && !cryptoNetwork) {
      alert("Please select a Crypto Network!");
      return;
    }

    let finalPaymentInfo = '';
    let profile = null;

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (isProUser && user) {
        // Fetch existing Settings profile
        const settingsRef = doc(firestore, "settings", user.uid);
        const settingsSnap = await getDoc(settingsRef);

        // Fetch payment details separately
        const paymentRef = doc(firestore, "payment_details", user.uid);
        const paymentSnap = await getDoc(paymentRef);

        const settingsData = settingsSnap.exists()
          ? settingsSnap.data()
          : {};

        const paymentData = paymentSnap.exists()
          ? paymentSnap.data()
          : {};

        // Merge both Firebase sources
        profile = { ...settingsData, ...paymentData };
      } else {
        // Existing Local profile support
        const profileData = await db.settings.get('company_profile');
        profile = profileData || null;
      }
    } catch (error) {
      console.log("Error fetching profile data:", error);
    }

    if (paymentMethod === 'Crypto') {
      let selectedWallet = '';

      if (cryptoNetwork === 'USDT (TRC20)') {
        selectedWallet = profile?.usdtTrc20 || '';
      } else if (cryptoNetwork === 'USDT (BEP20)') {
        selectedWallet = profile?.usdtBep20 || '';
      } else if (cryptoNetwork === 'USDT (ERC20)') {
        selectedWallet = profile?.usdtErc20 || '';
      } else if (cryptoNetwork === 'Bitcoin Mainnet') {
        selectedWallet = profile?.btcAddress || '';
      }

      if (!selectedWallet.trim()) {
        alert(
          "❌ Wallet Address Missing!\n\n" +
          "Your selected Crypto Network wallet address was not found.\n\n" +
          "Please add the correct wallet address in Settings > Payment Accounts > Crypto."
        );
        return;
      }

      finalPaymentInfo = cryptoNetwork;
    } else if (paymentMethod === 'Other') {
      if (!otherPaymentDetails) {
        alert("Please enter details for 'Other' payment method!");
        return;
      }

      finalPaymentInfo = `Other: ${otherPaymentDetails}`;
    } else {
      finalPaymentInfo = paymentMethod;
    }

    generateProposal(
      clientName,
      projectTitle,
      details,
      amount,
      currency,
      finalPaymentInfo
    );
  };


  const getSymbol = (currCode) => {
    const found = currencies.find(c => c.code === currCode);
    return found ? found.symbol : currCode;
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors">
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
            <FileText size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Proposal</h1>
        </div>
        {isProUser ? (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">☁️ Cloud Sync</span>
        ) : (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">💾 Local</span>
        )}
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm mb-6">
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Client Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Enter client name manually..." 
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={clientName} 
              onChange={(e) => setClientName(e.target.value)} 
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Project Title <span className="text-red-500">*</span>
          </label>
          <input type="text" placeholder="e.g. Website Redesign" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Project Details
          </label>
          <textarea placeholder="Describe the scope of work, deliverables, and terms..." className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" value={details} onChange={(e) => setDetails(e.target.value)}></textarea>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Total Budget <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            
            <div className="w-1/3 relative">
              <button 
                type="button" 
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)} 
                className="w-full h-full flex items-center justify-between px-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>{currency} ({getSymbol(currency)})</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isCurrencyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCurrencyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[150px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 bg-slate-50 dark:bg-slate-900">
                    <Search size={14} className="text-slate-400 ml-1" />
                    <input 
                      type="text" 
                      placeholder="Search Currency..." 
                      className="w-full bg-transparent border-none focus:outline-none text-sm text-slate-800 dark:text-white" 
                      value={currencySearch} 
                      onChange={(e) => setCurrencySearch(e.target.value)} 
                      autoFocus 
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCurrencies.map(c => (
                      <button 
                        type="button" 
                        key={c.code} 
                        onClick={() => { setCurrency(c.code); setIsCurrencyDropdownOpen(false); setCurrencySearch(''); }} 
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-slate-700 ${currency === c.code ? 'bg-blue-50 dark:bg-slate-700 font-bold text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        <span className="font-bold">{c.code}</span> <span className="text-slate-400">({c.symbol})</span>
                      </button>
                    ))}
                    {filteredCurrencies.length === 0 && <div className="p-3 text-center text-xs text-slate-500">No currency found.</div>}
                  </div>
                </div>
              )}
            </div>

            <input type="number" placeholder="e.g. 5000" className="w-2/3 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>

        <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <CreditCard size={16} className="text-blue-500"/> Payment Method
          </label>
          <select 
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="PayPal">PayPal</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Zelle">Zelle</option>
            <option value="Wise">Wise</option>
            <option value="Payoneer">Payoneer</option>
            <option value="Credit/Debit Card">Credit/Debit Card</option>
            <option value="Crypto">Crypto (USDT/Bitcoin)</option>
            <option value="Other">Other</option>
          </select>

          {paymentMethod === 'Crypto' && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Crypto Network</label>
              <select 
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" 
                value={cryptoNetwork} 
                onChange={(e) => setCryptoNetwork(e.target.value)}
                required
              >
                <option value="">Select Network</option>
                {usdtNetworks.map(n => <option key={n} value={`USDT (${n})`}>USDT ({n})</option>)}
                <option value="Bitcoin Mainnet">Bitcoin (Mainnet)</option>
              </select>
            </div>
          )}

          {paymentMethod === 'Other' && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Specify Details</label>
              <input 
                type="text" 
                placeholder="E.g. Skrill, Cash, etc..." 
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={otherPaymentDetails} 
                onChange={(e) => setOtherPaymentDetails(e.target.value)} 
              />
            </div>
          )}
        </div>

        <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-base shadow-sm transition-colors">
          Generate Proposal PDF <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}