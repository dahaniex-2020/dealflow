import React, { useState, useEffect } from 'react';
import { db } from './db/schema'; 
import { Trash2, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    setInvoices(await db.invoices.toArray());
    setClients(await db.clients.toArray());
  };

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this invoice?")) {
      await db.invoices.delete(id);
      loadData();
    }
  };

  // ==========================================
  // PREMIUM PDF GENERATOR FUNCTION
  // ==========================================
  const downloadPDF = async (invoice) => {
    try {
      const client = clients.find(c => c.id === Number(invoice.clientId));
      
      // 1. Company Profile aur Payment Details dono fetch karein
      let company = null;
      let savedPayment = null;
      try {
        company = await db.settings.get('company_profile');
        savedPayment = await db.payment_details.get('main_payment'); 
      } catch (err) {
        console.log("Data not found.");
      }
      
      const doc = new jsPDF();
      
      // Top Blue Bar
      doc.setFillColor(37, 99, 235); 
      doc.rect(0, 0, 210, 8, 'F'); 
      
      // Company Logo & Details
      let yPos = 25;
      if (company && company.logo) {
        try {
          doc.addImage(company.logo, 'PNG', 15, 15, 25, 25); 
          yPos = 50; 
        } catch (imgError) {
          console.log("Logo format issue, skipping logo.");
        }
      }

      doc.setFontSize(24);
      doc.setTextColor(30, 41, 59); 
      doc.setFont("helvetica", "bold");
      doc.text(company?.businessName || "DealFlow", 15, yPos);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(company?.email || "support@dealflow.com", 15, yPos + 7);

      // "INVOICE" Watermark
      doc.setFontSize(30);
      doc.setTextColor(226, 232, 240); 
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 195, 30, { align: "right" });

      // Invoice Details & Billed To
      // Left Column
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235); 
      doc.text("Billed To:", 15, yPos + 30);
      
      doc.setFontSize(11);
      doc.setTextColor(50);
      doc.setFont("helvetica", "bold");
      doc.text(client?.name || 'Unknown Client', 15, yPos + 38);
      
      doc.setFont("helvetica", "normal");
      doc.text(client?.company || 'N/A', 15, yPos + 44);
      doc.text(client?.email || 'N/A', 15, yPos + 50);

      // Right Column
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text("Invoice Details:", 120, yPos + 30);
      
      doc.setFontSize(11);
      doc.setTextColor(50);
      doc.text(`Invoice No:`, 120, yPos + 38);
      doc.text(`Date:`, 120, yPos + 44);
      
      doc.setFont("helvetica", "bold");
      doc.text(`#INV-${invoice.id.toString().padStart(4, '0')}`, 160, yPos + 38);
      doc.text(`${invoice.date}`, 160, yPos + 44);

      // Table
      autoTable(doc, {
        startY: yPos + 65, 
        margin: { left: 15, right: 15 },
        head: [['Description', 'Amount']],
        body: [[invoice.dealTitle || 'Professional Services', `$${Number(invoice.amount).toLocaleString()}`]],
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

      // Total Box
      let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPos + 100;
      
      doc.setFillColor(248, 250, 252); 
      doc.rect(120, finalY, 75, 20, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text("Total:", 125, finalY + 13);
      
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235); 
      doc.setFont("helvetica", "bold");
      doc.text(`$${Number(invoice.amount).toLocaleString()}`, 190, finalY + 13, { align: "right" });

      // ==========================================
      // 👈 NAYA SECTION: PAYMENT METHOD DETAILS
      // ==========================================
      let currentY = finalY + 35; // Total ke thora neechay se shuru karein

      if (savedPayment && invoice.paymentMethod) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(15, currentY, 180, 25, 3, 3, 'FD'); 
        
        doc.setFontSize(9); 
        doc.setTextColor(148, 163, 184); 
        doc.setFont("helvetica", "bold");
        doc.text("PAYMENT DETAILS", 20, currentY + 8);
        
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85); 
        
        let paymentText = `Method: ${invoice.paymentMethod}`;
        
        // Settings se details nikaal kar text mein add karein
        if (invoice.paymentMethod === 'PayPal') paymentText += ` | Account: ${savedPayment.paypalUSD}`;
        if (invoice.paymentMethod === 'Bank Transfer') paymentText += ` | Details: ${savedPayment.bankDetails}`;
        if (invoice.paymentMethod === 'Zelle') paymentText += ` | Details: ${savedPayment.zelleDetails}`;
        if (invoice.paymentMethod === 'Wise') paymentText += ` | Details: ${savedPayment.wiseDetails}`;
        if (invoice.paymentMethod === 'Payoneer') paymentText += ` | Details: ${savedPayment.payoneerDetails}`;
        if (invoice.paymentMethod === 'Credit Card') paymentText += ` | Card: ****${savedPayment.cardNumber?.slice(-4) || ''}`;
        
        // Crypto ke liye
        if (invoice.paymentMethod.includes('USDT')) {
          const network = invoice.paymentMethod.split('(')[1]?.replace(')', '');
          let addr = savedPayment.usdtTrc20;
          if (network === 'BEP20') addr = savedPayment.usdtBep20;
          if (network === 'ERC20') addr = savedPayment.usdtErc20;
          paymentText += ` | Address: ${addr || 'N/A'}`;
        }
        if (invoice.paymentMethod.includes('Bitcoin')) paymentText += ` | Address: ${savedPayment.btcAddress || 'N/A'}`;
        if (invoice.paymentMethod === 'Other') paymentText += ` | Details: ${savedPayment.bankDetails}`;

        const splitText = doc.splitTextToSize(paymentText, 160);
        doc.text(splitText, 20, currentY + 16);
        
        currentY += 35; // Footer iske neechay jayega
      }

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.setFont("helvetica", "italic");
      doc.text("Thank you for your business!", 105, currentY + 10, { align: "center" });

      // Save PDF
      doc.save(`Invoice_${invoice.id}.pdf`);
      
    } catch (error) {
      console.error("PDF Error: ", error);
      alert("Failed to generate PDF. Please check console.");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-2">
        <FileText className="text-blue-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
      </div>

      {/* Desktop Table View */}
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
            {invoices.map(inv => {
              const clientName = clients.find(c => c.id === Number(inv.clientId))?.name || 'Unknown';
              return (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 text-gray-600">#INV-{inv.id.toString().padStart(3, '0')}</td>
                  <td className="p-4 font-medium text-gray-800">{inv.dealTitle || 'Manual'}</td>
                  <td className="p-4 text-gray-600">{clientName}</td>
                  <td className="p-4 font-bold text-gray-800">${inv.amount}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => downloadPDF(inv)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg" title="Download PDF">
                      <Download size={18} />
                    </button>
                    <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {invoices.map(inv => {
          const clientName = clients.find(c => c.id === Number(inv.clientId))?.name || 'Unknown';
          return (
            <div key={inv.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">#INV-{inv.id.toString().padStart(3, '0')}</span>
                <span className="font-bold text-gray-800 text-lg">${inv.amount}</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{inv.dealTitle || 'Manual'}</h3>
                <p className="text-sm text-gray-500">{clientName}</p>
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                <button onClick={() => downloadPDF(inv)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"><Download size={16} /> PDF</button>
                <button onClick={() => handleDelete(inv.id)} className="text-red-500 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              </div>
            </div>
          );
        })}
        {invoices.length === 0 && <p className="text-center text-gray-500 py-4">No invoices found.</p>}
      </div>
    </div>
  );
};
export default Invoices;