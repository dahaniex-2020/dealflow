import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db as firestore } from "./firebase"; 
import { db } from './db/schema';

const Settings = () => {
  const { isProUser, setIsProUser } = useOutletContext();
  const [userId, setUserId] = useState(null);

  // States
  const [profile, setProfile] = useState({ name: "", email: "", businessName: "", logo: "" });
  const [licenseKey, setLicenseKey] = useState("");
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'PayPal', paypalUSD: "", bankDetails: "", zelleDetails: "", wiseDetails: "", payoneerDetails: "",
    cardNumber: "", cardHolder: "", cardExpiry: "", cardCvv: "", usdtTrc20: "", usdtBep20: "", usdtErc20: "", btcAddress: ""
  });
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Data Loading (Cloud for Pro, Local for Free)
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    setUserId(user.uid);

    const loadData = async () => {
      try {
        if (isProUser) {
          const profileRef = doc(firestore, "settings", user.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) setProfile(profileSnap.data());

          const paymentRef = doc(firestore, "payment_details", user.uid);
          const paymentSnap = await getDoc(paymentRef);
          if (paymentSnap.exists()) setPaymentDetails(paymentSnap.data());

        } else {
          const savedProfile = await db.settings.get('company_profile');
          if (savedProfile) setProfile(savedProfile);

          const savedPayment = await db.payment_details.get('main_payment');
          if (savedPayment) {
            const { id, ...restOfData } = savedPayment; 
            setPaymentDetails(prev => ({ ...prev, ...restOfData }));
          }
        }
      } catch (error) {
        console.error("Load Error:", error);
      }
    };
    loadData();
  }, [isProUser]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, logo: reader.result });
      reader.readAsDataURL(file);
    }
  };// Save Functions (Cloud for Pro, Local for Free)
const handleSaveProfile = async (e) => {
  e.preventDefault();
  try {
    if (isProUser && userId) {
      await setDoc(doc(firestore, "settings", userId), profile);
    } else {
      await db.settings.put({ ...profile, id: 'company_profile' });
    }
    setStatusMessage({ type: "success", text: "Profile & Logo saved successfully!" });
    setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
  } catch (error) {
    setStatusMessage({ type: "error", text: "Failed to save profile." });
  }
};

const handleSavePayment = async (e) => {
  e.preventDefault();
  try {
    if (isProUser && userId) {
      await setDoc(doc(firestore, "payment_details", userId), paymentDetails);
    } else {
      const dataToSave = { id: 'main_payment', ...paymentDetails };
      await db.payment_details.put(dataToSave);
    }
    setStatusMessage({ type: "success", text: "Payment details saved permanently!" });
    setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
  } catch (error) {
    console.error("Save Error:", error);
    setStatusMessage({ type: "error", text: "Failed to save payment details." });
  }
};

const handleMethodChange = (e) => setPaymentDetails(prev => ({ ...prev, method: e.target.value }));

// Activation & Migration Logic
const handleActivate = async () => {
  if (!licenseKey) return setStatusMessage({ type: "error", text: "Please enter a license key." });
  setStatusMessage({ type: "info", text: "Verifying License Key..." });

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return setStatusMessage({ type: "error", text: "User not logged in. Please log in again." });

    const formattedKey = licenseKey.trim().toUpperCase();
    const keyRef = doc(firestore, "license_keys", formattedKey);
    const keySnap = await getDoc(keyRef);

    if (!keySnap.exists()) return setStatusMessage({ type: "error", text: "Invalid License Key. Please check your receipt." });
    
    const keyData = keySnap.data();
    if (keyData.isUsed) return setStatusMessage({ type: "error", text: "This license key has already been used." });

    const purchaseDate = new Date(); 
    const expiryDate = new Date(purchaseDate);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // User ko Pro mark karein
    await setDoc(doc(firestore, "pro_users", currentUser.uid), {
      licenseKey: formattedKey, email: currentUser.email || profile.email || "no-email@dealflow.com",
      isPro: true, activatedAt: purchaseDate.toISOString(), expiresAt: expiryDate.toISOString(), status: "active"
    });

    await updateDoc(keyRef, { isUsed: true, usedBy: currentUser.uid });

    // Migration Logic (Local to Cloud)
    setStatusMessage({ type: "info", text: "Migrating your local data to cloud..." });
    const localProfile = await db.settings.get('company_profile');
    const localPayment = await db.payment_details.get('main_payment');

    if (localProfile) {
      const { id, ...profileData } = localProfile;
      await setDoc(doc(firestore, "settings", currentUser.uid), profileData);
    }
    if (localPayment) {
      const { id, ...paymentData } = localPayment;
      await setDoc(doc(firestore, "payment_details", currentUser.uid), paymentData);
    }
    
    setIsProUser(true); 
    setStatusMessage({ type: "success", text: `Congratulations! You are now a Pro user. Your plan will expire on ${expiryDate.toLocaleDateString()}.` });
    
  } catch (error) {
    setStatusMessage({ type: "error", text: "Firebase Error: " + error.message });
  }
};

const handleClearLocalData = async () => {
  if(window.confirm("Are you sure you want to delete all local data? This cannot be undone.")) {
    try {
      await db.clients.clear(); await db.deals.clear(); await db.proposals.clear();
      await db.invoices.clear(); await db.expenses.clear(); await db.settings.clear(); await db.payment_details.clear();
      setStatusMessage({ type: "success", text: "Local data cleared successfully. Please refresh the page." });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to clear local data." });
    }
  }
};  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>

      {statusMessage.text && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 
          statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {statusMessage.text}
        </div>
      )}

      {!isProUser && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">Safety Reminder: Export Your Data</h3>
              <p className="text-sm text-yellow-700">Your data is stored in this browser. Please export a backup file.</p>
            </div>
          </div>
          <button className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Export Now</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xl">👑</span>
          <h2 className="text-lg font-bold">{isProUser ? "Pro Plan Active" : "Upgrade to Pro"}</h2>
        </div>
        
        {isProUser ? (
           <p className="text-sm text-green-600 font-medium">✅ Your account is upgraded. Automatic cloud backup is active.</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">Get automatic cloud backup and multi-device sync for just $20/month.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-3 text-gray-400">🔑</span>
                <input type="text" placeholder="Enter License Key" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <button onClick={handleActivate} className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-medium transition">Activate</button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-xl">👤</span>
          <h2 className="text-lg font-bold">My Profile</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input type="text" value={profile.businessName} onChange={(e) => setProfile({...profile, businessName: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">COMPANY LOGO</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {profile.logo ? (
                <img src={profile.logo} alt="Logo" className="w-12 h-12 rounded-lg object-contain border" />
              ) : (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center border">No Logo</div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">Save Profile</button>
        </form>
      </div>

      {!isProUser && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xl">🛡️</span>
            <h2 className="text-lg font-bold">Data Backup & Restore</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition flex justify-center items-center space-x-2"><span>⬇️</span> <span>Export Backup (JSON)</span></button>
            <button className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg font-medium transition flex justify-center items-center space-x-2"><span>⬆️</span> <span>Import Backup</span></button>
            <button onClick={handleClearLocalData} className="w-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 py-2 rounded-lg font-medium transition flex justify-center items-center space-x-2 mt-4"><span>🗑️</span> <span>Clear Local Data (Danger)</span></button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-xl">💳</span>
          <h2 className="text-lg font-bold">Payment Accounts</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">Select a method to edit details. These appear on your invoices.</p>
        
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div>
            <select value={paymentDetails.method} onChange={handleMethodChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none mb-2">
              <option value="PayPal">PayPal</option><option value="Bank Transfer">Bank Transfer</option><option value="Credit/Debit Card">Credit/Debit Card</option><option value="Zelle">Zelle</option><option value="Wise">Wise</option><option value="Payoneer">Payoneer</option><option value="USDT">USDT</option><option value="Bitcoin">Bitcoin</option><option value="Other">Other</option>
            </select>
          </div>

          {paymentDetails.method === 'PayPal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Email (USD)</label>
              <input type="email" value={paymentDetails.paypalUSD || ''} onChange={(e) => setPaymentDetails({...paymentDetails, paypalUSD: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="your@email.com" />
            </div>
          )}

          {paymentDetails.method === 'Bank Transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Details</label>
              <textarea value={paymentDetails.bankDetails || ''} onChange={(e) => setPaymentDetails({...paymentDetails, bankDetails: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows="3" placeholder="Bank Name, Account Title, Account No / IBAN" />
            </div>
          )}

          {paymentDetails.method === 'Credit/Debit Card' && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input type="text" value={paymentDetails.cardNumber || ''} onChange={(e) => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0000 0000 0000 0000" maxLength="19" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                <input type="text" value={paymentDetails.cardHolder || ''} onChange={(e) => setPaymentDetails({...paymentDetails, cardHolder: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name on card" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="text" value={paymentDetails.cardExpiry || ''} onChange={(e) => setPaymentDetails({...paymentDetails, cardExpiry: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="MM/YY" maxLength="5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input type="password" value={paymentDetails.cardCvv || ''} onChange={(e) => setPaymentDetails({...paymentDetails, cardCvv: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123" maxLength="4" />
                </div>
              </div>
            </div>
          )}

          {paymentDetails.method === 'Zelle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zelle Email or Phone Number</label>
              <input type="text" value={paymentDetails.zelleDetails || ''} onChange={(e) => setPaymentDetails({...paymentDetails, zelleDetails: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Zelle Email or Phone" />
            </div>
          )}

          {paymentDetails.method === 'Wise' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wise Email or Account Details</label>
              <input type="text" value={paymentDetails.wiseDetails || ''} onChange={(e) => setPaymentDetails({...paymentDetails, wiseDetails: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Wise Email or Account Details" />
            </div>
          )}

          {paymentDetails.method === 'Payoneer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payoneer Email or Account Details</label>
              <input type="text" value={paymentDetails.payoneerDetails || ''} onChange={(e) => setPaymentDetails({...paymentDetails, payoneerDetails: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Payoneer Email" />
            </div>
          )}

          {paymentDetails.method === 'USDT' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">USDT (TRC20) Wallet Address</label>
                <input type="text" value={paymentDetails.usdtTrc20 || ''} onChange={(e) => setPaymentDetails({...paymentDetails, usdtTrc20: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter TRC20 Address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">USDT (BEP20) Wallet Address</label>
                <input type="text" value={paymentDetails.usdtBep20 || ''} onChange={(e) => setPaymentDetails({...paymentDetails, usdtBep20: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter BEP20 Address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">USDT (ERC20) Wallet Address</label>
                <input type="text" value={paymentDetails.usdtErc20 || ''} onChange={(e) => setPaymentDetails({...paymentDetails, usdtErc20: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter ERC20 Address" />
              </div>
            </div>
          )}

          {paymentDetails.method === 'Bitcoin' && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitcoin (Mainnet) Wallet Address</label>
              <input type="text" value={paymentDetails.btcAddress || ''} onChange={(e) => setPaymentDetails({...paymentDetails, btcAddress: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter Bitcoin Address" />
            </div>
          )}

          {paymentDetails.method === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Details</label>
              <textarea value={paymentDetails.bankDetails || ''} onChange={(e) => setPaymentDetails({...paymentDetails, bankDetails: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows="2" placeholder="Write your payment instructions here..." />
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">Save Payment Details</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;