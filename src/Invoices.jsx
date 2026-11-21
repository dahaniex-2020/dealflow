import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from './db/schema';
import { Trash2, FileText, Download, Search, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db as firestore } from './firebase';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
  getDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const Invoices = () => {
  const { isProUser } = useOutletContext();

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    let unsubscribeInvoices;
    let unsubscribeClients;

    const initData = async () => {
      if (isProUser) {
        const qClients = query(
          collection(firestore, "clients"),
          where("userId", "==", user.uid)
        );

        unsubscribeClients = onSnapshot(qClients, (snapshot) => {
          setClients(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })));
        });

        const qInvoices = query(
          collection(firestore, "invoices"),
          where("userId", "==", user.uid)
        );

        const invSnapshot = await getDocs(qInvoices);

        if (invSnapshot.empty) {
          setIsMigrating(true);

          const localInvoices = await db.invoices.toArray();

          if (localInvoices.length > 0) {
            for (const item of localInvoices) {
              await addDoc(collection(firestore, "invoices"), {
                ...item,
                userId: user.uid,
                createdAt: new Date().toISOString()
              });
            }

            await db.invoices.clear();
          }

          setIsMigrating(false);
        }

        unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
          setInvoices(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })));
        });

      } else {
        loadLocalData();
      }
    };

    initData();

    return () => {
      if (unsubscribeInvoices) unsubscribeInvoices();
      if (unsubscribeClients) unsubscribeClients();
    };
  }, [isProUser]);

  const loadLocalData = async () => {
    setInvoices(await db.invoices.toArray());
    setClients(await db.clients.toArray());
  };

  // ========== SEARCH FILTER ==========
  const filteredInvoices = invoices.filter((inv) => {
    const clientName =
      clients.find(c => String(c.id) === String(inv.clientId))?.name || '';

    const displayId = String(inv.id).substring(0, 6).toUpperCase();
    const search = searchTerm.trim().toLowerCase();

    return (
      String(inv.id).toLowerCase().includes(search) ||
      displayId.toLowerCase().includes(search) ||
      String(inv.dealTitle || '').toLowerCase().includes(search) ||
      clientName.toLowerCase().includes(search) ||
      String(inv.amount || '').toLowerCase().includes(search)
    );
  });
  // =================================

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        if (isProUser) {
          await deleteDoc(doc(firestore, "invoices", id));
        } else {
          await db.invoices.delete(id);
          loadLocalData();
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const downloadPDF = async (invoice) => {
    try {
      const client = clients.find(
        c => String(c.id) === String(invoice.clientId)
      );

      let company = null;
      let savedPayment = null;

      // FETCH PROFILE AND PAYMENT FROM FIREBASE
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          const companyRef = doc(firestore, "settings", user.uid);
          const companySnap = await getDoc(companyRef);

          if (companySnap.exists()) {
            company = companySnap.data();
          }

          const paymentRef = doc(firestore, "payment_details", user.uid);
          const paymentSnap = await getDoc(paymentRef);

          if (paymentSnap.exists()) {
            savedPayment = paymentSnap.data();
          }
        }
      } catch (err) {
        console.log("Firebase fetch error:", err);
      }

      const docPDF = new jsPDF();

      // Blue top bar
      docPDF.setFillColor(37, 99, 235);
      docPDF.rect(0, 0, 210, 8, 'F');

      let yPos = 25;

      if (company?.logo) {
        try {
          docPDF.addImage(company.logo, 'PNG', 15, 15, 25, 25);
          yPos = 50;
        } catch (e) {
          try {
            docPDF.addImage(company.logo, 'JPEG', 15, 15, 25, 25);
            yPos = 50;
          } catch (err) {}
        }
      }

      // Company Name
      docPDF.setFontSize(24);
      docPDF.setTextColor(30, 41, 59);
      docPDF.setFont("helvetica", "bold");
      docPDF.text(company?.businessName || "DealFlow", 15, yPos);

      docPDF.setFontSize(10);
      docPDF.setTextColor(100);
      docPDF.setFont("helvetica", "normal");
      docPDF.text(company?.email || "support@dealflow.com", 15, yPos + 7);

      // INVOICE title
      docPDF.setFontSize(30);
      docPDF.setTextColor(226, 232, 240);
      docPDF.setFont("helvetica", "bold");
      docPDF.text("INVOICE", 195, 30, { align: "right" });

      // Billed To
      docPDF.setFontSize(12);
      docPDF.setTextColor(37, 99, 235);
      docPDF.text("Billed To:", 15, yPos + 30);

      docPDF.setFontSize(11);
      docPDF.setTextColor(50);
      docPDF.setFont("helvetica", "bold");
      docPDF.text(client?.name || 'Unknown Client', 15, yPos + 38);

      docPDF.setFont("helvetica", "normal");
      docPDF.text(client?.company || 'N/A', 15, yPos + 44);
      docPDF.text(client?.email || 'N/A', 15, yPos + 50);

      // Invoice Details
      docPDF.setFontSize(12);
      docPDF.setTextColor(37, 99, 235);
      docPDF.text("Invoice Details:", 120, yPos + 30);

      docPDF.setFontSize(11);
      docPDF.setTextColor(50);
      docPDF.text(`Invoice No:`, 120, yPos + 38);
      docPDF.text(`Date:`, 120, yPos + 44);

      docPDF.setFont("helvetica", "bold");
      const displayId = String(invoice.id).substring(0, 6).toUpperCase();
      docPDF.text(`#INV-${displayId}`, 160, yPos + 38);
      docPDF.text(
        `${invoice.date || new Date().toLocaleDateString()}`,
        160,
        yPos + 44
      );

      // Table
      autoTable(docPDF, {
        startY: yPos + 65,
        margin: { left: 15, right: 15 },
        head: [['Description', 'Amount']],
        body: [[
          invoice.dealTitle || 'Professional Services',
          `$${Number(invoice.amount).toLocaleString()}`
        ]],
        theme: 'plain',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontSize: 12,
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          1: { halign: 'right' }
        },
        styles: {
          fontSize: 11,
          cellPadding: 6,
          textColor: [50, 50, 50]
        },
      });

      let finalY = docPDF.lastAutoTable
        ? docPDF.lastAutoTable.finalY + 15
        : yPos + 100;

      // Total Box
      docPDF.setFillColor(248, 250, 252);
      docPDF.rect(120, finalY, 75, 20, 'F');

      docPDF.setFontSize(12);
      docPDF.setTextColor(100);
      docPDF.text("Total:", 125, finalY + 13);

      docPDF.setFontSize(14);
      docPDF.setTextColor(37, 99, 235);
      docPDF.setFont("helvetica", "bold");
      docPDF.text(
        `$${Number(invoice.amount).toLocaleString()}`,
        190,
        finalY + 13,
        { align: "right" }
      );

      let currentY = finalY + 35;

      // PAYMENT DETAILS
      const method = invoice.paymentMethod || '';

      docPDF.setFillColor(255, 255, 255);
      docPDF.setDrawColor(226, 232, 240);
      docPDF.roundedRect(15, currentY, 180, 34, 3, 3, 'FD');

      docPDF.setFontSize(9);
      docPDF.setTextColor(148, 163, 184);
      docPDF.setFont("helvetica", "bold");
      docPDF.text("PAYMENT DETAILS", 20, currentY + 8);

      docPDF.setFontSize(10);
      docPDF.setFont("helvetica", "normal");
      docPDF.setTextColor(51, 65, 85);

      let paymentText = method
        ? `Method: ${method}`
        : 'Method: Not specified on this invoice';

      if (savedPayment) {
        const m = (method || '').toLowerCase();

        if (m.includes('paypal')) {
          paymentText += `\nAccount: ${savedPayment.paypalUSD || savedPayment.paypal || 'N/A'}`;
        } else if (m.includes('bank')) {
          paymentText += `\nDetails: ${savedPayment.bankDetails || 'N/A'}`;
        } else if (m.includes('zelle')) {
          paymentText += `\nDetails: ${savedPayment.zelleDetails || 'N/A'}`;
        } else if (m.includes('wise')) {
          paymentText += `\nDetails: ${savedPayment.wiseDetails || 'N/A'}`;
        } else if (m.includes('payoneer')) {
          paymentText += `\nDetails: ${savedPayment.payoneerDetails || 'N/A'}`;
        } else if (m.includes('card') || m.includes('credit') || m.includes('debit')) {
          paymentText += `\nCard: ****${savedPayment.cardNumber?.slice(-4) || 'N/A'}`;
        } else if (m.includes('usdt')) {
          let network = 'TRC20';
          let addr = savedPayment.usdtTrc20;

          if (m.includes('bep20')) {
            network = 'BEP20';
            addr = savedPayment.usdtBep20;
          }

          if (m.includes('erc20')) {
            network = 'ERC20';
            addr = savedPayment.usdtErc20;
          }

          paymentText += `\nAddress (${network}): ${addr || 'N/A'}`;
        } else if (m.includes('bitcoin') || m.includes('btc')) {
          paymentText += `\nAddress: ${savedPayment.btcAddress || 'N/A'}`;
        } else {
          if (savedPayment.paypalUSD) {
            paymentText += `\nPayPal: ${savedPayment.paypalUSD}`;
          } else if (savedPayment.bankDetails) {
            paymentText += `\nBank: ${savedPayment.bankDetails}`;
          } else if (savedPayment.zelleDetails) {
            paymentText += `\nZelle: ${savedPayment.zelleDetails}`;
          } else {
            paymentText += `\n(Details available in settings)`;
          }
        }
      } else {
        paymentText += `\n(No payment account found in Firebase)`;
      }

      const splitText = docPDF.splitTextToSize(paymentText, 160);
      docPDF.text(splitText, 20, currentY + 16);

      currentY += 45;

      // Footer
      docPDF.setFontSize(10);
      docPDF.setTextColor(150);
      docPDF.setFont("helvetica", "italic");
      docPDF.text(
        "Thank you for your business!",
        105,
        currentY + 5,
        { align: "center" }
      );

      docPDF.save(`Invoice_${displayId}.pdf`);

    } catch (error) {
      console.error("PDF Error: ", error);
      alert("Failed to generate PDF. Please check console.");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        </div>

        {isProUser ? (
          <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            ☁️ Cloud Sync
          </span>
        ) : (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
            💾 Local
          </span>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search invoice, deal, client or amount..."
          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
        />

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            title="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* SEARCH RESULT COUNT */}
      {searchTerm && (
        <p className="text-sm text-gray-500">
          {filteredInvoices.length} invoice(s) found
        </p>
      )}

      {isMigrating && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm font-medium animate-pulse">
          Syncing your local invoices to the cloud. Please wait...
        </div>
      )}

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-medium text-gray-600">Invoice ID</th>
              <th className="p-4 font-medium text-gray-600">Description</th>
              <th className="p-4 font-medium text-gray-600">Client</th>
              <th className="p-4 font-medium text-gray-600">Amount</th>
              <th className="p-4 font-medium text-gray-600 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredInvoices.map(inv => {
              const clientName =
                clients.find(c => String(c.id) === String(inv.clientId))?.name || 'Unknown';

              const displayId = String(inv.id).substring(0, 6).toUpperCase();

              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-gray-600 font-mono text-sm">
                    #INV-{displayId}
                  </td>

                  <td className="p-4 font-medium text-gray-800">
                    {inv.dealTitle || 'Manual'}
                  </td>

                  <td className="p-4 text-gray-600">
                    {clientName}
                  </td>

                  <td className="p-4 font-bold text-gray-800">
                    ${inv.amount}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => downloadPDF(inv)}
                        className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg"
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  {searchTerm
                    ? 'No invoices match your search.'
                    : 'No invoices found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.map(inv => {
          const clientName =
            clients.find(c => String(c.id) === String(inv.clientId))?.name || 'Unknown';

          const displayId = String(inv.id).substring(0, 6).toUpperCase();

          return (
            <div
              key={inv.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-mono">
                  #INV-{displayId}
                </span>

                <span className="font-bold text-gray-800 text-lg">
                  ${inv.amount}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-800">
                  {inv.dealTitle || 'Manual'}
                </h3>
                <p className="text-sm text-gray-500">
                  {clientName}
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                <button
                  onClick={() => downloadPDF(inv)}
                  className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                >
                  <Download size={16} /> PDF
                </button>

                <button
                  onClick={() => handleDelete(inv.id)}
                  className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            {searchTerm
              ? 'No invoices match your search.'
              : 'No invoices found.'}
          </p>
        )}
      </div>

    </div>
  );
};

export default Invoices;