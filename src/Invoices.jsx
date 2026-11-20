let company = null;
let savedPayment = null;

// 👇 DIRECT CLOUD FETCH (100% PAKKA)
try {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (isProUser && user) {
    // Cloud se Profile uthayen
    const companyRef = doc(firestore, "settings", user.uid);
    const companySnap = await getDoc(companyRef);
    if (companySnap.exists()) {
      company = companySnap.data();
    }

    // Cloud se Payment Details uthayen
    const paymentRef = doc(firestore, "payment_details", user.uid);
    const paymentSnap = await getDoc(paymentRef);
    if (paymentSnap.exists()) {
      savedPayment = paymentSnap.data();
      console.log("PDF ke liye Cloud Payment Data mil gaya:", savedPayment);
    } else {
      console.log("PDF ke liye Cloud Payment Data NAHI mila!");
    }
  } 
  
  // Agar Cloud se nahi mila, toh Local se uthayen (Safety ke liye)
  if (!savedPayment) {
    const localPayment = await db.payment_details.get('main_payment'); 
    if (localPayment) {
      const { id, ...rest } = localPayment;
      savedPayment = rest;
      console.log("PDF ke liye Local Payment Data mil gaya:", savedPayment);
    }
  }
  
  if (!company) {
    const localCompany = await db.settings.get('company_profile');
    if (localCompany) {
      const { id, ...rest } = localCompany;
      company = rest;
    }
  }
} catch (err) {
  console.log("PDF Fetch Error:", err);
}