import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { db } from '../db/schema';

const getProfile = async () => {
  try {
    const saved = await db.settings.get('profile');
    return saved ? saved.value : { name: 'Freelancer', email: 'email@example.com', brand: 'My Business', logo: null };
  } catch {
    return { name: 'Freelancer', email: 'email@example.com', brand: 'My Business', logo: null };
  }
};

const getSymbol = (curr) => {
  const symbols = { PKR: 'Rs', USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$', AED: 'AED', SAR: 'SAR', INR: '₹' };
  return symbols[curr] || curr;
};

export const generateInvoice = async (deal, client, amount) => {
  try {
    const profile = await getProfile();
    const doc = new jsPDF();
    const currencySymbol = getSymbol(deal.currency || 'PKR');
    
    // ==========================================
    // 1. PREMIUM HEADER
    // ==========================================
    // Logo (Top Left)
    if (profile.logo) { 
      try { doc.addImage(profile.logo, 'PNG', 14, 14, 24, 24); } catch (e) {} 
    }

    const headerX = profile.logo ? 44 : 14;
    
    // Company Brand Name
    doc.setFontSize(20); 
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont("helvetica", "bold");
    doc.text(profile.brand || 'My Business', headerX, 24);
    
    // Company Details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Email: ${profile.email || ''}`, headerX, 30);
    if (profile.name) doc.text(profile.name, headerX, 35);

    // "INVOICE" Title (Right Aligned)
    doc.setFontSize(28); 
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 196, 24, { align: 'right' });

    // Invoice Meta
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice No: INV-${deal.id}`, 196, 32, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 37, { align: 'right' });
    if (deal.dueDate) doc.text(`Due Date: ${new Date(deal.dueDate).toLocaleDateString()}`, 196, 42, { align: 'right' });

    // Header Divider
    doc.setDrawColor(226, 232, 240); 
    doc.setLineWidth(0.5);
    doc.line(14, 55, 196, 55);

    // ==========================================
    // 2. BILLED TO
    // ==========================================
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate-400
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
    if (client && client.phone) { doc.text(client.phone, 14, clientY); }

    // ==========================================
    // 3. TABLE (Clean & Modern)
    // ==========================================
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
      styles: { 
        cellPadding: 6, 
        fontSize: 10, 
        textColor: [51, 65, 85], 
        lineColor: [241, 245, 249], 
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [37, 99, 235], 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        1: { halign: 'right' } 
      }
    });

    // ==========================================
    // 4. GRAND TOTAL
    // ==========================================
    const finalY = doc.lastAutoTable.finalY || 120;
    
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(120, finalY + 10, 76, 22, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Grand Total", 125, finalY + 18);
    
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); 
    doc.setFont("helvetica", "bold");
    doc.text(`${currencySymbol} ${grandTotal.toFixed(2)}`, 191, finalY + 26, { align: 'right' });

    // ==========================================
    // 5. PAYMENT DETAILS
    // ==========================================
    let currentY = finalY + 45;
    let paymentDetailText = '';
    
    if (deal.paymentMethod === 'PayPal') {
      const key = `paypal${deal.currency}`;
      if (profile[key]) paymentDetailText = `PayPal (${deal.currency}): ${profile[key]}`;
    } 
    else if (deal.paymentMethod === 'Skrill') {
      const key = `skrill${deal.currency}`;
      if (profile[key]) paymentDetailText = `Skrill (${deal.currency}): ${profile[key]}`;
    } 
    else if (deal.paymentMethod === 'Payoneer') {
      const key = `payoneer${deal.currency}`;
      if (profile[key]) paymentDetailText = `Payoneer (${deal.currency}): ${profile[key]}`;
    } 
    else if (deal.paymentMethod === 'Wise') {
      const key = `wise${deal.currency}`;
      if (profile[key]) paymentDetailText = `Wise (${deal.currency}): ${profile[key]}`;
    } 
    else if (deal.paymentMethod === 'Revolut') {
      const key = `revolut${deal.currency}`;
      if (profile[key]) paymentDetailText = `Revolut (${deal.currency}): ${profile[key]}`;
    } 
    else if (deal.paymentMethod === 'Bank Transfer') {
      const key = `bank${deal.currency}`;
      if (profile[key]) paymentDetailText = `Bank Details (${deal.currency}): ${profile[key]}`;
    } 
    else if (deal.paymentMethod && (deal.paymentMethod.includes('Crypto') || deal.paymentMethod.includes('Bitcoin') || deal.paymentMethod.includes('USDT'))) {
      const cryptoCoin = profile.cryptoType || 'USDT';
      const cryptoAddr = profile.cryptoAddress || '';
      let networkText = cryptoCoin === 'Bitcoin' ? 'Mainnet' : (deal.cryptoNetwork || profile.cryptoNetwork || '');

      if (cryptoAddr) {
        paymentDetailText = `${cryptoCoin} ${networkText ? `(${networkText})` : ''}: ${cryptoAddr}`;
      } else {
        paymentDetailText = `${cryptoCoin} - Address not set in Settings.`;
      }
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
    }

    // ==========================================
    // 6. FOOTER
    // ==========================================
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); 
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your business!", 105, 285, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.text(`Questions? Contact us at ${profile.email || ''}`, 105, 290, { align: 'center' });

    // Save PDF
    const clientName = client?.name ? client.name.replace(/\s+/g, "_") : "Client";
    const fileName = `Invoice_${deal.id || "INV"}_${clientName}.pdf`;
    doc.save(fileName);

  } catch (error) { 
    alert("PDF Error: " + error.message); 
  }
};

export const generateProposal = async (clientName, projectTitle, details, amount, currency = 'USD', paymentMethod = '') => {
  try {
    const profile = await getProfile();
    const doc = new jsPDF();
    const currencySymbol = getSymbol(currency);
    
    // Settings se Payment Details fetch karein
    let savedPayment = null;
    try {
      savedPayment = await db.payment_details.get('main_payment');
    } catch (err) {
      console.log("Payment details not found");
    }

    // ==========================================
    // 1. PREMIUM HEADER
    // ==========================================
    doc.setFillColor(37, 99, 235); 
    doc.rect(0, 0, 210, 8, 'F'); 

    let yPos = 25;
    if (profile.logo) { 
      try { 
        doc.addImage(profile.logo, 'PNG', 15, 15, 25, 25); 
        yPos = 50;
      } catch (e) { console.log("Logo error"); } 
    }

    doc.setFontSize(24); 
    doc.setTextColor(30, 41, 59); 
    doc.setFont("helvetica", "bold");
    doc.text(profile.brand || 'My Business', 15, yPos);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Email: ${profile.email || ''}`, 15, yPos + 7);
    if (profile.name) doc.text(profile.name, 15, yPos + 12);

    doc.setFontSize(30);
    doc.setTextColor(226, 232, 240); 
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSAL", 195, 30, { align: 'right' });

    // ==========================================
    // 2. CLIENT DETAILS & DATE
    // ==========================================
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

    // ==========================================
    // 3. PROJECT DETAILS
    // ==========================================
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
    
    // ==========================================
    // 4. TOTAL BUDGET BOX
    // ==========================================
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

    // ==========================================
    // 5. PAYMENT DETAILS (Naya Section)
    // ==========================================
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

      // Agar Settings mein data save hai, toh uski details bhi add karein
      if (savedPayment) {
        if (paymentMethod === 'PayPal') paymentText += ` | Account: ${savedPayment.paypalUSD || 'N/A'}`;
        if (paymentMethod === 'Bank Transfer') paymentText += ` | Details: ${savedPayment.bankDetails || 'N/A'}`;
        if (paymentMethod === 'Zelle') paymentText += ` | Details: ${savedPayment.zelleDetails || 'N/A'}`;
        if (paymentMethod === 'Wise') paymentText += ` | Details: ${savedPayment.wiseDetails || 'N/A'}`;
        if (paymentMethod === 'Payoneer') paymentText += ` | Details: ${savedPayment.payoneerDetails || 'N/A'}`;
        if (paymentMethod === 'Credit/Debit Card') paymentText += ` | Card: ****${savedPayment.cardNumber?.slice(-4) || ''}`;
        
        if (paymentMethod.includes('USDT')) {
          const network = paymentMethod.split('(')[1]?.replace(')', '');
          let addr = savedPayment.usdtTrc20;
          if (network === 'BEP20') addr = savedPayment.usdtBep20;
          if (network === 'ERC20') addr = savedPayment.usdtErc20;
          paymentText += ` | Address: ${addr || 'N/A'}`;
        }
        if (paymentMethod.includes('Bitcoin')) paymentText += ` | Address: ${savedPayment.btcAddress || 'N/A'}`;
        if (paymentMethod === 'Other') paymentText += ` | Details: ${savedPayment.bankDetails || 'N/A'}`;
      }

      const splitText = doc.splitTextToSize(paymentText, 170);
      doc.text(splitText, 19, currentY + 16);
      
      currentY += 35;
    }

    // ==========================================
    // 6. FOOTER
    // ==========================================
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); 
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your time. We look forward to working with you!", 105, currentY + 10, { align: 'center' });

    const fileName = `Proposal_${clientName.replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
    
  } catch (error) { 
    alert("Error: " + error.message); 
  }
};