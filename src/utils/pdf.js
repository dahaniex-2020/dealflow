import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { db } from '../db/schema';
import { db as firestore } from '../firebase'; 
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ==========================================
// SMART FETCH: Cloud se pehle, phir Local se
// ==========================================
const getSmartProfileAndPayment = async () => {
  let profile = { name: 'Freelancer', email: 'email@example.com', businessName: 'My Business', logo: null };
  let payment = null;

  try {
    const auth = getAuth();
    const user = auth.currentUser;

    // 1. Pehle Cloud (Firebase) se data dhoondein
    if (user) {
      const profileRef = doc(firestore, "settings", user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) profile = profileSnap.data();

      const payRef = doc(firestore, "payment_details", user.uid);
      const paySnap = await getDoc(payRef);
      if (paySnap.exists()) payment = paySnap.data();
    }

    // 2. Agar Cloud mein nahi mila, toh Local se uthayen
    if (!payment) {
      const savedPayment = await db.payment_details.get('main_payment');
      if (savedPayment) {
        const { id, ...rest } = savedPayment;
        payment = rest;
      }
    }
    
    if (!profile || !profile.businessName) {
      const savedProfile = await db.settings.get('company_profile');
      if (savedProfile) {
        const { id, ...rest } = savedProfile;
        profile = { ...profile, ...rest };
      }
    }

  } catch (err) {
    console.log("Error fetching data:", err);
  }

  return { profile, payment };
};

const getSymbol = (curr) => {
  const symbols = { PKR: 'Rs', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', AED: 'AED', SAR: 'SAR', INR: '₹' };
  return symbols[curr] || curr;
};

// ==========================================
// 1. INVOICE PDF GENERATOR
// ==========================================
export const generateInvoice = async (deal, client, amount) => {
  try {
    const { profile, payment } = await getSmartProfileAndPayment();
    
    const doc = new jsPDF();
    const currencySymbol = getSymbol(deal.currency || 'USD');
    
    // 1. PREMIUM HEADER
    if (profile.logo) { 
      try { doc.addImage(profile.logo, 'PNG', 14, 14, 24, 24); } catch (e) {} 
    }

    const headerX = profile.logo ? 44 : 14;
    
    doc.setFontSize(20); 
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(profile.businessName || 'My Business', headerX, 24);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Email: ${profile.email || ''}`, headerX, 30);
    if (profile.name) doc.text(profile.name, headerX, 35);

    doc.setFontSize(28); 
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 196, 24, { align: 'right' });

    const displayId = String(deal.id).substring(0, 6).toUpperCase();
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: INV-${displayId}`, 196, 32, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 37, { align: 'right' });

    doc.setDrawColor(226, 232, 240); 
    doc.setLineWidth(0.5);
    doc.line(14, 55, 196, 55);

    // 2. BILLED TO
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.text("BILLED TO", 14, 65);

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); 
    doc.text(client ? client.name : "Unknown Client", 14, 72);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    let clientY = 77;
    if (client && client.email) { doc.text(client.email, 14, clientY); clientY += 5; }

    // 3. TABLE
    const subTotal = Number(amount);
    const taxPercent = Number(deal.tax) || 0;
    const discountPercent = Number(deal.discount) || 0;
    const taxAmount = (subTotal * taxPercent) / 100;
    const discountAmount = (subTotal * discountPercent) / 100;
    const grandTotal = subTotal + taxAmount - discountAmount;

    const tableRows = [[deal.title, `${currencySymbol} ${subTotal.toFixed(2)}`]];
    if (taxAmount > 0) tableRows.push([`Tax (${taxPercent}%)`, `+ ${currencySymbol} ${taxAmount.toFixed(2)}`]);
    if (discountAmount > 0) tableRows.push([`Discount (${discountPercent}%)`, `- ${currencySymbol} ${discountAmount.toFixed(2)}`]);

    autoTable(doc, { 
      head: [["Description", "Amount"]], 
      body: tableRows, 
      startY: 90, 
      theme: 'plain',
      styles: { cellPadding: 6, fontSize: 10, textColor: [51, 65, 85] },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } }
    });

    // 4. GRAND TOTAL
    const finalY = doc.lastAutoTable.finalY || 120;
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, finalY + 10, 76, 22, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Grand Total", 125, finalY + 18);
    
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); 
    doc.setFont("helvetica", "bold");
    doc.text(`${currencySymbol} ${grandTotal.toFixed(2)}`, 191, finalY + 26, { align: 'right' });

    // 5. PAYMENT DETAILS
    let currentY = finalY + 45;
    let paymentDetailText = '';
    let method = deal.paymentMethod || '';

    if (payment) {
      if (method.includes('PayPal')) paymentDetailText = `PayPal: ${payment.paypalUSD || 'N/A'}`;
      else if (method.includes('Bank Transfer')) paymentDetailText = `Bank: ${payment.bankDetails || 'N/A'}`;
      else if (method.includes('Zelle')) paymentDetailText = `Zelle: ${payment.zelleDetails || 'N/A'}`;
      else if (method.includes('Wise')) paymentDetailText = `Wise: ${payment.wiseDetails || 'N/A'}`;
      else if (method.includes('Payoneer')) paymentDetailText = `Payoneer: ${payment.payoneerDetails || 'N/A'}`;
      else if (method.includes('Credit Card')) paymentDetailText = `Card: ****${payment.cardNumber?.slice(-4) || 'N/A'}`;
      else if (method.includes('USDT')) {
        const network = method.split('(')[1]?.replace(')', '');
        let addr = payment.usdtTrc20;
        if (network === 'BEP20') addr = payment.usdtBep20;
        if (network === 'ERC20') addr = payment.usdtErc20;
        paymentDetailText = `USDT (${network}): ${addr || 'N/A'}`;
      }
      else if (method.includes('Bitcoin')) paymentDetailText = `BTC Address: ${payment.btcAddress || 'N/A'}`;
      else if (method.includes('Other')) paymentDetailText = `Details: ${payment.bankDetails || 'N/A'}`;
    }

    if (paymentDetailText) {
      doc.setDrawColor(226, 232, 240); 
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, currentY, 182, 24, 3, 3, 'FD'); 
      
      doc.setFontSize(9); 
      doc.setTextColor(148, 163, 184); 
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS", 18, currentY + 7);
      
      doc.setFontSize(10); 
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85); 
      const splitText = doc.splitTextToSize(paymentDetailText, 170);
      doc.text(splitText, 18, currentY + 15);
    } else {
      doc.setFillColor(254, 242, 242); 
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(14, currentY, 182, 24, 3, 3, 'FD'); 
      
      doc.setFontSize(9); 
      doc.setTextColor(220, 38, 38); 
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS MISSING", 18, currentY + 7);
      
      doc.setFontSize(9); 
      doc.setFont("helvetica", "normal");
      doc.text("Please go to Settings > Payment Accounts and save details.", 18, currentY + 15);
    }

    // 6. FOOTER
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); 
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your business!", 105, 285, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.text(`Questions? Contact us at ${profile.email || ''}`, 105, 290, { align: 'center' });

    doc.save(`Invoice_${displayId}.pdf`);

  } catch (error) { 
    alert("PDF Error: " + error.message); 
  }
};

// ==========================================
// 2. PROPOSAL PDF GENERATOR
// ==========================================
export const generateProposal = async (clientName, projectTitle, details, amount, currency = 'USD', paymentMethod = '') => {
  try {
    const { profile, payment } = await getSmartProfileAndPayment();
    
    const doc = new jsPDF();
    const currencySymbol = getSymbol(currency);

    doc.setFillColor(37, 99, 235); 
    doc.rect(0, 0, 210, 8, 'F'); 

    let yPos = 25;
    if (profile.logo) { 
      try { doc.addImage(profile.logo, 'PNG', 15, 15, 25, 25); yPos = 50; } catch (e) {} 
    }

    doc.setFontSize(24); 
    doc.setTextColor(30, 41, 59); 
    doc.setFont("helvetica", "bold");
    doc.text(profile.businessName || 'My Business', 15, yPos);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Email: ${profile.email || ''}`, 15, yPos + 7);

    doc.setFontSize(30);
    doc.setTextColor(226, 232, 240); 
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSAL", 195, 30, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235); 
    doc.text("Prepared For:", 15, yPos + 30);
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text(clientName || 'Unknown Client', 15, yPos + 38);

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text("Date:", 120, yPos + 30);
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text(`${new Date().toLocaleDateString()}`, 160, yPos + 30);

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(`Project: ${projectTitle}`, 15, yPos + 55);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); 
    doc.setFont("helvetica", "bold");
    doc.text("PROJECT DETAILS", 15, yPos + 65);

    doc.setFontSize(11); 
    doc.setTextColor(51, 65, 85); 
    doc.setFont("helvetica", "normal");
    const splitDetails = doc.splitTextToSize(details || "No details provided.", 180);
    doc.text(splitDetails, 15, yPos + 72);
    
    let finalY = yPos + 80 + (splitDetails.length * 6);

    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(120, finalY, 76, 22, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Total Budget", 125, finalY + 8);
    
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235); 
    doc.setFont("helvetica", "bold");
    doc.text(`${currencySymbol} ${amount}`, 191, finalY + 17, { align: 'right' });

    let currentY = finalY + 35;
    
    if (paymentMethod) {
      doc.setDrawColor(226, 232, 240); 
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, currentY, 181, 25, 3, 3, 'FD'); 
      
      doc.setFontSize(9); 
      doc.setTextColor(148, 163, 184); 
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT METHOD", 19, currentY + 8);
      
      doc.setFontSize(10); 
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85); 

      let paymentText = `Method: ${paymentMethod}`;

      if (payment) {
        if (paymentMethod.includes('PayPal')) paymentText += ` | Account: ${payment.paypalUSD || 'N/A'}`;
        else if (paymentMethod.includes('Bank Transfer')) paymentText += ` | Details: ${payment.bankDetails || 'N/A'}`;
        else if (paymentMethod.includes('Zelle')) paymentText += ` | Details: ${payment.zelleDetails || 'N/A'}`;
        else if (paymentMethod.includes('Wise')) paymentText += ` | Details: ${payment.wiseDetails || 'N/A'}`;
        else if (paymentMethod.includes('Payoneer')) paymentText += ` | Details: ${payment.payoneerDetails || 'N/A'}`;
        else if (paymentMethod.includes('Credit/Debit Card')) paymentText += ` | Card: ****${payment.cardNumber?.slice(-4) || ''}`;
        else if (paymentMethod.includes('USDT')) {
          const network = paymentMethod.split('(')[1]?.replace(')', '');
          let addr = payment.usdtTrc20;
          if (network === 'BEP20') addr = payment.usdtBep20;
          if (network === 'ERC20') addr = payment.usdtErc20;
          paymentText += ` | Address: ${addr || 'N/A'}`;
        }
        else if (paymentMethod.includes('Bitcoin')) paymentText += ` | Address: ${payment.btcAddress || 'N/A'}`;
        else if (paymentMethod.includes('Other')) paymentText += ` | Details: ${payment.bankDetails || 'N/A'}`;
      }

      const splitText = doc.splitTextToSize(paymentText, 170);
      doc.text(splitText, 19, currentY + 16);
      
      currentY += 35;
    }

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); 
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your time. We look forward to working with you!", 105, currentY + 10, { align: 'center' });

    doc.save(`Proposal_${clientName.replace(/\s+/g, "_")}.pdf`);
    
  } catch (error) { 
    alert("Error: " + error.message); 
  }
};