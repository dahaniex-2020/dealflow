import { db } from './schema';
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db as firestoreDb } from '../firebase'; 

const isCloudSyncEnabled = () => {
  const isPro = localStorage.getItem('dealflow_is_pro') === 'true';
  const userEmail = localStorage.getItem('dealflow_user_email');
  return isPro && userEmail ? userEmail : null;
};

// ==========================================
// 🟢 CLIENTS QUERIES
// ==========================================
export const getClients = async () => {
  return await db.clients.toArray();
};

export const getClient = async (id) => {
  return await db.clients.get(id);
};

export const addClient = async (clientData) => {
  const localId = await db.clients.add(clientData);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const clientRef = doc(firestoreDb, "users", email, "clients", localId.toString());
      await setDoc(clientRef, { ...clientData, id: localId });
    } catch (error) {
      console.error("Firebase Client Save Error:", error);
    }
  }
  return localId;
};

export const updateClient = async (id, updatedData) => {
  await db.clients.update(id, updatedData);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const clientRef = doc(firestoreDb, "users", email, "clients", id.toString());
      await updateDoc(clientRef, updatedData);
    } catch (error) {
      console.error("Firebase Client Update Error:", error);
    }
  }
};

export const deleteClient = async (id) => {
  await db.clients.delete(id);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const clientRef = doc(firestoreDb, "users", email, "clients", id.toString());
      await deleteDoc(clientRef);
    } catch (error) {
      console.error("Firebase Client Delete Error:", error);
    }
  }
};

// ==========================================
// 🟢 DEALS QUERIES
// ==========================================
export const getDeals = async () => {
  return await db.deals.toArray();
};

export const addDeal = async (dealData) => {
  const localId = await db.deals.add(dealData);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const dealRef = doc(firestoreDb, "users", email, "deals", localId.toString());
      await setDoc(dealRef, { ...dealData, id: localId });
    } catch (error) {
      console.error("Firebase Deal Save Error:", error);
    }
  }
  return localId;
};

export const updateDeal = async (id, updatedData) => {
  await db.deals.update(id, updatedData);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const dealRef = doc(firestoreDb, "users", email, "deals", id.toString());
      await updateDoc(dealRef, updatedData);
    } catch (error) {
      console.error("Firebase Deal Update Error:", error);
    }
  }
};

export const deleteDeal = async (id) => {
  await db.deals.delete(id);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const dealRef = doc(firestoreDb, "users", email, "deals", id.toString());
      await deleteDoc(dealRef);
    } catch (error) {
      console.error("Firebase Deal Delete Error:", error);
    }
  }
};

// ==========================================
// 🟢 EXPENSES QUERIES
// ==========================================
export const getExpenses = async () => {
  return await db.expenses.toArray();
};

export const addExpense = async (expenseData) => {
  const localId = await db.expenses.add(expenseData);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const expRef = doc(firestoreDb, "users", email, "expenses", localId.toString());
      await setDoc(expRef, { ...expenseData, id: localId });
    } catch (error) {
      console.error("Firebase Expense Save Error:", error);
    }
  }
  return localId;
};

export const deleteExpense = async (id) => {
  await db.expenses.delete(id);
  const email = isCloudSyncEnabled();
  if (email) {
    try {
      const expRef = doc(firestoreDb, "users", email, "expenses", id.toString());
      await deleteDoc(expRef);
    } catch (error) {
      console.error("Firebase Expense Delete Error:", error);
    }
  }
};

// ==========================================
// 🌟 CLOUD SYNC FUNCTION
// ==========================================
export const syncCloudDataToLocal = async () => {
  const email = isCloudSyncEnabled();
  if (!email) return; 

  try {
    console.log("Fetching data from Firebase...");

    const clientsRef = collection(firestoreDb, "users", email, "clients");
    const clientsSnap = await getDocs(clientsRef);
    const cloudClients = clientsSnap.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) }));
    await db.clients.clear();
    await db.clients.bulkAdd(cloudClients);

    const dealsRef = collection(firestoreDb, "users", email, "deals");
    const dealsSnap = await getDocs(dealsRef);
    const cloudDeals = dealsSnap.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) }));
    await db.deals.clear();
    await db.deals.bulkAdd(cloudDeals);

    const expensesRef = collection(firestoreDb, "users", email, "expenses");
    const expensesSnap = await getDocs(expensesRef);
    const cloudExpenses = expensesSnap.docs.map(doc => ({ ...doc.data(), id: Number(doc.id) }));
    await db.expenses.clear();
    await db.expenses.bulkAdd(cloudExpenses);

    console.log("Cloud Sync Complete!");
    return true;

  } catch (error) {
    console.error("Cloud Sync Error:", error);
    return false;
  }
};